-- Fix the comprehensive stock summary function to handle opening stock properly
-- and consolidate items across locations

DROP FUNCTION IF EXISTS dkegl_get_comprehensive_stock_summary(uuid);
DROP FUNCTION IF EXISTS dkegl_get_stock_analytics_totals(uuid);

-- Updated comprehensive stock summary function
CREATE OR REPLACE FUNCTION dkegl_get_comprehensive_stock_summary(_org_id uuid)
RETURNS TABLE(
  item_code text,
  item_name text,
  category_name text,
  current_qty numeric,
  unit_cost numeric,
  total_value numeric,
  last_transaction_date date,
  location text,
  reorder_level numeric,
  is_low_stock boolean,
  opening_qty numeric,
  total_grn_qty numeric,
  total_issued_qty numeric,
  calculated_qty numeric,
  variance_qty numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH stock_aggregated AS (
    -- Aggregate stock data by item_code, consolidating all locations
    SELECT 
      s.item_code,
      SUM(s.current_qty) as total_current_qty,
      AVG(s.unit_cost) as avg_unit_cost,
      SUM(s.opening_qty) as total_opening_qty,
      MAX(s.last_transaction_date) as max_last_transaction_date,
      MAX(s.reorder_level) as max_reorder_level,
      string_agg(DISTINCT s.location, ', ' ORDER BY s.location) as consolidated_locations
    FROM dkegl_stock s
    WHERE s.organization_id = _org_id
    GROUP BY s.item_code
  ),
  grn_totals AS (
    -- Sum all GRN quantities by item
    SELECT 
      g.item_code,
      SUM(g.qty_received) as total_grn_qty
    FROM dkegl_grn_log g
    WHERE g.organization_id = _org_id
    GROUP BY g.item_code
  ),
  issue_totals AS (
    -- Sum all issue quantities by item
    SELECT 
      i.item_code,
      SUM(i.qty_issued) as total_issued_qty
    FROM dkegl_issue_log i
    WHERE i.organization_id = _org_id
    GROUP BY i.item_code
  )
  SELECT 
    sa.item_code,
    COALESCE(im.item_name, sa.item_code) as item_name,
    COALESCE(c.category_name, 'Uncategorized') as category_name,
    COALESCE(sa.total_current_qty, 0) as current_qty,
    COALESCE(sa.avg_unit_cost, 0) as unit_cost,
    COALESCE(sa.total_current_qty, 0) * COALESCE(sa.avg_unit_cost, 0) as total_value,
    sa.max_last_transaction_date as last_transaction_date,
    COALESCE(sa.consolidated_locations, 'MAIN-STORE') as location,
    COALESCE(sa.max_reorder_level, 0) as reorder_level,
    COALESCE(sa.total_current_qty, 0) <= COALESCE(sa.max_reorder_level, 0) as is_low_stock,
    COALESCE(sa.total_opening_qty, 0) as opening_qty,
    COALESCE(gt.total_grn_qty, 0) as total_grn_qty,
    COALESCE(it.total_issued_qty, 0) as total_issued_qty,
    COALESCE(sa.total_opening_qty, 0) + COALESCE(gt.total_grn_qty, 0) - COALESCE(it.total_issued_qty, 0) as calculated_qty,
    COALESCE(sa.total_current_qty, 0) - (COALESCE(sa.total_opening_qty, 0) + COALESCE(gt.total_grn_qty, 0) - COALESCE(it.total_issued_qty, 0)) as variance_qty
  FROM stock_aggregated sa
  LEFT JOIN dkegl_item_master im ON sa.item_code = im.item_code AND im.organization_id = _org_id
  LEFT JOIN dkegl_categories c ON im.category_id = c.id
  LEFT JOIN grn_totals gt ON sa.item_code = gt.item_code
  LEFT JOIN issue_totals it ON sa.item_code = it.item_code
  ORDER BY sa.item_code;
END;
$function$;

-- Updated stock analytics totals function
CREATE OR REPLACE FUNCTION dkegl_get_stock_analytics_totals(_org_id uuid)
RETURNS TABLE(
  total_opening numeric,
  total_grn numeric,
  total_issued numeric,
  total_current numeric,
  total_calculated numeric,
  total_variance numeric,
  total_items bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH summary_data AS (
    SELECT * FROM dkegl_get_comprehensive_stock_summary(_org_id)
  )
  SELECT 
    COALESCE(SUM(sd.opening_qty), 0) as total_opening,
    COALESCE(SUM(sd.total_grn_qty), 0) as total_grn,
    COALESCE(SUM(sd.total_issued_qty), 0) as total_issued,
    COALESCE(SUM(sd.current_qty), 0) as total_current,
    COALESCE(SUM(sd.calculated_qty), 0) as total_calculated,
    COALESCE(SUM(sd.variance_qty), 0) as total_variance,
    COUNT(*) as total_items
  FROM summary_data sd;
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION dkegl_get_comprehensive_stock_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION dkegl_get_stock_analytics_totals(uuid) TO authenticated;

-- Create edge function for stock reconciliation
CREATE OR REPLACE FUNCTION dkegl_reconcile_stock_data(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  reconciliation_result jsonb := '{"success": true, "consolidations": [], "discrepancies": []}';
  consolidation_count integer := 0;
  discrepancy_count integer := 0;
  rec record;
BEGIN
  -- Log the reconciliation start
  INSERT INTO dkegl_audit_log (
    organization_id, user_id, table_name, action, metadata
  ) VALUES (
    _org_id, auth.uid(), 'dkegl_stock', 'reconciliation_start',
    jsonb_build_object('started_at', now())
  );

  -- Consolidate duplicate items across locations
  FOR rec IN 
    SELECT 
      item_code,
      COUNT(*) as location_count,
      SUM(current_qty) as total_qty,
      SUM(opening_qty) as total_opening,
      AVG(unit_cost) as avg_cost,
      MAX(last_transaction_date) as latest_date,
      MAX(reorder_level) as max_reorder
    FROM dkegl_stock 
    WHERE organization_id = _org_id 
    GROUP BY item_code 
    HAVING COUNT(*) > 1
  LOOP
    -- Update the first record with consolidated data
    UPDATE dkegl_stock 
    SET 
      current_qty = rec.total_qty,
      opening_qty = rec.total_opening,
      unit_cost = rec.avg_cost,
      last_transaction_date = rec.latest_date,
      reorder_level = rec.max_reorder,
      location = 'MAIN-STORE',
      last_updated = now()
    WHERE organization_id = _org_id 
      AND item_code = rec.item_code
      AND id = (
        SELECT id FROM dkegl_stock 
        WHERE organization_id = _org_id AND item_code = rec.item_code 
        ORDER BY created_at LIMIT 1
      );

    -- Delete duplicate records
    DELETE FROM dkegl_stock 
    WHERE organization_id = _org_id 
      AND item_code = rec.item_code
      AND id != (
        SELECT id FROM dkegl_stock 
        WHERE organization_id = _org_id AND item_code = rec.item_code 
        ORDER BY created_at LIMIT 1
      );

    consolidation_count := consolidation_count + 1;
    
    -- Add to result
    reconciliation_result := jsonb_set(
      reconciliation_result,
      '{consolidations}',
      (reconciliation_result->'consolidations') || jsonb_build_object(
        'item_code', rec.item_code,
        'locations_merged', rec.location_count,
        'total_qty', rec.total_qty
      )
    );
  END LOOP;

  -- Check for discrepancies in calculated vs current stock
  FOR rec IN 
    SELECT * FROM dkegl_get_comprehensive_stock_summary(_org_id)
    WHERE ABS(variance_qty) > 0.01  -- Allow for minor rounding differences
  LOOP
    discrepancy_count := discrepancy_count + 1;
    
    -- Add to result
    reconciliation_result := jsonb_set(
      reconciliation_result,
      '{discrepancies}',
      (reconciliation_result->'discrepancies') || jsonb_build_object(
        'item_code', rec.item_code,
        'current_qty', rec.current_qty,
        'calculated_qty', rec.calculated_qty,
        'variance', rec.variance_qty
      )
    );
  END LOOP;

  -- Update final result
  reconciliation_result := jsonb_set(reconciliation_result, '{consolidations_count}', to_jsonb(consolidation_count));
  reconciliation_result := jsonb_set(reconciliation_result, '{discrepancies_count}', to_jsonb(discrepancy_count));
  reconciliation_result := jsonb_set(reconciliation_result, '{completed_at}', to_jsonb(now()));

  -- Log the reconciliation completion
  INSERT INTO dkegl_audit_log (
    organization_id, user_id, table_name, action, metadata
  ) VALUES (
    _org_id, auth.uid(), 'dkegl_stock', 'reconciliation_complete',
    reconciliation_result
  );

  RETURN reconciliation_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION dkegl_reconcile_stock_data(uuid) TO authenticated;