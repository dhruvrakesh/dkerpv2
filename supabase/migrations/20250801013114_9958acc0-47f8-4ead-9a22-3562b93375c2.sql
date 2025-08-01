-- Comprehensive Stock Data Consolidation and Prevention System
-- Phase 1: Fix Function Column Names and Execute Consolidation

-- Drop existing functions to avoid parameter conflicts
DROP FUNCTION IF EXISTS public.dkegl_consolidate_stock_locations(uuid);
DROP FUNCTION IF EXISTS public.dkegl_run_emergency_cleanup(uuid);

-- Create fixed consolidation function with correct column names
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
  -- Consolidate duplicate items across locations (case insensitive)
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
  
  -- Handle negative stocks by zeroing them out
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

-- Create fixed emergency cleanup function
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

-- Phase 2: Fix GRN and Issue Triggers for Case Insensitivity and Location Consistency

-- Drop existing triggers first
DROP TRIGGER IF EXISTS dkegl_update_stock_on_grn_trigger ON dkegl_grn_log;
DROP TRIGGER IF EXISTS dkegl_update_stock_on_issue_trigger ON dkegl_issue_log;

-- Create improved GRN trigger function
CREATE OR REPLACE FUNCTION public.dkegl_update_stock_on_grn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  unit_price NUMERIC := 0;
  normalized_item_code TEXT;
BEGIN
  -- Normalize item code to uppercase for consistency
  normalized_item_code := UPPER(NEW.item_code);
  
  -- Calculate unit price if total amount provided
  IF NEW.total_amount > 0 AND NEW.qty_received > 0 THEN
    unit_price := NEW.total_amount / NEW.qty_received;
  END IF;

  -- Update stock (always use MAIN-STORE location)
  INSERT INTO dkegl_stock (organization_id, item_code, location, current_qty, unit_cost, last_transaction_date, last_updated)
  VALUES (NEW.organization_id, normalized_item_code, 'MAIN-STORE', NEW.qty_received, unit_price, NEW.date, now())
  ON CONFLICT (organization_id, item_code, location)
  DO UPDATE SET 
    current_qty = dkegl_stock.current_qty + NEW.qty_received,
    unit_cost = CASE 
      WHEN unit_price > 0 THEN unit_price 
      ELSE dkegl_stock.unit_cost 
    END,
    last_transaction_date = NEW.date,
    last_updated = now();
  
  -- Check for pricing variance if unit price available
  IF unit_price > 0 THEN
    PERFORM dkegl_detect_pricing_variance(
      NEW.organization_id, 
      normalized_item_code, 
      unit_price, 
      NEW.grn_number
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create improved Issue trigger function
CREATE OR REPLACE FUNCTION public.dkegl_update_stock_on_issue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  normalized_item_code TEXT;
  current_stock NUMERIC;
BEGIN
  -- Normalize item code to uppercase for consistency
  normalized_item_code := UPPER(NEW.item_code);
  
  -- Check current stock before issuing
  SELECT current_qty INTO current_stock
  FROM dkegl_stock
  WHERE organization_id = NEW.organization_id 
    AND item_code = normalized_item_code
    AND location = 'MAIN-STORE';
  
  -- Prevent negative stock
  IF COALESCE(current_stock, 0) < NEW.qty_issued THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', 
      COALESCE(current_stock, 0), NEW.qty_issued;
  END IF;
  
  -- Update stock
  UPDATE dkegl_stock 
  SET 
    current_qty = current_qty - NEW.qty_issued,
    last_transaction_date = NEW.date,
    last_updated = now()
  WHERE organization_id = NEW.organization_id
    AND item_code = normalized_item_code
    AND location = 'MAIN-STORE';
  
  RETURN NEW;
END;
$function$;

-- Create triggers
CREATE TRIGGER dkegl_update_stock_on_grn_trigger
  AFTER INSERT ON dkegl_grn_log
  FOR EACH ROW
  EXECUTE FUNCTION dkegl_update_stock_on_grn();

CREATE TRIGGER dkegl_update_stock_on_issue_trigger
  AFTER INSERT ON dkegl_issue_log
  FOR EACH ROW
  EXECUTE FUNCTION dkegl_update_stock_on_issue();

-- Phase 3: Add Location Constraint and Prevention Measures

-- Add unique constraint to prevent multiple locations per item
DO $$
BEGIN
  -- Check if constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'dkegl_stock_unique_item_location'
  ) THEN
    ALTER TABLE dkegl_stock 
    ADD CONSTRAINT dkegl_stock_unique_item_location 
    UNIQUE (organization_id, item_code, location);
  END IF;
END $$;

-- Create daily consolidation function for automated cleanup
CREATE OR REPLACE FUNCTION public.dkegl_daily_stock_consolidation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  org_record RECORD;
  cleanup_result JSONB;
  total_results JSONB := '{"organizations_processed": 0, "total_corrections": 0}'::jsonb;
  org_count INTEGER := 0;
  total_corrections INTEGER := 0;
BEGIN
  -- Process all organizations
  FOR org_record IN 
    SELECT id, code, name FROM dkegl_organizations WHERE is_active = true
  LOOP
    -- Run cleanup for each organization
    SELECT * INTO cleanup_result 
    FROM dkegl_run_emergency_cleanup(org_record.id);
    
    org_count := org_count + 1;
    total_corrections := total_corrections + 
      COALESCE((cleanup_result->'cleanup_details'->>'total_corrections')::INTEGER, 0);
  END LOOP;
  
  -- Return summary
  RETURN jsonb_build_object(
    'success', true,
    'organizations_processed', org_count,
    'total_corrections', total_corrections,
    'timestamp', now(),
    'message', 'Daily consolidation completed'
  );
END;
$function$;

-- Execute emergency cleanup for DKEGL organization
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