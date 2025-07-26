-- Fix the GROUP BY issue in dkegl_get_context_inventory_data
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
  SELECT jsonb_agg(stock_item) INTO stock_data
  FROM (
    SELECT jsonb_build_object(
      'item_code', s.item_code,
      'current_qty', s.current_qty,
      'unit_cost', s.unit_cost,
      'total_value', s.current_qty * COALESCE(s.unit_cost, 0),
      'last_transaction_date', s.last_transaction_date,
      'item_name', im.item_name,
      'category_name', c.category_name,
      'reorder_level', im.reorder_level,
      'location', s.location
    ) as stock_item
    FROM dkegl_stock s
    LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
    LEFT JOIN dkegl_categories c ON im.category_id = c.id
    WHERE s.organization_id = _org_id
      AND s.current_qty > 0
    ORDER BY (s.current_qty * COALESCE(s.unit_cost, 0)) DESC
    LIMIT 20
  ) subq;

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
  SELECT jsonb_agg(transaction_item) INTO recent_transactions
  FROM (
    SELECT jsonb_build_object(
      'date', g.date,
      'type', 'GRN',
      'item_code', g.item_code,
      'quantity', g.qty_received,
      'reference', g.grn_number
    ) as transaction_item
    FROM dkegl_grn_log g
    WHERE g.organization_id = _org_id
      AND g.date >= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY g.date DESC
    LIMIT 10
  ) subq;

  -- Get pricing variance alerts
  SELECT jsonb_agg(alert_item) INTO alerts_data
  FROM (
    SELECT jsonb_build_object(
      'item_code', pva.item_code,
      'alert_type', pva.alert_type,
      'variance_percentage', pva.variance_percentage,
      'alert_severity', pva.alert_severity,
      'created_at', pva.created_at
    ) as alert_item
    FROM dkegl_pricing_variance_alerts pva
    WHERE pva.organization_id = _org_id
      AND pva.status = 'open'
      AND pva.created_at >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY pva.created_at DESC
    LIMIT 5
  ) subq;

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