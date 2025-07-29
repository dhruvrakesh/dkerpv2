-- Fix the snapshot function to use correct column name
CREATE OR REPLACE FUNCTION public.dkegl_capture_daily_stock_snapshot(_org_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  snapshot_data JSONB;
  record_count INTEGER;
  total_value NUMERIC;
  org_id UUID;
BEGIN
  -- Use provided org_id or get current user's org
  org_id := COALESCE(_org_id, dkegl_get_current_user_org());
  
  -- Get current stock summary data with fixed date calculation
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', s.item_code,
      'item_name', COALESCE(im.item_name, 'Unknown'),
      'category_name', COALESCE(c.category_name, 'Uncategorized'),
      'current_qty', s.current_qty,
      'unit_cost', s.unit_cost,
      'total_value', (s.current_qty * s.unit_cost),
      'location', s.location,
      'last_transaction_date', s.last_transaction_date,
      'last_updated', s.last_updated,
      'uom', COALESCE(im.uom, 'PCS'),
      'reorder_level', im.reorder_level,
      'is_low_stock', (s.current_qty <= COALESCE(im.reorder_level, 0)),
      'days_since_movement', 
        CASE 
          WHEN s.last_transaction_date IS NULL THEN 999
          ELSE (CURRENT_DATE - s.last_transaction_date)::INTEGER
        END,
      'aging_category',
        CASE 
          WHEN s.last_transaction_date IS NULL THEN 'No Movement'
          WHEN (CURRENT_DATE - s.last_transaction_date) <= 30 THEN 'Fresh (0-30 days)'
          WHEN (CURRENT_DATE - s.last_transaction_date) <= 90 THEN 'Good (31-90 days)'
          WHEN (CURRENT_DATE - s.last_transaction_date) <= 180 THEN 'Aging (91-180 days)'
          WHEN (CURRENT_DATE - s.last_transaction_date) <= 365 THEN 'Old (181-365 days)'
          ELSE 'Critical (>365 days)'
        END
    )
  ), COUNT(*), SUM(s.current_qty * s.unit_cost)
  INTO snapshot_data, record_count, total_value
  FROM dkegl_stock s
  LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
  LEFT JOIN dkegl_categories c ON im.category_id = c.id
  WHERE s.organization_id = org_id;

  -- Insert or update today's snapshot using correct column names
  INSERT INTO public.dkegl_stock_snapshots (
    organization_id,
    snapshot_date,
    snapshot_data,
    record_count,
    total_value
  ) VALUES (
    org_id,
    CURRENT_DATE,
    COALESCE(snapshot_data, '[]'::jsonb),
    COALESCE(record_count, 0),
    COALESCE(total_value, 0)
  )
  ON CONFLICT (organization_id, snapshot_date) 
  DO UPDATE SET 
    snapshot_data = EXCLUDED.snapshot_data,
    record_count = EXCLUDED.record_count,
    total_value = EXCLUDED.total_value,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', org_id,
    'date', CURRENT_DATE,
    'record_count', COALESCE(record_count, 0),
    'total_value', COALESCE(total_value, 0),
    'message', 'Stock snapshot captured successfully'
  );
END;
$function$;