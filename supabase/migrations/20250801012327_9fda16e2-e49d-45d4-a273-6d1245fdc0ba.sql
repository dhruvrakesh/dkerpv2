-- Fix column name bug and execute emergency consolidation
-- Phase 1: Fix the dkegl_consolidate_stock_locations function with correct column names

CREATE OR REPLACE FUNCTION public.dkegl_consolidate_stock_locations(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  consolidated_count INTEGER := 0;
  correction_count INTEGER := 0;
  duplicate_items RECORD;
  total_qty NUMERIC;
  latest_date TIMESTAMP WITH TIME ZONE;
  latest_cost NUMERIC;
  result_data JSONB;
BEGIN
  -- Consolidate duplicate items across locations
  FOR duplicate_items IN 
    SELECT 
      UPPER(item_code) as normalized_item_code,
      COUNT(*) as location_count,
      SUM(current_qty) as total_quantity,
      MAX(last_transaction_date) as latest_transaction_date,
      MAX(unit_cost) as latest_unit_cost
    FROM dkegl_stock 
    WHERE organization_id = _org_id
    GROUP BY UPPER(item_code)
    HAVING COUNT(*) > 1
  LOOP
    -- Get totals for this item across all locations
    total_qty := duplicate_items.total_quantity;
    latest_date := duplicate_items.latest_transaction_date;
    latest_cost := duplicate_items.latest_unit_cost;
    
    -- Create audit entries for all locations being consolidated
    INSERT INTO dkegl_stock_corrections (
      organization_id,
      item_code,
      correction_type,
      old_qty,
      new_qty,
      reason,
      reference_number,
      corrected_by
    )
    SELECT 
      _org_id,
      s.item_code,
      'location_consolidation',
      s.current_qty,
      CASE WHEN s.location = 'MAIN-STORE' THEN total_qty ELSE 0 END,
      'Consolidating duplicate locations into MAIN-STORE',
      'CONSOL-' || extract(epoch from now())::text,
      auth.uid()
    FROM dkegl_stock s
    WHERE s.organization_id = _org_id 
      AND UPPER(s.item_code) = duplicate_items.normalized_item_code;
    
    -- Delete all existing records for this item
    DELETE FROM dkegl_stock 
    WHERE organization_id = _org_id 
      AND UPPER(item_code) = duplicate_items.normalized_item_code;
    
    -- Insert single consolidated record in MAIN-STORE
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
      duplicate_items.normalized_item_code,
      'MAIN-STORE',
      total_qty,
      COALESCE(latest_cost, 0),
      COALESCE(latest_date, CURRENT_DATE),
      NOW()
    );
    
    consolidated_count := consolidated_count + 1;
  END LOOP;
  
  -- Now handle negative stocks by zeroing them out
  FOR duplicate_items IN
    SELECT item_code, current_qty
    FROM dkegl_stock
    WHERE organization_id = _org_id
      AND current_qty < 0
  LOOP
    -- Create correction audit entry
    INSERT INTO dkegl_stock_corrections (
      organization_id,
      item_code,
      correction_type,
      old_qty,
      new_qty,
      reason,
      reference_number,
      corrected_by
    ) VALUES (
      _org_id,
      duplicate_items.item_code,
      'negative_correction',
      duplicate_items.current_qty,
      0,
      'Correcting negative stock to zero',
      'NEG-CORR-' || extract(epoch from now())::text,
      auth.uid()
    );
    
    -- Update stock to zero
    UPDATE dkegl_stock
    SET 
      current_qty = 0,
      last_updated = NOW()
    WHERE organization_id = _org_id
      AND item_code = duplicate_items.item_code;
    
    correction_count := correction_count + 1;
  END LOOP;
  
  -- Return summary
  result_data := jsonb_build_object(
    'success', true,
    'consolidated_items', consolidated_count,
    'negative_corrections', correction_count,
    'total_corrections', consolidated_count + correction_count,
    'timestamp', now()
  );
  
  RETURN result_data;
END;
$function$;

-- Fix the dkegl_run_emergency_cleanup function
CREATE OR REPLACE FUNCTION public.dkegl_run_emergency_cleanup(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cleanup_result JSONB;
  final_stats RECORD;
BEGIN
  -- Execute the consolidation
  SELECT * INTO cleanup_result 
  FROM dkegl_consolidate_stock_locations(_org_id);
  
  -- Get final statistics
  SELECT 
    COUNT(*) as total_items,
    COUNT(*) FILTER (WHERE current_qty < 0) as negative_items,
    COUNT(DISTINCT location) as unique_locations,
    SUM(current_qty * unit_cost) as total_value
  INTO final_stats
  FROM dkegl_stock
  WHERE organization_id = _org_id;
  
  -- Return comprehensive results
  RETURN jsonb_build_object(
    'cleanup_details', cleanup_result,
    'final_stats', jsonb_build_object(
      'total_items', final_stats.total_items,
      'negative_items', final_stats.negative_items,
      'unique_locations', final_stats.unique_locations,
      'total_value', final_stats.total_value
    ),
    'success', true,
    'message', 'Emergency cleanup completed successfully'
  );
END;
$function$;

-- Execute the emergency cleanup for DKEGL organization
DO $$
DECLARE
  dkegl_org_id UUID;
  cleanup_result JSONB;
BEGIN
  -- Get DKEGL organization ID
  SELECT id INTO dkegl_org_id 
  FROM dkegl_organizations 
  WHERE code = 'DKEGL' 
  LIMIT 1;
  
  IF dkegl_org_id IS NOT NULL THEN
    -- Execute emergency cleanup
    SELECT * INTO cleanup_result
    FROM dkegl_run_emergency_cleanup(dkegl_org_id);
    
    RAISE NOTICE 'Emergency cleanup completed: %', cleanup_result;
  ELSE
    RAISE NOTICE 'DKEGL organization not found';
  END IF;
END $$;