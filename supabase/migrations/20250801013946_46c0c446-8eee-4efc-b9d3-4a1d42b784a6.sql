-- Fix Migration: Correct Column Names and Execute Consolidation
-- Drop existing faulty functions
DROP FUNCTION IF EXISTS dkegl_consolidate_stock_locations(uuid);
DROP FUNCTION IF EXISTS dkegl_run_emergency_cleanup(uuid);

-- Recreate consolidation function with correct column names
CREATE OR REPLACE FUNCTION dkegl_consolidate_stock_locations(_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  consolidated_count INTEGER := 0;
  correction_count INTEGER := 0;
  item_record RECORD;
  total_qty NUMERIC;
  main_stock_id UUID;
  correction_id UUID;
BEGIN
  -- Process each item that has multiple locations
  FOR item_record IN 
    SELECT 
      s.item_code,
      SUM(s.current_qty) as total_quantity,
      COUNT(*) as location_count,
      MAX(s.last_transaction_date) as latest_date,
      AVG(s.unit_cost) as avg_cost
    FROM dkegl_stock s
    WHERE s.organization_id = _org_id
    GROUP BY s.item_code
    HAVING COUNT(*) > 1 OR MIN(LOWER(s.location)) != 'main-store'
  LOOP
    total_qty := item_record.total_quantity;
    
    -- Create or update main store record
    INSERT INTO dkegl_stock (
      organization_id, item_code, location, current_qty, 
      unit_cost, last_transaction_date, last_updated
    ) VALUES (
      _org_id, UPPER(item_record.item_code), 'MAIN-STORE', 
      total_qty, item_record.avg_cost, item_record.latest_date, NOW()
    )
    ON CONFLICT (organization_id, item_code, location)
    DO UPDATE SET 
      current_qty = total_qty,
      unit_cost = item_record.avg_cost,
      last_transaction_date = item_record.latest_date,
      last_updated = NOW()
    RETURNING id INTO main_stock_id;
    
    -- Log consolidation correction
    INSERT INTO dkegl_stock_corrections (
      organization_id, item_code, old_qty, new_qty, 
      correction_type, correction_reason, created_by
    ) VALUES (
      _org_id, UPPER(item_record.item_code), 0, total_qty,
      'consolidation', 'Location consolidation to MAIN-STORE', auth.uid()
    ) RETURNING id INTO correction_id;
    
    -- Delete all other location records for this item
    DELETE FROM dkegl_stock 
    WHERE organization_id = _org_id 
      AND item_code = item_record.item_code 
      AND id != main_stock_id;
    
    consolidated_count := consolidated_count + 1;
  END LOOP;
  
  -- Fix negative stocks
  FOR item_record IN 
    SELECT s.id, s.item_code, s.current_qty
    FROM dkegl_stock s
    WHERE s.organization_id = _org_id AND s.current_qty < 0
  LOOP
    -- Log negative stock correction
    INSERT INTO dkegl_stock_corrections (
      organization_id, item_code, old_qty, new_qty,
      correction_type, correction_reason, created_by
    ) VALUES (
      _org_id, UPPER(item_record.item_code), item_record.current_qty, 0,
      'negative_fix', 'Negative stock corrected to zero', auth.uid()
    );
    
    -- Set to zero
    UPDATE dkegl_stock 
    SET current_qty = 0, last_updated = NOW()
    WHERE id = item_record.id;
    
    correction_count := correction_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'consolidated_items', consolidated_count,
    'negative_corrections', correction_count,
    'message', 'Stock consolidation completed successfully'
  );
END;
$$;

-- Recreate emergency cleanup function
CREATE OR REPLACE FUNCTION dkegl_run_emergency_cleanup(_org_code TEXT DEFAULT 'DKEGL')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org_id UUID;
  result JSONB;
BEGIN
  -- Get organization ID
  SELECT id INTO org_id FROM dkegl_organizations WHERE code = _org_code;
  
  IF org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Run consolidation
  SELECT dkegl_consolidate_stock_locations(org_id) INTO result;
  
  RETURN result;
END;
$$;

-- Add unique constraint to prevent future fragmentation
ALTER TABLE dkegl_stock 
ADD CONSTRAINT dkegl_stock_org_item_location_unique 
UNIQUE (organization_id, item_code, location);

-- Update GRN trigger to use proper location and case handling
CREATE OR REPLACE FUNCTION dkegl_update_stock_on_grn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  unit_price NUMERIC := 0;
BEGIN
  -- Calculate unit price if total amount provided
  IF NEW.total_amount > 0 AND NEW.qty_received > 0 THEN
    unit_price := NEW.total_amount / NEW.qty_received;
  END IF;

  -- Update stock with proper case handling and fixed location
  INSERT INTO dkegl_stock (organization_id, item_code, location, current_qty, unit_cost, last_transaction_date, last_updated)
  VALUES (NEW.organization_id, UPPER(NEW.item_code), 'MAIN-STORE', NEW.qty_received, unit_price, NEW.date, now())
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
      UPPER(NEW.item_code), 
      unit_price, 
      NEW.grn_number
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update Issue trigger to use proper location and case handling  
CREATE OR REPLACE FUNCTION dkegl_update_stock_on_issue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update stock with proper case handling and fixed location
  UPDATE dkegl_stock 
  SET 
    current_qty = current_qty - NEW.qty_issued,
    last_transaction_date = NEW.date,
    last_updated = now()
  WHERE organization_id = NEW.organization_id 
    AND item_code = UPPER(NEW.item_code) 
    AND location = 'MAIN-STORE';
  
  RETURN NEW;
END;
$$;

-- EXECUTE CONSOLIDATION IMMEDIATELY for DKEGL organization
SELECT dkegl_run_emergency_cleanup('DKEGL') as consolidation_result;