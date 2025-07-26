-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a daily stock snapshot job to run at 4:30 PM IST (11:00 AM UTC)
-- Note: Supabase uses UTC time, so 4:30 PM IST = 11:00 AM UTC
SELECT cron.schedule(
  'daily-stock-snapshot',
  '0 11 * * *', -- Daily at 11:00 AM UTC (4:30 PM IST)
  $$
  SELECT dkegl_capture_daily_stock_snapshot(
    (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1)
  );
  $$
);

-- Create enhanced context-based functions for AI
CREATE OR REPLACE FUNCTION public.dkegl_get_context_inventory_data(_org_id uuid, _context_type text DEFAULT 'general')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}';
  stock_data jsonb;
  summary_data jsonb;
  historical_data jsonb;
BEGIN
  -- Get current stock data
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', s.item_code,
      'current_qty', s.current_qty,
      'unit_cost', s.unit_cost,
      'total_value', s.current_qty * COALESCE(s.unit_cost, 0),
      'last_transaction_date', s.last_transaction_date,
      'item_name', im.item_name,
      'category_name', c.category_name,
      'reorder_level', im.reorder_level
    )
  ) INTO stock_data
  FROM dkegl_stock s
  LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
  LEFT JOIN dkegl_categories c ON im.category_id = c.id
  WHERE s.organization_id = _org_id
    AND s.current_qty > 0
  ORDER BY s.current_qty * COALESCE(s.unit_cost, 0) DESC
  LIMIT CASE WHEN _context_type = 'inventory' THEN 50 ELSE 20 END;
  
  -- Get summary metrics
  SELECT jsonb_build_object(
    'total_items', COUNT(*),
    'total_stock_qty', SUM(current_qty),
    'total_stock_value', SUM(current_qty * COALESCE(unit_cost, 0)),
    'items_with_stock', COUNT(CASE WHEN current_qty > 0 THEN 1 END),
    'low_stock_items', COUNT(CASE WHEN current_qty <= 
      (SELECT COALESCE(im.reorder_level, 10) FROM dkegl_item_master im 
       WHERE im.organization_id = s.organization_id AND im.item_code = s.item_code) 
      AND current_qty > 0 THEN 1 END)
  ) INTO summary_data
  FROM dkegl_stock s
  WHERE s.organization_id = _org_id;
  
  -- Get recent historical data if analytics context
  IF _context_type = 'analytics' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'snapshot_date', snapshot_date,
        'record_count', record_count,
        'total_value', total_value
      )
    ) INTO historical_data
    FROM dkegl_daily_stock_snapshots
    WHERE organization_id = _org_id
      AND snapshot_date >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY snapshot_date DESC
    LIMIT 10;
  END IF;
  
  -- Build result based on context
  result := jsonb_build_object(
    'current_stock', stock_data,
    'summary', summary_data,
    'context_type', _context_type,
    'as_of', now()
  );
  
  IF historical_data IS NOT NULL THEN
    result := result || jsonb_build_object('historical_snapshots', historical_data);
  END IF;
  
  RETURN result;
END;
$function$;

-- Create enhanced production context data function
CREATE OR REPLACE FUNCTION public.dkegl_get_context_production_data(_org_id uuid, _context_type text DEFAULT 'general')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}';
  orders_data jsonb;
  workflow_data jsonb;
  stage_performance jsonb;
BEGIN
  -- Get recent orders
  SELECT jsonb_agg(
    jsonb_build_object(
      'order_number', order_number,
      'uiorn', uiorn,
      'item_name', item_name,
      'status', status,
      'order_quantity', order_quantity,
      'delivery_date', delivery_date,
      'priority_level', priority_level,
      'created_at', created_at
    )
  ) INTO orders_data
  FROM dkegl_orders
  WHERE organization_id = _org_id
    AND created_at >= CURRENT_DATE - INTERVAL '30 days'
  ORDER BY created_at DESC
  LIMIT CASE WHEN _context_type = 'manufacturing' THEN 30 ELSE 10 END;
  
  -- Get workflow progress if manufacturing context
  IF _context_type = 'manufacturing' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'order_id', wp.order_id,
        'stage_id', wp.stage_id,
        'stage_name', ws.stage_name,
        'status', wp.status,
        'efficiency_percentage', wp.efficiency_percentage,
        'waste_percentage', wp.waste_percentage,
        'started_at', wp.started_at,
        'completed_at', wp.completed_at
      )
    ) INTO workflow_data
    FROM dkegl_workflow_progress wp
    JOIN dkegl_workflow_stages ws ON wp.stage_id = ws.id
    WHERE wp.organization_id = _org_id
      AND wp.started_at >= CURRENT_DATE - INTERVAL '14 days'
    ORDER BY wp.started_at DESC
    LIMIT 20;
    
    -- Get stage performance metrics
    SELECT jsonb_agg(
      jsonb_build_object(
        'stage_id', stage_id,
        'performance_date', performance_date,
        'orders_processed', orders_processed,
        'avg_efficiency_percentage', avg_efficiency_percentage,
        'bottleneck_score', bottleneck_score
      )
    ) INTO stage_performance
    FROM dkegl_stage_performance
    WHERE organization_id = _org_id
      AND performance_date >= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY performance_date DESC;
  END IF;
  
  result := jsonb_build_object(
    'orders', orders_data,
    'context_type', _context_type,
    'as_of', now()
  );
  
  IF workflow_data IS NOT NULL THEN
    result := result || jsonb_build_object('workflow_progress', workflow_data);
  END IF;
  
  IF stage_performance IS NOT NULL THEN
    result := result || jsonb_build_object('stage_performance', stage_performance);
  END IF;
  
  RETURN result;
END;
$function$;

-- Create memory-aware AI insights function
CREATE OR REPLACE FUNCTION public.dkegl_get_ai_memory_insights(_org_id uuid, _days_back integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb := '{}';
  trend_data jsonb;
  pattern_data jsonb;
BEGIN
  -- Calculate inventory trends from snapshots
  WITH snapshot_trends AS (
    SELECT 
      snapshot_date,
      total_value,
      record_count,
      LAG(total_value) OVER (ORDER BY snapshot_date) as prev_total_value,
      LAG(record_count) OVER (ORDER BY snapshot_date) as prev_record_count
    FROM dkegl_daily_stock_snapshots
    WHERE organization_id = _org_id
      AND snapshot_date >= CURRENT_DATE - INTERVAL '1 day' * _days_back
    ORDER BY snapshot_date
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', snapshot_date,
      'total_value', total_value,
      'record_count', record_count,
      'value_change', total_value - COALESCE(prev_total_value, total_value),
      'item_count_change', record_count - COALESCE(prev_record_count, record_count)
    )
  ) INTO trend_data
  FROM snapshot_trends
  WHERE prev_total_value IS NOT NULL;
  
  -- Identify consumption patterns from recent issues
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', item_code,
      'avg_weekly_consumption', avg_qty,
      'trend', CASE 
        WHEN recent_avg > older_avg * 1.2 THEN 'increasing'
        WHEN recent_avg < older_avg * 0.8 THEN 'decreasing'
        ELSE 'stable'
      END
    )
  ) INTO pattern_data
  FROM (
    SELECT 
      il.item_code,
      AVG(il.qty_issued) as avg_qty,
      AVG(CASE WHEN il.date >= CURRENT_DATE - INTERVAL '7 days' THEN il.qty_issued END) as recent_avg,
      AVG(CASE WHEN il.date < CURRENT_DATE - INTERVAL '7 days' AND il.date >= CURRENT_DATE - INTERVAL '14 days' THEN il.qty_issued END) as older_avg
    FROM dkegl_issue_log il
    WHERE il.organization_id = _org_id
      AND il.date >= CURRENT_DATE - INTERVAL '14 days'
    GROUP BY il.item_code
    HAVING COUNT(*) >= 3
  ) consumption_analysis
  WHERE recent_avg IS NOT NULL AND older_avg IS NOT NULL;
  
  result := jsonb_build_object(
    'inventory_trends', trend_data,
    'consumption_patterns', pattern_data,
    'analysis_period_days', _days_back,
    'generated_at', now()
  );
  
  RETURN result;
END;
$function$;