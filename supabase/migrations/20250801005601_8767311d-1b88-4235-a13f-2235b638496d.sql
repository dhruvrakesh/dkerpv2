-- Fix Phase 1.1: Critical Bug Fixes

-- 1. Fix the SQL aggregation error in dkegl_consolidate_stock_locations
CREATE OR REPLACE FUNCTION public.dkegl_consolidate_stock_locations(_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  consolidation_count INTEGER := 0;
  item_record RECORD;
  correction_record RECORD;
BEGIN
  -- Process each item that has duplicate locations
  FOR item_record IN
    SELECT 
      item_code,
      COUNT(*) as location_count,
      SUM(current_qty) as total_qty,
      MAX(last_transaction_date) as latest_date,
      MAX(last_updated) as latest_updated
    FROM dkegl_stock 
    WHERE organization_id = _org_id
    GROUP BY item_code
    HAVING COUNT(*) > 1
  LOOP
    -- Create correction audit entries for each location being consolidated
    FOR correction_record IN
      SELECT * FROM dkegl_stock 
      WHERE organization_id = _org_id 
        AND item_code = item_record.item_code
        AND location != 'MAIN-STORE'
    LOOP
      INSERT INTO dkegl_stock_corrections (
        organization_id,
        item_code,
        old_location,
        new_location,
        old_qty,
        new_qty,
        correction_type,
        reason,
        created_by
      ) VALUES (
        _org_id,
        correction_record.item_code,
        correction_record.location,
        'MAIN-STORE',
        correction_record.current_qty,
        item_record.total_qty,
        'location_consolidation',
        'Emergency cleanup: consolidating ' || correction_record.location || ' into MAIN-STORE',
        auth.uid()
      );
    END LOOP;

    -- Update or insert the consolidated record in MAIN-STORE
    INSERT INTO dkegl_stock (
      organization_id,
      item_code,
      location,
      current_qty,
      unit_cost,
      last_transaction_date,
      last_updated
    ) VALUES (
      _org_id,
      item_record.item_code,
      'MAIN-STORE',
      item_record.total_qty,
      (SELECT unit_cost FROM dkegl_stock WHERE organization_id = _org_id AND item_code = item_record.item_code LIMIT 1),
      item_record.latest_date,
      item_record.latest_updated
    )
    ON CONFLICT (organization_id, item_code, location)
    DO UPDATE SET
      current_qty = item_record.total_qty,
      last_transaction_date = item_record.latest_date,
      last_updated = item_record.latest_updated;

    -- Delete all other location records for this item
    DELETE FROM dkegl_stock 
    WHERE organization_id = _org_id 
      AND item_code = item_record.item_code 
      AND location != 'MAIN-STORE';

    consolidation_count := consolidation_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'items_consolidated', consolidation_count,
    'message', 'Location consolidation completed'
  );
END;
$function$;

-- 2. Create missing function: dkegl_get_comprehensive_stock_summary
CREATE OR REPLACE FUNCTION public.dkegl_get_comprehensive_stock_summary(_org_id uuid)
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
   stock_status text,
   days_since_last_movement integer
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    s.item_code,
    COALESCE(im.item_name, s.item_code) as item_name,
    COALESCE(c.category_name, 'Uncategorized') as category_name,
    s.current_qty,
    s.unit_cost,
    s.current_qty * COALESCE(s.unit_cost, 0) as total_value,
    s.last_transaction_date,
    s.location,
    COALESCE(im.reorder_level, 0) as reorder_level,
    CASE 
      WHEN s.current_qty <= 0 THEN 'out_of_stock'
      WHEN s.current_qty <= COALESCE(im.reorder_level, 0) THEN 'low_stock'
      ELSE 'in_stock'
    END as stock_status,
    CASE 
      WHEN s.last_transaction_date IS NULL THEN 999
      ELSE EXTRACT(DAY FROM CURRENT_DATE - s.last_transaction_date)::INTEGER
    END as days_since_last_movement
  FROM dkegl_stock s
  LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
  LEFT JOIN dkegl_categories c ON im.category_id = c.id
  WHERE s.organization_id = _org_id
  ORDER BY s.item_code;
END;
$function$;

-- 3. Create missing function: dkegl_get_stock_analytics_totals
CREATE OR REPLACE FUNCTION public.dkegl_get_stock_analytics_totals(_org_id uuid)
 RETURNS TABLE(
   total_items bigint,
   total_value numeric,
   low_stock_items bigint,
   out_of_stock_items bigint,
   negative_stock_items bigint,
   total_locations bigint,
   last_updated timestamp with time zone
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_items,
    SUM(s.current_qty * COALESCE(s.unit_cost, 0)) as total_value,
    COUNT(*) FILTER (WHERE s.current_qty > 0 AND s.current_qty <= COALESCE(im.reorder_level, 0)) as low_stock_items,
    COUNT(*) FILTER (WHERE s.current_qty = 0) as out_of_stock_items,
    COUNT(*) FILTER (WHERE s.current_qty < 0) as negative_stock_items,
    COUNT(DISTINCT s.location) as total_locations,
    MAX(s.last_updated) as last_updated
  FROM dkegl_stock s
  LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
  WHERE s.organization_id = _org_id;
END;
$function$;

-- 4. Fix dkegl_run_emergency_cleanup function
CREATE OR REPLACE FUNCTION public.dkegl_run_emergency_cleanup(_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  consolidation_result JSONB;
  correction_result JSONB;
  final_result JSONB;
BEGIN
  -- Step 1: Consolidate locations
  SELECT dkegl_consolidate_stock_locations(_org_id) INTO consolidation_result;
  
  -- Step 2: Correct negative stocks
  SELECT dkegl_correct_negative_stocks(_org_id) INTO correction_result;
  
  -- Step 3: Create summary
  final_result := jsonb_build_object(
    'success', true,
    'timestamp', now(),
    'organization_id', _org_id,
    'consolidation', consolidation_result,
    'correction', correction_result,
    'summary', jsonb_build_object(
      'total_items_processed', 
      COALESCE((consolidation_result->>'items_consolidated')::integer, 0) + 
      COALESCE((correction_result->>'items_corrected')::integer, 0),
      'locations_consolidated', consolidation_result->>'items_consolidated',
      'negative_stocks_corrected', correction_result->>'items_corrected'
    )
  );
  
  -- Log the cleanup execution
  INSERT INTO dkegl_stock_corrections (
    organization_id,
    item_code,
    correction_type,
    reason,
    created_by
  ) VALUES (
    _org_id,
    'EMERGENCY_CLEANUP_LOG',
    'emergency_cleanup_execution',
    'Emergency cleanup executed: ' || final_result::text,
    auth.uid()
  );
  
  RETURN final_result;
END;
$function$;

-- 5. Create helper function for stock reconciliation status
CREATE OR REPLACE FUNCTION public.dkegl_get_stock_reconciliation_status(_org_id uuid)
 RETURNS TABLE(
   metric_name text,
   metric_value bigint,
   severity text,
   description text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH stock_metrics AS (
    SELECT 
      COUNT(*) FILTER (WHERE current_qty < 0) as negative_count,
      COUNT(DISTINCT item_code) - COUNT(*) as duplicate_location_count,
      COUNT(*) FILTER (WHERE current_qty = 0) as zero_stock_count,
      COUNT(DISTINCT location) as location_count
    FROM dkegl_stock
    WHERE organization_id = _org_id
  )
  SELECT 'negative_stocks'::text, sm.negative_count, 
         CASE WHEN sm.negative_count > 0 THEN 'critical' ELSE 'normal' END::text,
         'Items with negative stock quantities'::text
  FROM stock_metrics sm
  UNION ALL
  SELECT 'duplicate_locations'::text, sm.duplicate_location_count,
         CASE WHEN sm.duplicate_location_count > 0 THEN 'high' ELSE 'normal' END::text,
         'Items with multiple location entries'::text
  FROM stock_metrics sm
  UNION ALL
  SELECT 'zero_stocks'::text, sm.zero_stock_count,
         CASE WHEN sm.zero_stock_count > 50 THEN 'medium' ELSE 'low' END::text,
         'Items with zero stock'::text
  FROM stock_metrics sm
  UNION ALL
  SELECT 'total_locations'::text, sm.location_count,
         CASE WHEN sm.location_count > 3 THEN 'medium' ELSE 'normal' END::text,
         'Total distinct storage locations'::text
  FROM stock_metrics sm;
END;
$function$;