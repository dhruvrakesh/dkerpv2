-- Complete implementation of missing AI context functions

-- 1. dkegl_get_context_inventory_data - provides contextual inventory data for AI prompts
CREATE OR REPLACE FUNCTION public.dkegl_get_context_inventory_data(_org_id uuid, _context_type text DEFAULT 'general'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}';
  stock_data jsonb;
  summary_data jsonb;
  recent_transactions jsonb;
  alerts_data jsonb;
BEGIN
  -- Get current stock summary (top 20 by value)
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', s.item_code,
      'current_qty', s.current_qty,
      'unit_cost', s.unit_cost,
      'total_value', s.current_qty * COALESCE(s.unit_cost, 0),
      'last_transaction_date', s.last_transaction_date,
      'item_name', im.item_name,
      'category_name', c.category_name,
      'reorder_level', im.reorder_level,
      'location', s.location
    )
  ) INTO stock_data
  FROM dkegl_stock s
  LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
  LEFT JOIN dkegl_categories c ON im.category_id = c.id
  WHERE s.organization_id = _org_id
    AND s.current_qty > 0
  ORDER BY (s.current_qty * COALESCE(s.unit_cost, 0)) DESC
  LIMIT 20;

  -- Get inventory summary statistics
  SELECT jsonb_build_object(
    'total_items', COUNT(*),
    'total_value', COALESCE(SUM(s.current_qty * COALESCE(s.unit_cost, 0)), 0),
    'low_stock_items', COUNT(*) FILTER (WHERE s.current_qty <= COALESCE(im.reorder_level, 0) AND im.reorder_level > 0),
    'zero_stock_items', COUNT(*) FILTER (WHERE s.current_qty = 0),
    'categories_count', COUNT(DISTINCT c.id)
  ) INTO summary_data
  FROM dkegl_stock s
  LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
  LEFT JOIN dkegl_categories c ON im.category_id = c.id
  WHERE s.organization_id = _org_id;

  -- Get recent transactions (last 7 days)
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', g.date,
      'type', 'GRN',
      'item_code', g.item_code,
      'quantity', g.qty_received,
      'reference', g.grn_number
    )
  ) INTO recent_transactions
  FROM dkegl_grn_log g
  WHERE g.organization_id = _org_id
    AND g.date >= CURRENT_DATE - INTERVAL '7 days'
  ORDER BY g.date DESC
  LIMIT 10;

  -- Get pricing variance alerts
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', pva.item_code,
      'alert_type', pva.alert_type,
      'variance_percentage', pva.variance_percentage,
      'alert_severity', pva.alert_severity,
      'created_at', pva.created_at
    )
  ) INTO alerts_data
  FROM dkegl_pricing_variance_alerts pva
  WHERE pva.organization_id = _org_id
    AND pva.status = 'open'
    AND pva.created_at >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY pva.created_at DESC
  LIMIT 5;

  -- Build final result
  result := jsonb_build_object(
    'stock_data', COALESCE(stock_data, '[]'::jsonb),
    'summary', COALESCE(summary_data, '{}'::jsonb),
    'recent_transactions', COALESCE(recent_transactions, '[]'::jsonb),
    'alerts', COALESCE(alerts_data, '[]'::jsonb),
    'context_type', _context_type,
    'generated_at', now()
  );

  RETURN result;
END;
$function$;

-- 2. dkegl_get_context_production_data - provides contextual production data for AI prompts
CREATE OR REPLACE FUNCTION public.dkegl_get_context_production_data(_org_id uuid, _context_type text DEFAULT 'general'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}';
  orders_data jsonb;
  workflow_data jsonb;
  performance_data jsonb;
  material_data jsonb;
BEGIN
  -- Get active orders summary
  SELECT jsonb_agg(
    jsonb_build_object(
      'order_number', o.order_number,
      'uiorn', o.uiorn,
      'item_code', o.item_code,
      'item_name', o.item_name,
      'order_quantity', o.order_quantity,
      'status', o.status,
      'delivery_date', o.delivery_date,
      'priority_level', o.priority_level,
      'created_at', o.created_at
    )
  ) INTO orders_data
  FROM dkegl_orders o
  WHERE o.organization_id = _org_id
    AND o.status NOT IN ('completed', 'cancelled')
  ORDER BY o.priority_level, o.delivery_date
  LIMIT 15;

  -- Get workflow progress summary
  SELECT jsonb_agg(
    jsonb_build_object(
      'stage_name', ws.stage_name,
      'order_id', wp.order_id,
      'status', wp.status,
      'efficiency_percentage', wp.efficiency_percentage,
      'material_cost', wp.material_cost,
      'labor_cost', wp.labor_cost,
      'total_stage_cost', wp.total_stage_cost,
      'started_at', wp.started_at,
      'completed_at', wp.completed_at
    )
  ) INTO workflow_data
  FROM dkegl_workflow_progress wp
  JOIN dkegl_workflow_stages ws ON wp.stage_id = ws.id
  WHERE ws.organization_id = _org_id
    AND wp.status IN ('in_progress', 'paused', 'completed')
    AND wp.started_at >= CURRENT_DATE - INTERVAL '7 days'
  ORDER BY wp.started_at DESC
  LIMIT 20;

  -- Get material consumption data
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', mc.item_code,
      'planned_quantity', mc.planned_quantity,
      'actual_quantity', mc.actual_quantity,
      'waste_quantity', mc.waste_quantity,
      'unit_cost', mc.unit_cost,
      'total_cost', mc.total_cost,
      'consumed_at', mc.consumed_at
    )
  ) INTO material_data
  FROM dkegl_material_consumption mc
  WHERE mc.organization_id = _org_id
    AND mc.consumed_at >= CURRENT_DATE - INTERVAL '7 days'
  ORDER BY mc.consumed_at DESC
  LIMIT 15;

  -- Get performance summary
  SELECT jsonb_build_object(
    'active_orders', COUNT(*) FILTER (WHERE o.status NOT IN ('completed', 'cancelled')),
    'completed_today', COUNT(*) FILTER (WHERE o.status = 'completed' AND o.updated_at::date = CURRENT_DATE),
    'overdue_orders', COUNT(*) FILTER (WHERE o.delivery_date < CURRENT_DATE AND o.status NOT IN ('completed', 'cancelled')),
    'avg_lead_time_days', AVG(EXTRACT(DAY FROM o.updated_at - o.created_at)) FILTER (WHERE o.status = 'completed')
  ) INTO performance_data
  FROM dkegl_orders o
  WHERE o.organization_id = _org_id
    AND o.created_at >= CURRENT_DATE - INTERVAL '30 days';

  -- Build final result
  result := jsonb_build_object(
    'orders', COALESCE(orders_data, '[]'::jsonb),
    'workflow_progress', COALESCE(workflow_data, '[]'::jsonb),
    'material_consumption', COALESCE(material_data, '[]'::jsonb),
    'performance_summary', COALESCE(performance_data, '{}'::jsonb),
    'context_type', _context_type,
    'generated_at', now()
  );

  RETURN result;
END;
$function$;

-- 3. Enhanced dkegl_get_inventory_analytics function
CREATE OR REPLACE FUNCTION public.dkegl_get_inventory_analytics(_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}';
  abc_analysis jsonb;
  turnover_analysis jsonb;
  stock_health jsonb;
  trend_analysis jsonb;
BEGIN
  -- ABC Analysis (by value)
  WITH item_values AS (
    SELECT 
      s.item_code,
      im.item_name,
      s.current_qty * COALESCE(s.unit_cost, 0) as total_value
    FROM dkegl_stock s
    LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
    WHERE s.organization_id = _org_id AND s.current_qty > 0
  ),
  ranked_items AS (
    SELECT 
      *,
      PERCENT_RANK() OVER (ORDER BY total_value DESC) as value_rank
    FROM item_values
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', item_code,
      'item_name', item_name,
      'total_value', total_value,
      'abc_category', 
        CASE 
          WHEN value_rank <= 0.2 THEN 'A'
          WHEN value_rank <= 0.5 THEN 'B'
          ELSE 'C'
        END
    )
  ) INTO abc_analysis
  FROM ranked_items;

  -- Stock Turnover Analysis (last 90 days)
  WITH turnover_calc AS (
    SELECT 
      s.item_code,
      im.item_name,
      s.current_qty,
      COALESCE(SUM(il.qty_issued), 0) as issued_qty_90d,
      CASE 
        WHEN s.current_qty > 0 AND SUM(il.qty_issued) > 0 
        THEN (SUM(il.qty_issued) / NULLIF(s.current_qty, 0)) * (365.0 / 90.0)
        ELSE 0 
      END as annual_turnover_ratio
    FROM dkegl_stock s
    LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
    LEFT JOIN dkegl_issue_log il ON s.organization_id = il.organization_id 
      AND s.item_code = il.item_code 
      AND il.date >= CURRENT_DATE - INTERVAL '90 days'
    WHERE s.organization_id = _org_id
    GROUP BY s.item_code, im.item_name, s.current_qty
    HAVING s.current_qty > 0
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', item_code,
      'item_name', item_name,
      'current_qty', current_qty,
      'issued_qty_90d', issued_qty_90d,
      'annual_turnover_ratio', annual_turnover_ratio,
      'turnover_category',
        CASE 
          WHEN annual_turnover_ratio >= 12 THEN 'Fast Moving'
          WHEN annual_turnover_ratio >= 4 THEN 'Medium Moving'
          WHEN annual_turnover_ratio > 0 THEN 'Slow Moving'
          ELSE 'Dead Stock'
        END
    )
  ) INTO turnover_analysis
  FROM turnover_calc
  ORDER BY annual_turnover_ratio DESC;

  -- Stock Health Indicators
  SELECT jsonb_build_object(
    'total_items', COUNT(*),
    'total_value', COALESCE(SUM(s.current_qty * COALESCE(s.unit_cost, 0)), 0),
    'low_stock_count', COUNT(*) FILTER (WHERE s.current_qty <= COALESCE(im.reorder_level, 0) AND im.reorder_level > 0),
    'overstock_count', COUNT(*) FILTER (WHERE s.current_qty > COALESCE(im.reorder_level, 0) * 3 AND im.reorder_level > 0),
    'dead_stock_count', COUNT(*) FILTER (WHERE s.last_transaction_date < CURRENT_DATE - INTERVAL '180 days'),
    'avg_days_of_cover', AVG(
      CASE 
        WHEN COALESCE(consumption.daily_avg, 0) > 0 
        THEN s.current_qty / consumption.daily_avg
        ELSE NULL 
      END
    )
  ) INTO stock_health
  FROM dkegl_stock s
  LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
  LEFT JOIN LATERAL (
    SELECT AVG(il.qty_issued / 30.0) as daily_avg
    FROM dkegl_issue_log il
    WHERE il.organization_id = s.organization_id 
      AND il.item_code = s.item_code
      AND il.date >= CURRENT_DATE - INTERVAL '90 days'
  ) consumption ON true
  WHERE s.organization_id = _org_id;

  -- Build final result
  result := jsonb_build_object(
    'abc_analysis', COALESCE(abc_analysis, '[]'::jsonb),
    'turnover_analysis', COALESCE(turnover_analysis, '[]'::jsonb),
    'stock_health', COALESCE(stock_health, '{}'::jsonb),
    'generated_at', now()
  );

  RETURN result;
END;
$function$;

-- 4. Enhanced dkegl_get_pricing_intelligence function
CREATE OR REPLACE FUNCTION public.dkegl_get_pricing_intelligence(_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}';
  price_trends jsonb;
  variance_analysis jsonb;
  market_insights jsonb;
BEGIN
  -- Price trends analysis (last 6 months)
  WITH price_history AS (
    SELECT 
      g.item_code,
      im.item_name,
      g.date,
      CASE WHEN g.qty_received > 0 AND g.total_amount > 0 
           THEN g.total_amount / g.qty_received 
           ELSE 0 END as unit_price,
      ROW_NUMBER() OVER (PARTITION BY g.item_code ORDER BY g.date DESC) as rn
    FROM dkegl_grn_log g
    LEFT JOIN dkegl_item_master im ON g.organization_id = im.organization_id AND g.item_code = im.item_code
    WHERE g.organization_id = _org_id
      AND g.date >= CURRENT_DATE - INTERVAL '6 months'
      AND g.qty_received > 0 
      AND g.total_amount > 0
  ),
  trend_calc AS (
    SELECT 
      item_code,
      item_name,
      COUNT(*) as price_points,
      AVG(unit_price) as avg_price,
      MIN(unit_price) as min_price,
      MAX(unit_price) as max_price,
      STDDEV(unit_price) as price_volatility,
      -- Calculate trend (comparing last month vs previous months)
      AVG(CASE WHEN rn <= 30 THEN unit_price END) as recent_avg,
      AVG(CASE WHEN rn > 30 THEN unit_price END) as historical_avg
    FROM price_history
    GROUP BY item_code, item_name
    HAVING COUNT(*) >= 3
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', item_code,
      'item_name', item_name,
      'avg_price', avg_price,
      'min_price', min_price,
      'max_price', max_price,
      'price_volatility', COALESCE(price_volatility, 0),
      'price_trend', 
        CASE 
          WHEN recent_avg > historical_avg * 1.05 THEN 'Increasing'
          WHEN recent_avg < historical_avg * 0.95 THEN 'Decreasing'
          ELSE 'Stable'
        END,
      'price_points', price_points
    )
  ) INTO price_trends
  FROM trend_calc;

  -- Active variance alerts
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', pva.item_code,
      'alert_type', pva.alert_type,
      'variance_percentage', pva.variance_percentage,
      'current_master_price', pva.current_master_price,
      'new_market_price', pva.new_market_price,
      'alert_severity', pva.alert_severity,
      'grn_reference', pva.grn_reference,
      'created_at', pva.created_at
    )
  ) INTO variance_analysis
  FROM dkegl_pricing_variance_alerts pva
  WHERE pva.organization_id = _org_id
    AND pva.status = 'open'
    AND pva.created_at >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY pva.variance_percentage DESC;

  -- Market insights summary
  SELECT jsonb_build_object(
    'total_active_alerts', COUNT(*) FILTER (WHERE pva.status = 'open'),
    'high_variance_items', COUNT(*) FILTER (WHERE pva.variance_percentage > 20 AND pva.status = 'open'),
    'avg_market_variance', AVG(pva.variance_percentage) FILTER (WHERE pva.created_at >= CURRENT_DATE - INTERVAL '30 days'),
    'items_with_pricing_data', COUNT(DISTINCT pm.item_code)
  ) INTO market_insights
  FROM dkegl_pricing_variance_alerts pva
  FULL OUTER JOIN dkegl_pricing_master pm ON pva.organization_id = pm.organization_id
  WHERE COALESCE(pva.organization_id, pm.organization_id) = _org_id;

  -- Build final result
  result := jsonb_build_object(
    'price_trends', COALESCE(price_trends, '[]'::jsonb),
    'variance_alerts', COALESCE(variance_analysis, '[]'::jsonb),
    'market_insights', COALESCE(market_insights, '{}'::jsonb),
    'generated_at', now()
  );

  RETURN result;
END;
$function$;

-- 5. Enhanced dkegl_get_predictive_insights function
CREATE OR REPLACE FUNCTION public.dkegl_get_predictive_insights(_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}';
  demand_forecast jsonb;
  reorder_predictions jsonb;
  capacity_insights jsonb;
BEGIN
  -- Demand forecasting based on historical consumption
  WITH consumption_trends AS (
    SELECT 
      il.item_code,
      im.item_name,
      DATE_TRUNC('month', il.date) as month,
      SUM(il.qty_issued) as monthly_consumption
    FROM dkegl_issue_log il
    LEFT JOIN dkegl_item_master im ON il.organization_id = im.organization_id AND il.item_code = im.item_code
    WHERE il.organization_id = _org_id
      AND il.date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY il.item_code, im.item_name, DATE_TRUNC('month', il.date)
  ),
  forecast_calc AS (
    SELECT 
      item_code,
      item_name,
      AVG(monthly_consumption) as avg_monthly_demand,
      STDDEV(monthly_consumption) as demand_volatility,
      COUNT(*) as data_points,
      -- Simple trend calculation
      (AVG(monthly_consumption) FILTER (WHERE month >= CURRENT_DATE - INTERVAL '3 months') - 
       AVG(monthly_consumption) FILTER (WHERE month < CURRENT_DATE - INTERVAL '3 months')) as trend_change
    FROM consumption_trends
    GROUP BY item_code, item_name
    HAVING COUNT(*) >= 6
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', item_code,
      'item_name', item_name,
      'avg_monthly_demand', avg_monthly_demand,
      'demand_volatility', COALESCE(demand_volatility, 0),
      'predicted_next_month', GREATEST(avg_monthly_demand + COALESCE(trend_change, 0), 0),
      'demand_trend', 
        CASE 
          WHEN trend_change > avg_monthly_demand * 0.1 THEN 'Increasing'
          WHEN trend_change < -avg_monthly_demand * 0.1 THEN 'Decreasing'
          ELSE 'Stable'
        END,
      'confidence_level',
        CASE 
          WHEN data_points >= 12 AND COALESCE(demand_volatility, 0) < avg_monthly_demand * 0.3 THEN 'High'
          WHEN data_points >= 8 THEN 'Medium'
          ELSE 'Low'
        END
    )
  ) INTO demand_forecast
  FROM forecast_calc
  ORDER BY avg_monthly_demand DESC
  LIMIT 20;

  -- Reorder point predictions
  WITH reorder_analysis AS (
    SELECT 
      s.item_code,
      im.item_name,
      s.current_qty,
      im.reorder_level,
      im.lead_time_days,
      -- Calculate consumption rate (last 90 days)
      COALESCE(consumption.daily_avg, 0) as daily_consumption_rate,
      -- Calculate days until reorder needed
      CASE 
        WHEN COALESCE(consumption.daily_avg, 0) > 0 
        THEN (s.current_qty - COALESCE(im.reorder_level, 0)) / consumption.daily_avg
        ELSE NULL 
      END as days_until_reorder
    FROM dkegl_stock s
    LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
    LEFT JOIN LATERAL (
      SELECT AVG(il.qty_issued / 90.0) as daily_avg
      FROM dkegl_issue_log il
      WHERE il.organization_id = s.organization_id 
        AND il.item_code = s.item_code
        AND il.date >= CURRENT_DATE - INTERVAL '90 days'
    ) consumption ON true
    WHERE s.organization_id = _org_id
      AND s.current_qty > 0
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', item_code,
      'item_name', item_name,
      'current_qty', current_qty,
      'reorder_level', reorder_level,
      'daily_consumption_rate', daily_consumption_rate,
      'days_until_reorder', days_until_reorder,
      'reorder_urgency',
        CASE 
          WHEN days_until_reorder <= lead_time_days THEN 'Critical'
          WHEN days_until_reorder <= lead_time_days * 1.5 THEN 'High'
          WHEN days_until_reorder <= lead_time_days * 2 THEN 'Medium'
          ELSE 'Low'
        END,
      'recommended_order_qty', 
        CASE 
          WHEN daily_consumption_rate > 0 
          THEN CEIL(daily_consumption_rate * (lead_time_days + 30))
          ELSE COALESCE(reorder_quantity, 0)
        END
    )
  ) INTO reorder_predictions
  FROM reorder_analysis
  WHERE daily_consumption_rate > 0
  ORDER BY days_until_reorder NULLS LAST
  LIMIT 15;

  -- Production capacity insights
  SELECT jsonb_build_object(
    'active_orders', COUNT(*) FILTER (WHERE o.status IN ('in_progress', 'planned')),
    'capacity_utilization', 
      CASE 
        WHEN COUNT(*) FILTER (WHERE o.status IN ('in_progress', 'planned')) > 0
        THEN LEAST((COUNT(*) FILTER (WHERE o.status IN ('in_progress', 'planned')) * 100.0 / 20), 100)
        ELSE 0 
      END,
    'bottleneck_stages', (
      SELECT jsonb_agg(stage_name)
      FROM (
        SELECT ws.stage_name, COUNT(*) as pending_count
        FROM dkegl_workflow_progress wp
        JOIN dkegl_workflow_stages ws ON wp.stage_id = ws.id
        WHERE ws.organization_id = _org_id
          AND wp.status = 'in_progress'
        GROUP BY ws.stage_name
        ORDER BY pending_count DESC
        LIMIT 3
      ) bottlenecks
    ),
    'avg_completion_time_days', (
      SELECT AVG(EXTRACT(DAY FROM wp.completed_at - wp.started_at))
      FROM dkegl_workflow_progress wp
      JOIN dkegl_workflow_stages ws ON wp.stage_id = ws.id
      WHERE ws.organization_id = _org_id
        AND wp.completed_at IS NOT NULL
        AND wp.started_at >= CURRENT_DATE - INTERVAL '30 days'
    )
  ) INTO capacity_insights
  FROM dkegl_orders o
  WHERE o.organization_id = _org_id;

  -- Build final result
  result := jsonb_build_object(
    'demand_forecast', COALESCE(demand_forecast, '[]'::jsonb),
    'reorder_predictions', COALESCE(reorder_predictions, '[]'::jsonb),
    'capacity_insights', COALESCE(capacity_insights, '{}'::jsonb),
    'generated_at', now()
  );

  RETURN result;
END;
$function$;

-- 6. Enhanced dkegl_get_ai_memory_insights function  
CREATE OR REPLACE FUNCTION public.dkegl_get_ai_memory_insights(_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}';
  usage_stats jsonb;
  conversation_topics jsonb;
  user_patterns jsonb;
BEGIN
  -- AI usage statistics
  SELECT jsonb_build_object(
    'total_sessions', COUNT(DISTINCT acs.id),
    'total_messages', COUNT(acm.id),
    'avg_session_length', AVG(acm.message_count),
    'most_active_context', mode() WITHIN GROUP (ORDER BY acs.context_type),
    'total_tokens_used', COALESCE(SUM(aul.total_tokens), 0),
    'total_cost_usd', COALESCE(SUM(aul.cost_usd), 0)
  ) INTO usage_stats
  FROM dkegl_ai_chat_sessions acs
  LEFT JOIN (
    SELECT session_id, COUNT(*) as message_count
    FROM dkegl_ai_chat_messages
    GROUP BY session_id
  ) acm ON acs.id = acm.session_id
  LEFT JOIN dkegl_ai_usage_logs aul ON acs.id = aul.session_id
  WHERE acs.organization_id = _org_id
    AND acs.created_at >= CURRENT_DATE - INTERVAL '30 days';

  -- Conversation topic analysis
  SELECT jsonb_agg(
    jsonb_build_object(
      'context_type', context_type,
      'session_count', session_count,
      'avg_messages_per_session', avg_messages,
      'last_used', last_used
    )
  ) INTO conversation_topics
  FROM (
    SELECT 
      acs.context_type,
      COUNT(*) as session_count,
      AVG(msg_counts.message_count) as avg_messages,
      MAX(acs.last_activity_at) as last_used
    FROM dkegl_ai_chat_sessions acs
    LEFT JOIN (
      SELECT session_id, COUNT(*) as message_count
      FROM dkegl_ai_chat_messages
      GROUP BY session_id
    ) msg_counts ON acs.id = msg_counts.session_id
    WHERE acs.organization_id = _org_id
      AND acs.created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY acs.context_type
    ORDER BY session_count DESC
  ) topic_stats;

  -- User interaction patterns
  SELECT jsonb_build_object(
    'active_users_count', COUNT(DISTINCT acs.user_id),
    'peak_usage_hour', (
      SELECT EXTRACT(HOUR FROM created_at) as hour
      FROM dkegl_ai_chat_messages acm
      JOIN dkegl_ai_chat_sessions acs ON acm.session_id = acs.id
      WHERE acs.organization_id = _org_id
        AND acm.created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ),
    'most_common_functions', (
      SELECT jsonb_agg(function_name)
      FROM (
        SELECT 
          (metadata->>'function_name') as function_name,
          COUNT(*) as usage_count
        FROM dkegl_ai_chat_messages acm
        JOIN dkegl_ai_chat_sessions acs ON acm.session_id = acs.id
        WHERE acs.organization_id = _org_id
          AND acm.metadata->>'function_name' IS NOT NULL
          AND acm.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY (metadata->>'function_name')
        ORDER BY usage_count DESC
        LIMIT 5
      ) func_stats
    )
  ) INTO user_patterns
  FROM dkegl_ai_chat_sessions acs
  WHERE acs.organization_id = _org_id
    AND acs.created_at >= CURRENT_DATE - INTERVAL '30 days';

  -- Build final result
  result := jsonb_build_object(
    'usage_statistics', COALESCE(usage_stats, '{}'::jsonb),
    'conversation_topics', COALESCE(conversation_topics, '[]'::jsonb),
    'user_patterns', COALESCE(user_patterns, '{}'::jsonb),
    'generated_at', now()
  );

  RETURN result;
END;
$function$;