-- Phase 1.2: Critical Function Fixes & Emergency Cleanup (Fixed)
-- Drop existing functions first to avoid type conflicts
DROP FUNCTION IF EXISTS public.dkegl_get_comprehensive_stock_summary(uuid);
DROP FUNCTION IF EXISTS public.dkegl_get_stock_analytics_totals(uuid);
DROP FUNCTION IF EXISTS public.dkegl_consolidate_stock_locations(uuid);
DROP FUNCTION IF EXISTS public.dkegl_run_emergency_cleanup(uuid);

-- Fix dkegl_consolidate_stock_locations function
CREATE OR REPLACE FUNCTION public.dkegl_consolidate_stock_locations(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  consolidation_count INTEGER := 0;
  correction_count INTEGER := 0;
  total_corrections NUMERIC := 0;
  result jsonb;
BEGIN
  -- Step 1: Create audit records for location consolidations
  WITH location_consolidation AS (
    SELECT 
      item_code,
      SUM(current_qty) as total_qty,
      MAX(last_transaction_date) as latest_date,
      MAX(unit_cost) as latest_cost,
      COUNT(*) as location_count
    FROM dkegl_stock 
    WHERE organization_id = _org_id
    GROUP BY item_code
    HAVING COUNT(*) > 1
  ),
  consolidation_inserts AS (
    INSERT INTO dkegl_stock_corrections (
      organization_id,
      item_code,
      correction_type,
      old_quantity,
      new_quantity,
      correction_reason,
      reference_number,
      created_by
    )
    SELECT 
      _org_id,
      lc.item_code,
      'location_consolidation',
      0, 
      lc.total_qty,
      'Consolidated from ' || lc.location_count || ' locations into MAIN-STORE',
      'LOC-CONSOL-' || EXTRACT(EPOCH FROM now())::bigint || '-' || ROW_NUMBER() OVER (ORDER BY lc.item_code),
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    FROM location_consolidation lc
    RETURNING 1
  )
  SELECT COUNT(*) INTO consolidation_count FROM consolidation_inserts;
  
  -- Step 2: Consolidate stock by removing duplicates and creating single MAIN-STORE entries
  DELETE FROM dkegl_stock 
  WHERE organization_id = _org_id 
    AND item_code IN (
      SELECT item_code 
      FROM dkegl_stock 
      WHERE organization_id = _org_id 
      GROUP BY item_code 
      HAVING COUNT(*) > 1
    );
  
  -- Step 3: Insert consolidated stock records
  INSERT INTO dkegl_stock (
    organization_id, item_code, location, current_qty, 
    unit_cost, last_transaction_date, last_updated
  )
  SELECT 
    _org_id,
    item_code,
    'MAIN-STORE',
    SUM(current_qty), -- Keep actual total, don't force positive yet
    MAX(unit_cost),
    MAX(last_transaction_date),
    now()
  FROM dkegl_stock 
  WHERE organization_id = _org_id
  GROUP BY item_code
  ON CONFLICT (organization_id, item_code, location) 
  DO UPDATE SET 
    current_qty = EXCLUDED.current_qty,
    unit_cost = EXCLUDED.unit_cost,
    last_transaction_date = EXCLUDED.last_transaction_date,
    last_updated = now();
  
  -- Step 4: Create audit records for negative stock corrections
  WITH negative_corrections AS (
    INSERT INTO dkegl_stock_corrections (
      organization_id,
      item_code,
      correction_type,
      old_quantity,
      new_quantity,
      correction_reason,
      reference_number,
      created_by
    )
    SELECT 
      organization_id,
      item_code,
      'negative_stock_fix',
      current_qty,
      0,
      'Negative stock corrected to zero - requires physical verification',
      'NEG-FIX-' || EXTRACT(EPOCH FROM now())::bigint || '-' || ROW_NUMBER() OVER (ORDER BY item_code),
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    FROM dkegl_stock 
    WHERE organization_id = _org_id AND current_qty < 0
    RETURNING old_quantity
  )
  SELECT COUNT(*), COALESCE(SUM(ABS(old_quantity)), 0) 
  INTO correction_count, total_corrections 
  FROM negative_corrections;
  
  -- Step 5: Set negative stocks to zero
  UPDATE dkegl_stock 
  SET current_qty = 0, last_updated = now()
  WHERE organization_id = _org_id AND current_qty < 0;
  
  -- Return summary
  result := jsonb_build_object(
    'success', true,
    'consolidations_created', consolidation_count,
    'negative_corrections', correction_count,
    'total_correction_value', total_corrections,
    'message', 'Stock consolidation and cleanup completed successfully'
  );
  
  RETURN result;
END;
$function$;

-- Fix dkegl_run_emergency_cleanup function
CREATE OR REPLACE FUNCTION public.dkegl_run_emergency_cleanup(_org_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  org_id uuid;
  consolidation_result jsonb;
  final_result jsonb;
BEGIN
  -- Get organization ID
  IF _org_id IS NULL THEN
    org_id := dkegl_get_current_user_org();
  ELSE
    org_id := _org_id;
  END IF;
  
  IF org_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization ID not found'
    );
  END IF;
  
  -- Execute location consolidation and negative stock fixes
  SELECT dkegl_consolidate_stock_locations(org_id) INTO consolidation_result;
  
  -- Build final result
  final_result := jsonb_build_object(
    'success', true,
    'organization_id', org_id,
    'consolidation_result', consolidation_result,
    'cleanup_completed_at', now(),
    'message', 'Emergency cleanup completed successfully'
  );
  
  RETURN final_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'sqlstate', SQLSTATE
  );
END;
$function$;

-- Create dkegl_get_comprehensive_stock_summary function
CREATE OR REPLACE FUNCTION public.dkegl_get_comprehensive_stock_summary(_org_id uuid)
RETURNS TABLE(
  item_code text,
  item_name text,
  category_name text,
  location text,
  current_qty numeric,
  unit_cost numeric,
  total_value numeric,
  last_transaction_date date,
  stock_status text,
  reorder_level numeric,
  days_of_cover integer
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
    COALESCE(s.location, 'MAIN-STORE') as location,
    s.current_qty,
    s.unit_cost,
    s.current_qty * s.unit_cost as total_value,
    s.last_transaction_date,
    CASE 
      WHEN s.current_qty <= 0 THEN 'OUT_OF_STOCK'
      WHEN s.current_qty <= COALESCE(im.reorder_level, 10) THEN 'LOW_STOCK'
      ELSE 'IN_STOCK'
    END as stock_status,
    COALESCE(im.reorder_level, 10) as reorder_level,
    CASE 
      WHEN s.last_transaction_date IS NULL THEN 999
      ELSE EXTRACT(DAY FROM CURRENT_DATE - s.last_transaction_date)::INTEGER
    END as days_of_cover
  FROM dkegl_stock s
  LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
  LEFT JOIN dkegl_categories c ON im.category_id = c.id
  WHERE s.organization_id = _org_id
  ORDER BY s.item_code;
END;
$function$;

-- Create dkegl_get_stock_analytics_totals function  
CREATE OR REPLACE FUNCTION public.dkegl_get_stock_analytics_totals(_org_id uuid)
RETURNS TABLE(
  total_items bigint,
  total_value numeric,
  out_of_stock_items bigint,
  low_stock_items bigint,
  in_stock_items bigint,
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
    COALESCE(SUM(s.current_qty * s.unit_cost), 0) as total_value,
    COUNT(*) FILTER (WHERE s.current_qty <= 0) as out_of_stock_items,
    COUNT(*) FILTER (WHERE s.current_qty > 0 AND s.current_qty <= COALESCE(im.reorder_level, 10)) as low_stock_items,
    COUNT(*) FILTER (WHERE s.current_qty > COALESCE(im.reorder_level, 10)) as in_stock_items,
    COUNT(*) FILTER (WHERE s.current_qty < 0) as negative_stock_items,
    COUNT(DISTINCT s.location) as total_locations,
    MAX(s.last_updated) as last_updated
  FROM dkegl_stock s
  LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
  WHERE s.organization_id = _org_id;
END;
$function$;

-- Execute emergency cleanup for DKEGL organization
DO $$
DECLARE
  dkegl_org_id uuid;
  cleanup_result jsonb;
BEGIN
  -- Get DKEGL organization ID
  SELECT id INTO dkegl_org_id 
  FROM dkegl_organizations 
  WHERE code = 'DKEGL' 
  LIMIT 1;
  
  IF dkegl_org_id IS NOT NULL THEN
    -- Execute emergency cleanup
    SELECT dkegl_run_emergency_cleanup(dkegl_org_id) INTO cleanup_result;
    
    RAISE NOTICE 'Emergency cleanup completed for DKEGL: %', cleanup_result;
  ELSE
    RAISE NOTICE 'DKEGL organization not found';
  END IF;
END $$;