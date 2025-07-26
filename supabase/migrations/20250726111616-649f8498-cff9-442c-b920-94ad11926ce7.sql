-- Create comprehensive analytics functions for AI intelligence

-- Enhanced inventory analytics function
CREATE OR REPLACE FUNCTION public.dkegl_get_inventory_analytics(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}';
  total_value numeric := 0;
  dead_stock_value numeric := 0;
  fast_movers jsonb;
  slow_movers jsonb;
  reorder_alerts jsonb;
  abc_analysis jsonb;
BEGIN
  -- Calculate total inventory value
  SELECT COALESCE(SUM(current_qty * COALESCE(unit_cost, 0)), 0)
  INTO total_value
  FROM dkegl_stock
  WHERE organization_id = _org_id AND current_qty > 0;
  
  -- Calculate dead stock (no movement >90 days)
  SELECT COALESCE(SUM(current_qty * COALESCE(unit_cost, 0)), 0)
  INTO dead_stock_value
  FROM dkegl_stock s
  WHERE organization_id = _org_id 
    AND current_qty > 0
    AND (last_transaction_date IS NULL OR last_transaction_date < CURRENT_DATE - INTERVAL '90 days');
  
  -- Get fast movers (high consumption last 30 days)
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', i.item_code,
      'total_issued', SUM(i.qty_issued),
      'current_stock', COALESCE(s.current_qty, 0),
      'days_of_cover', CASE WHEN SUM(i.qty_issued) > 0 
                       THEN COALESCE(s.current_qty, 0) / (SUM(i.qty_issued) / 30.0)
                       ELSE 999 END
    )
  )
  INTO fast_movers
  FROM dkegl_issue_log i
  LEFT JOIN dkegl_stock s ON i.organization_id = s.organization_id AND i.item_code = s.item_code
  WHERE i.organization_id = _org_id 
    AND i.date >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY i.item_code, s.current_qty
  HAVING SUM(i.qty_issued) > 0
  ORDER BY SUM(i.qty_issued) DESC
  LIMIT 10;
  
  -- Get slow movers (low/no consumption but high stock)
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', s.item_code,
      'current_qty', s.current_qty,
      'last_movement', s.last_transaction_date,
      'days_since_movement', COALESCE(EXTRACT(DAY FROM CURRENT_DATE - s.last_transaction_date), 999),
      'estimated_value', s.current_qty * COALESCE(s.unit_cost, 0)
    )
  )
  INTO slow_movers
  FROM dkegl_stock s
  WHERE s.organization_id = _org_id 
    AND s.current_qty > 0
    AND (s.last_transaction_date IS NULL OR s.last_transaction_date < CURRENT_DATE - INTERVAL '60 days')
  ORDER BY s.current_qty * COALESCE(s.unit_cost, 0) DESC
  LIMIT 10;
  
  -- Get reorder alerts
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', im.item_code,
      'item_name', im.item_name,
      'current_qty', COALESCE(s.current_qty, 0),
      'reorder_level', im.reorder_level,
      'shortage', im.reorder_level - COALESCE(s.current_qty, 0),
      'recommended_qty', im.reorder_quantity
    )
  )
  INTO reorder_alerts
  FROM dkegl_item_master im
  LEFT JOIN dkegl_stock s ON im.organization_id = s.organization_id AND im.item_code = s.item_code
  WHERE im.organization_id = _org_id 
    AND im.reorder_level > 0
    AND COALESCE(s.current_qty, 0) <= im.reorder_level
  ORDER BY (im.reorder_level - COALESCE(s.current_qty, 0)) DESC
  LIMIT 15;
  
  -- ABC Analysis (simplified - based on value)
  WITH item_values AS (
    SELECT 
      s.item_code,
      s.current_qty * COALESCE(s.unit_cost, 0) as total_value,
      ROW_NUMBER() OVER (ORDER BY s.current_qty * COALESCE(s.unit_cost, 0) DESC) as value_rank,
      COUNT(*) OVER () as total_items
    FROM dkegl_stock s
    WHERE s.organization_id = _org_id AND s.current_qty > 0
  )
  SELECT jsonb_build_object(
    'a_category', jsonb_agg(CASE WHEN value_rank <= total_items * 0.2 THEN 
      jsonb_build_object('item_code', item_code, 'value', total_value) END),
    'b_category', jsonb_agg(CASE WHEN value_rank > total_items * 0.2 AND value_rank <= total_items * 0.5 THEN 
      jsonb_build_object('item_code', item_code, 'value', total_value) END),
    'c_category', jsonb_agg(CASE WHEN value_rank > total_items * 0.5 THEN 
      jsonb_build_object('item_code', item_code, 'value', total_value) END)
  )
  INTO abc_analysis
  FROM item_values;
  
  -- Build comprehensive result
  result := jsonb_build_object(
    'summary', jsonb_build_object(
      'total_inventory_value', total_value,
      'dead_stock_value', dead_stock_value,
      'dead_stock_percentage', CASE WHEN total_value > 0 THEN (dead_stock_value / total_value * 100) ELSE 0 END,
      'health_score', CASE WHEN total_value > 0 THEN (100 - (dead_stock_value / total_value * 100)) ELSE 100 END
    ),
    'fast_movers', COALESCE(fast_movers, '[]'::jsonb),
    'slow_movers', COALESCE(slow_movers, '[]'::jsonb),
    'reorder_alerts', COALESCE(reorder_alerts, '[]'::jsonb),
    'abc_analysis', COALESCE(abc_analysis, '{}'::jsonb),
    'generated_at', to_jsonb(now())
  );
  
  RETURN result;
END;
$function$;

-- Cost variance and pricing intelligence function
CREATE OR REPLACE FUNCTION public.dkegl_get_pricing_intelligence(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}';
  price_variances jsonb;
  cost_trends jsonb;
  supplier_performance jsonb;
BEGIN
  -- Get recent price variances
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', item_code,
      'variance_percentage', variance_percentage,
      'current_master_price', current_master_price,
      'new_market_price', new_market_price,
      'alert_severity', alert_severity,
      'created_at', created_at
    )
  )
  INTO price_variances
  FROM dkegl_pricing_variance_alerts
  WHERE organization_id = _org_id 
    AND status = 'open'
    AND created_at >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY variance_percentage DESC
  LIMIT 10;
  
  -- Get cost trends (last 3 months GRN data)
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', item_code,
      'avg_cost_3m', avg_cost,
      'trend', CASE 
        WHEN cost_change > 10 THEN 'increasing'
        WHEN cost_change < -10 THEN 'decreasing'
        ELSE 'stable'
      END,
      'cost_change_percentage', cost_change
    )
  )
  INTO cost_trends
  FROM (
    SELECT 
      g.item_code,
      AVG(g.total_amount / NULLIF(g.qty_received, 0)) as avg_cost,
      (AVG(CASE WHEN g.date >= CURRENT_DATE - INTERVAL '30 days' 
               THEN g.total_amount / NULLIF(g.qty_received, 0) END) -
       AVG(CASE WHEN g.date < CURRENT_DATE - INTERVAL '30 days' 
               AND g.date >= CURRENT_DATE - INTERVAL '60 days'
               THEN g.total_amount / NULLIF(g.qty_received, 0) END)) /
       NULLIF(AVG(CASE WHEN g.date < CURRENT_DATE - INTERVAL '30 days' 
                       AND g.date >= CURRENT_DATE - INTERVAL '60 days'
                       THEN g.total_amount / NULLIF(g.qty_received, 0) END), 0) * 100 as cost_change
    FROM dkegl_grn_log g
    WHERE g.organization_id = _org_id 
      AND g.date >= CURRENT_DATE - INTERVAL '90 days'
      AND g.total_amount > 0 AND g.qty_received > 0
    GROUP BY g.item_code
    HAVING COUNT(*) >= 3
  ) t
  ORDER BY ABS(cost_change) DESC
  LIMIT 10;
  
  -- Supplier performance analysis
  SELECT jsonb_agg(
    jsonb_build_object(
      'supplier_name', supplier_name,
      'total_value', total_value,
      'avg_delivery_time', avg_delivery_days,
      'price_stability', price_stability_score
    )
  )
  INTO supplier_performance
  FROM (
    SELECT 
      g.supplier_name,
      SUM(g.total_amount) as total_value,
      AVG(EXTRACT(DAY FROM g.date - g.invoice_date)) as avg_delivery_days,
      100 - AVG(ABS(
        (g.total_amount / NULLIF(g.qty_received, 0)) - 
        LAG(g.total_amount / NULLIF(g.qty_received, 0)) OVER (
          PARTITION BY g.supplier_name, g.item_code 
          ORDER BY g.date
        )
      ) / NULLIF(g.total_amount / NULLIF(g.qty_received, 0), 0) * 100) as price_stability_score
    FROM dkegl_grn_log g
    WHERE g.organization_id = _org_id 
      AND g.date >= CURRENT_DATE - INTERVAL '90 days'
      AND g.supplier_name IS NOT NULL
      AND g.total_amount > 0
    GROUP BY g.supplier_name
    HAVING COUNT(*) >= 3
  ) s
  ORDER BY total_value DESC
  LIMIT 10;
  
  result := jsonb_build_object(
    'price_variances', COALESCE(price_variances, '[]'::jsonb),
    'cost_trends', COALESCE(cost_trends, '[]'::jsonb),
    'supplier_performance', COALESCE(supplier_performance, '[]'::jsonb),
    'generated_at', to_jsonb(now())
  );
  
  RETURN result;
END;
$function$;

-- Predictive analytics function
CREATE OR REPLACE FUNCTION public.dkegl_get_predictive_insights(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}';
  demand_forecast jsonb;
  seasonal_patterns jsonb;
  bottleneck_predictions jsonb;
BEGIN
  -- Demand forecasting (based on consumption trends)
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', item_code,
      'current_monthly_avg', monthly_avg,
      'predicted_next_month', predicted_demand,
      'confidence', confidence_level,
      'stockout_risk', CASE 
        WHEN current_stock / NULLIF(predicted_demand, 0) < 1 THEN 'high'
        WHEN current_stock / NULLIF(predicted_demand, 0) < 2 THEN 'medium'
        ELSE 'low'
      END
    )
  )
  INTO demand_forecast
  FROM (
    SELECT 
      i.item_code,
      AVG(monthly_qty) as monthly_avg,
      AVG(monthly_qty) * (1 + growth_rate) as predicted_demand,
      CASE WHEN COUNT(*) >= 6 THEN 'high' 
           WHEN COUNT(*) >= 3 THEN 'medium' 
           ELSE 'low' END as confidence_level,
      COALESCE(s.current_qty, 0) as current_stock,
      (AVG(monthly_qty) - LAG(AVG(monthly_qty)) OVER (ORDER BY i.item_code)) / 
       NULLIF(LAG(AVG(monthly_qty)) OVER (ORDER BY i.item_code), 0) as growth_rate
    FROM (
      SELECT 
        item_code,
        DATE_TRUNC('month', date) as month,
        SUM(qty_issued) as monthly_qty
      FROM dkegl_issue_log
      WHERE organization_id = _org_id 
        AND date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY item_code, DATE_TRUNC('month', date)
    ) i
    LEFT JOIN dkegl_stock s ON i.item_code = s.item_code AND s.organization_id = _org_id
    GROUP BY i.item_code, s.current_qty
    HAVING AVG(monthly_qty) > 0
  ) f
  ORDER BY predicted_demand DESC
  LIMIT 15;
  
  -- Seasonal pattern detection
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', item_code,
      'seasonality_score', seasonality_score,
      'peak_months', peak_months,
      'seasonal_factor', seasonal_factor
    )
  )
  INTO seasonal_patterns
  FROM (
    SELECT 
      item_code,
      STDDEV(monthly_qty) / NULLIF(AVG(monthly_qty), 0) as seasonality_score,
      array_agg(month_num ORDER BY monthly_qty DESC) as peak_months,
      MAX(monthly_qty) / NULLIF(MIN(monthly_qty), 0) as seasonal_factor
    FROM (
      SELECT 
        item_code,
        EXTRACT(MONTH FROM date) as month_num,
        AVG(qty_issued) as monthly_qty
      FROM dkegl_issue_log
      WHERE organization_id = _org_id 
        AND date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY item_code, EXTRACT(MONTH FROM date)
    ) m
    GROUP BY item_code
    HAVING COUNT(*) >= 8 AND STDDEV(monthly_qty) / NULLIF(AVG(monthly_qty), 0) > 0.3
  ) s
  ORDER BY seasonality_score DESC
  LIMIT 10;
  
  result := jsonb_build_object(
    'demand_forecast', COALESCE(demand_forecast, '[]'::jsonb),
    'seasonal_patterns', COALESCE(seasonal_patterns, '[]'::jsonb),
    'generated_at', to_jsonb(now())
  );
  
  RETURN result;
END;
$function$;