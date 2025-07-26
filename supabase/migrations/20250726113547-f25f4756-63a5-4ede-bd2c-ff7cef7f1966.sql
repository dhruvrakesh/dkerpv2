-- Fix the dkegl_capture_daily_stock_snapshot function to calculate total_value
CREATE OR REPLACE FUNCTION public.dkegl_capture_daily_stock_snapshot(_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  snapshot_data JSONB;
  record_count INTEGER;
  total_val NUMERIC;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', item_code,
      'current_qty', current_qty,
      'unit_cost', unit_cost,
      'total_value', current_qty * COALESCE(unit_cost, 0),
      'location', location
    )
  ), COUNT(*), COALESCE(SUM(current_qty * COALESCE(unit_cost, 0)), 0)
  INTO snapshot_data, record_count, total_val
  FROM dkegl_stock
  WHERE organization_id = _org_id;

  INSERT INTO dkegl_daily_stock_snapshots (
    organization_id,
    snapshot_date, 
    snapshot_data, 
    record_count,
    total_value
  ) VALUES (
    _org_id,
    CURRENT_DATE, 
    snapshot_data, 
    record_count,
    total_val
  )
  ON CONFLICT (organization_id, snapshot_date) 
  DO UPDATE SET 
    snapshot_data = EXCLUDED.snapshot_data,
    record_count = EXCLUDED.record_count,
    total_value = EXCLUDED.total_value,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'date', CURRENT_DATE,
    'record_count', record_count,
    'total_value', total_val
  );
END;
$function$;