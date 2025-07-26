-- Drop and recreate functions with proper GROUP BY fixes and populate stock summary

-- 1. Drop existing functions that have return type changes
DROP FUNCTION IF EXISTS public.dkegl_get_inventory_analytics(uuid);
DROP FUNCTION IF EXISTS public.dkegl_get_pricing_intelligence(uuid);
DROP FUNCTION IF EXISTS public.dkegl_get_predictive_insights(uuid);

-- 2. Recreate dkegl_get_inventory_analytics with fixed GROUP BY
CREATE OR REPLACE FUNCTION public.dkegl_get_inventory_analytics(_org_id uuid)
 RETURNS TABLE(item_code text, item_name text, category_name text, current_stock numeric, stock_value numeric, turnover_ratio numeric, stock_status text, reorder_recommendation text, last_movement_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH stock_with_turnover AS (
    SELECT 
      s.item_code,
      im.item_name,
      c.category_name,
      s.current_qty,
      s.current_qty * COALESCE(s.unit_cost, 0) as stock_value,
      s.last_transaction_date,
      im.reorder_level,
      -- Calculate annual turnover ratio properly
      CASE 
        WHEN s.current_qty > 0 AND COALESCE(annual_issues.total_annual_issues, 0) > 0 
        THEN COALESCE(annual_issues.total_annual_issues, 0) / s.current_qty
        ELSE 0 
      END as annual_turnover_ratio
    FROM dkegl_stock s
    LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
    LEFT JOIN dkegl_categories c ON im.category_id = c.id
    LEFT JOIN (
      SELECT 
        il.item_code,
        SUM(il.qty_issued) as total_annual_issues
      FROM dkegl_issue_log il
      WHERE il.organization_id = _org_id
        AND il.date >= CURRENT_DATE - INTERVAL '365 days'
      GROUP BY il.item_code
    ) annual_issues ON s.item_code = annual_issues.item_code
    WHERE s.organization_id = _org_id
  )
  SELECT 
    swt.item_code,
    swt.item_name,
    swt.category_name,
    swt.current_qty,
    swt.stock_value,
    swt.annual_turnover_ratio,
    CASE 
      WHEN swt.current_qty = 0 THEN 'Out of Stock'
      WHEN swt.current_qty <= COALESCE(swt.reorder_level, 0) THEN 'Low Stock'
      WHEN swt.annual_turnover_ratio < 1 THEN 'Slow Moving'
      WHEN swt.annual_turnover_ratio > 6 THEN 'Fast Moving'
      ELSE 'Normal'
    END as stock_status,
    CASE 
      WHEN swt.current_qty <= COALESCE(swt.reorder_level, 0) THEN 'Reorder Required'
      WHEN swt.annual_turnover_ratio < 0.5 THEN 'Review Demand'
      ELSE 'No Action'
    END as reorder_recommendation,
    swt.last_transaction_date
  FROM stock_with_turnover swt
  ORDER BY swt.stock_value DESC;
END;
$function$;

-- 3. Recreate dkegl_get_pricing_intelligence with fixed GROUP BY
CREATE OR REPLACE FUNCTION public.dkegl_get_pricing_intelligence(_org_id uuid)
 RETURNS TABLE(item_code text, item_name text, standard_cost numeric, current_market_price numeric, variance_percentage numeric, price_trend text, last_grn_price numeric, recommendation text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH pricing_analysis AS (
    SELECT 
      pm.item_code,
      im.item_name,
      pm.standard_cost,
      recent_grn.avg_recent_price as current_market_price,
      recent_grn.latest_price as last_grn_price,
      -- Calculate variance percentage properly
      CASE 
        WHEN pm.standard_cost > 0 AND recent_grn.avg_recent_price > 0
        THEN ABS((recent_grn.avg_recent_price - pm.standard_cost) / pm.standard_cost * 100)
        ELSE 0 
      END as variance_pct,
      -- Calculate price trend
      CASE 
        WHEN recent_grn.avg_recent_price > older_grn.avg_older_price * 1.05 THEN 'Increasing'
        WHEN recent_grn.avg_recent_price < older_grn.avg_older_price * 0.95 THEN 'Decreasing'
        ELSE 'Stable'
      END as trend
    FROM dkegl_pricing_master pm
    LEFT JOIN dkegl_item_master im ON pm.organization_id = im.organization_id AND pm.item_code = im.item_code
    LEFT JOIN (
      SELECT 
        g.item_code,
        AVG(CASE WHEN g.qty_received > 0 THEN g.total_amount / g.qty_received ELSE 0 END) as avg_recent_price,
        MAX(CASE WHEN g.qty_received > 0 THEN g.total_amount / g.qty_received ELSE 0 END) as latest_price
      FROM dkegl_grn_log g
      WHERE g.organization_id = _org_id
        AND g.date >= CURRENT_DATE - INTERVAL '90 days'
        AND g.qty_received > 0
        AND g.total_amount > 0
      GROUP BY g.item_code
    ) recent_grn ON pm.item_code = recent_grn.item_code
    LEFT JOIN (
      SELECT 
        g.item_code,
        AVG(CASE WHEN g.qty_received > 0 THEN g.total_amount / g.qty_received ELSE 0 END) as avg_older_price
      FROM dkegl_grn_log g
      WHERE g.organization_id = _org_id
        AND g.date >= CURRENT_DATE - INTERVAL '180 days'
        AND g.date < CURRENT_DATE - INTERVAL '90 days'
        AND g.qty_received > 0
        AND g.total_amount > 0
      GROUP BY g.item_code
    ) older_grn ON pm.item_code = older_grn.item_code
    WHERE pm.organization_id = _org_id
      AND pm.is_active = true
  )
  SELECT 
    pa.item_code,
    pa.item_name,
    pa.standard_cost,
    pa.current_market_price,
    pa.variance_pct,
    pa.trend,
    pa.last_grn_price,
    CASE 
      WHEN pa.variance_pct > 20 THEN 'Review Pricing Master'
      WHEN pa.trend = 'Increasing' AND pa.variance_pct > 10 THEN 'Consider Price Update'
      WHEN pa.trend = 'Decreasing' AND pa.variance_pct > 15 THEN 'Negotiate Better Rates'
      ELSE 'Monitor'
    END as recommendation
  FROM pricing_analysis pa
  WHERE pa.current_market_price IS NOT NULL
  ORDER BY pa.variance_pct DESC;
END;
$function$;

-- 4. Recreate dkegl_get_predictive_insights with fixed GROUP BY
CREATE OR REPLACE FUNCTION public.dkegl_get_predictive_insights(_org_id uuid)
 RETURNS TABLE(item_code text, item_name text, predicted_demand_next_month numeric, confidence_level text, recommended_stock_level numeric, stockout_risk text, optimal_order_quantity numeric, lead_time_buffer numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH demand_analysis AS (
    SELECT 
      il.item_code,
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
      SELECT DISTINCT item_code FROM dkegl_issue_log WHERE organization_id = _org_id
    ) il
    LEFT JOIN dkegl_item_master im ON im.organization_id = _org_id AND im.item_code = il.item_code
    LEFT JOIN dkegl_stock s ON s.organization_id = _org_id AND s.item_code = il.item_code
    LEFT JOIN (
      SELECT 
        issue_data.item_code,
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
    ) monthly_demand ON il.item_code = monthly_demand.item_code
    WHERE monthly_demand.avg_monthly_demand IS NOT NULL
  )
  SELECT 
    da.item_code,
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

-- 5. Create procedure to populate stock summary table
CREATE OR REPLACE FUNCTION public.dkegl_populate_stock_summary(_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  records_processed INTEGER := 0;
  result jsonb;
BEGIN
  -- Clear existing summary data for organization
  DELETE FROM dkegl_stock_summary WHERE organization_id = _org_id;
  
  -- Insert comprehensive stock summary data
  INSERT INTO dkegl_stock_summary (
    organization_id,
    item_code,
    item_name,
    category_name,
    opening_qty,
    total_grn_qty,
    total_issued_qty,
    current_qty,
    calculated_qty,
    variance_qty,
    issue_7d,
    issue_30d,
    issue_90d,
    consumption_rate_7d,
    consumption_rate_30d,
    consumption_rate_90d,
    days_of_cover,
    reorder_level,
    reorder_suggested,
    last_transaction_date
  )
  SELECT 
    _org_id,
    s.item_code,
    im.item_name,
    c.category_name,
    s.opening_qty,
    COALESCE(grn_totals.total_grn, 0) as total_grn_qty,
    COALESCE(issue_totals.total_issued, 0) as total_issued_qty,
    s.current_qty,
    s.opening_qty + COALESCE(grn_totals.total_grn, 0) - COALESCE(issue_totals.total_issued, 0) as calculated_qty,
    s.current_qty - (s.opening_qty + COALESCE(grn_totals.total_grn, 0) - COALESCE(issue_totals.total_issued, 0)) as variance_qty,
    COALESCE(issue_7d.qty_7d, 0) as issue_7d,
    COALESCE(issue_30d.qty_30d, 0) as issue_30d,
    COALESCE(issue_90d.qty_90d, 0) as issue_90d,
    CASE WHEN issue_7d.qty_7d > 0 THEN issue_7d.qty_7d / 7.0 ELSE 0 END as consumption_rate_7d,
    CASE WHEN issue_30d.qty_30d > 0 THEN issue_30d.qty_30d / 30.0 ELSE 0 END as consumption_rate_30d,
    CASE WHEN issue_90d.qty_90d > 0 THEN issue_90d.qty_90d / 90.0 ELSE 0 END as consumption_rate_90d,
    CASE 
      WHEN issue_30d.qty_30d > 0 THEN s.current_qty / (issue_30d.qty_30d / 30.0)
      ELSE 999 
    END as days_of_cover,
    im.reorder_level,
    CASE WHEN s.current_qty <= COALESCE(im.reorder_level, 0) AND im.reorder_level > 0 THEN true ELSE false END as reorder_suggested,
    GREATEST(s.last_transaction_date, COALESCE(grn_totals.last_grn_date, s.last_transaction_date), COALESCE(issue_totals.last_issue_date, s.last_transaction_date)) as last_transaction_date
  FROM dkegl_stock s
  LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
  LEFT JOIN dkegl_categories c ON im.category_id = c.id
  -- GRN totals
  LEFT JOIN (
    SELECT 
      item_code,
      SUM(qty_received) as total_grn,
      MAX(date) as last_grn_date
    FROM dkegl_grn_log 
    WHERE organization_id = _org_id
    GROUP BY item_code
  ) grn_totals ON s.item_code = grn_totals.item_code
  -- Issue totals
  LEFT JOIN (
    SELECT 
      item_code,
      SUM(qty_issued) as total_issued,
      MAX(date) as last_issue_date
    FROM dkegl_issue_log 
    WHERE organization_id = _org_id
    GROUP BY item_code
  ) issue_totals ON s.item_code = issue_totals.item_code
  -- 7-day issues
  LEFT JOIN (
    SELECT 
      item_code,
      SUM(qty_issued) as qty_7d
    FROM dkegl_issue_log 
    WHERE organization_id = _org_id 
      AND date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY item_code
  ) issue_7d ON s.item_code = issue_7d.item_code
  -- 30-day issues  
  LEFT JOIN (
    SELECT 
      item_code,
      SUM(qty_issued) as qty_30d
    FROM dkegl_issue_log 
    WHERE organization_id = _org_id 
      AND date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY item_code
  ) issue_30d ON s.item_code = issue_30d.item_code
  -- 90-day issues
  LEFT JOIN (
    SELECT 
      item_code,
      SUM(qty_issued) as qty_90d
    FROM dkegl_issue_log 
    WHERE organization_id = _org_id 
      AND date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY item_code
  ) issue_90d ON s.item_code = issue_90d.item_code
  WHERE s.organization_id = _org_id;
  
  GET DIAGNOSTICS records_processed = ROW_COUNT;
  
  result := jsonb_build_object(
    'success', true,
    'records_processed', records_processed,
    'organization_id', _org_id,
    'processed_at', now()
  );
  
  RETURN result;
END;
$function$;