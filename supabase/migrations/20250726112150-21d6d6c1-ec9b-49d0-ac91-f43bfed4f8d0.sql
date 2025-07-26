-- Fix the stock snapshot function and populate summary without generated columns
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
      'calculated_value', current_qty * COALESCE(unit_cost, 0),
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

-- Populate current stock summary (excluding generated columns)
INSERT INTO dkegl_stock_summary (
  organization_id,
  item_code,
  item_name,
  category_name,
  opening_qty,
  current_qty,
  calculated_qty,
  total_grn_qty,
  total_issued_qty,
  last_transaction_date
)
SELECT 
  s.organization_id,
  s.item_code,
  im.item_name,
  c.category_name,
  s.opening_qty,
  s.current_qty,
  s.opening_qty + COALESCE(grn.total_grn, 0) - COALESCE(iss.total_issued, 0) as calculated_qty,
  COALESCE(grn.total_grn, 0) as total_grn_qty,
  COALESCE(iss.total_issued, 0) as total_issued_qty,
  s.last_transaction_date
FROM dkegl_stock s
LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
LEFT JOIN dkegl_categories c ON im.category_id = c.id
LEFT JOIN (
  SELECT organization_id, item_code, SUM(qty_received) as total_grn
  FROM dkegl_grn_log 
  GROUP BY organization_id, item_code
) grn ON s.organization_id = grn.organization_id AND s.item_code = grn.item_code
LEFT JOIN (
  SELECT organization_id, item_code, SUM(qty_issued) as total_issued
  FROM dkegl_issue_log 
  GROUP BY organization_id, item_code
) iss ON s.organization_id = iss.organization_id AND s.item_code = iss.item_code
ON CONFLICT (organization_id, item_code) 
DO UPDATE SET 
  item_name = EXCLUDED.item_name,
  category_name = EXCLUDED.category_name,
  current_qty = EXCLUDED.current_qty,
  calculated_qty = EXCLUDED.calculated_qty,
  total_grn_qty = EXCLUDED.total_grn_qty,
  total_issued_qty = EXCLUDED.total_issued_qty,
  last_transaction_date = EXCLUDED.last_transaction_date,
  last_updated = now();