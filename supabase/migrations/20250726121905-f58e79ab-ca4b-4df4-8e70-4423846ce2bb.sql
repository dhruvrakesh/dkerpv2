-- Fix column ambiguity in dkegl_get_predictive_insights
CREATE OR REPLACE FUNCTION public.dkegl_get_predictive_insights(_org_id uuid)
 RETURNS TABLE(item_code text, item_name text, predicted_demand_next_month numeric, confidence_level text, recommended_stock_level numeric, stockout_risk text, optimal_order_quantity numeric, lead_time_buffer numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH demand_analysis AS (
    SELECT 
      il.item_code as il_item_code,
      im.item_name,
      im.lead_time_days,
      s.current_qty,
      im.reorder_level,
      -- Calculate monthly demand properly
      monthly_demand.avg_monthly_demand,
      monthly_demand.demand_variance,
      -- Calculate confidence based on data points
      CASE 
        WHEN monthly_demand.data_points >= 6 THEN 'High'
        WHEN monthly_demand.data_points >= 3 THEN 'Medium'
        ELSE 'Low'
      END as confidence
    FROM (
      SELECT DISTINCT issue_log_item_code as item_code 
      FROM (SELECT item_code as issue_log_item_code FROM dkegl_issue_log WHERE organization_id = _org_id) subq
    ) il
    LEFT JOIN dkegl_item_master im ON im.organization_id = _org_id AND im.item_code = il.item_code
    LEFT JOIN dkegl_stock s ON s.organization_id = _org_id AND s.item_code = il.item_code
    LEFT JOIN (
      SELECT 
        issue_data.item_code as monthly_item_code,
        AVG(issue_data.monthly_qty) as avg_monthly_demand,
        STDDEV(issue_data.monthly_qty) as demand_variance,
        COUNT(*) as data_points
      FROM (
        SELECT 
          i.item_code,
          DATE_TRUNC('month', i.date) as month,
          SUM(i.qty_issued) as monthly_qty
        FROM dkegl_issue_log i
        WHERE i.organization_id = _org_id
          AND i.date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY i.item_code, DATE_TRUNC('month', i.date)
      ) issue_data
      GROUP BY issue_data.item_code
    ) monthly_demand ON il.item_code = monthly_demand.monthly_item_code
    WHERE monthly_demand.avg_monthly_demand IS NOT NULL
  )
  SELECT 
    da.il_item_code,
    da.item_name,
    -- Predicted demand (simple trend + seasonality factor)
    COALESCE(da.avg_monthly_demand * 1.1, 0) as predicted_demand,
    da.confidence,
    -- Recommended stock level (demand + safety stock)
    COALESCE(da.avg_monthly_demand * 1.5, da.reorder_level) as recommended_stock,
    -- Stockout risk assessment
    CASE 
      WHEN da.current_qty <= 0 THEN 'Critical'
      WHEN da.current_qty < da.avg_monthly_demand * 0.5 THEN 'High'
      WHEN da.current_qty < da.avg_monthly_demand THEN 'Medium'
      ELSE 'Low'
    END as stockout_risk,
    -- Optimal order quantity (EOQ approximation)
    COALESCE(da.avg_monthly_demand * 2, 100) as optimal_order_qty,
    -- Lead time buffer
    COALESCE(da.avg_monthly_demand * (da.lead_time_days / 30.0), 0) as lead_time_buffer
  FROM demand_analysis da
  WHERE da.avg_monthly_demand > 0
  ORDER BY da.avg_monthly_demand DESC;
END;
$function$;