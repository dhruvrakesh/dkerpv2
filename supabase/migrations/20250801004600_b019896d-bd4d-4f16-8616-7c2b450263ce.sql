-- Phase 1: Emergency Data Cleanup - Revised Implementation

-- 1. Create stock corrections audit table
CREATE TABLE IF NOT EXISTS dkegl_stock_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  item_code TEXT NOT NULL,
  old_location TEXT,
  new_location TEXT,
  old_qty NUMERIC,
  new_qty NUMERIC,
  correction_type TEXT NOT NULL, -- 'location_consolidation', 'negative_correction', 'quantity_adjustment'
  reason TEXT,
  reference_number TEXT, -- GRN number for adjustments
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for audit table
ALTER TABLE dkegl_stock_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DKEGL organization members can access stock corrections" 
ON dkegl_stock_corrections FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- 2. Create location consolidation function
CREATE OR REPLACE FUNCTION dkegl_consolidate_stock_locations(_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  consolidation_count INTEGER := 0;
  duplicate_record RECORD;
  main_record RECORD;
  total_qty NUMERIC;
  latest_date DATE;
  latest_cost NUMERIC;
BEGIN
  -- Find items with multiple locations (case-insensitive)
  FOR duplicate_record IN 
    SELECT 
      item_code,
      COUNT(*) as location_count,
      ARRAY_AGG(location ORDER BY location) as locations,
      ARRAY_AGG(current_qty ORDER BY location) as quantities
    FROM dkegl_stock 
    WHERE organization_id = _org_id
    GROUP BY UPPER(item_code)
    HAVING COUNT(*) > 1
  LOOP
    -- Get the record with 'MAIN-STORE' location or first alphabetically
    SELECT * INTO main_record
    FROM dkegl_stock 
    WHERE organization_id = _org_id 
      AND UPPER(item_code) = UPPER(duplicate_record.item_code)
    ORDER BY 
      CASE WHEN location = 'MAIN-STORE' THEN 0 ELSE 1 END,
      location
    LIMIT 1;
    
    -- Calculate totals from all locations
    SELECT 
      SUM(current_qty),
      MAX(last_transaction_date),
      AVG(unit_cost) -- Use average cost
    INTO total_qty, latest_date, latest_cost
    FROM dkegl_stock 
    WHERE organization_id = _org_id 
      AND UPPER(item_code) = UPPER(duplicate_record.item_code);
    
    -- Log all consolidations
    INSERT INTO dkegl_stock_corrections (
      organization_id, item_code, old_location, new_location, 
      old_qty, new_qty, correction_type, reason, created_by
    )
    SELECT 
      _org_id, s.item_code, s.location, 'MAIN-STORE',
      s.current_qty, total_qty, 'location_consolidation',
      'Consolidating duplicate locations: ' || array_to_string(duplicate_record.locations, ', '),
      auth.uid()
    FROM dkegl_stock s
    WHERE s.organization_id = _org_id 
      AND UPPER(s.item_code) = UPPER(duplicate_record.item_code);
    
    -- Delete all records for this item
    DELETE FROM dkegl_stock 
    WHERE organization_id = _org_id 
      AND UPPER(item_code) = UPPER(duplicate_record.item_code);
    
    -- Insert consolidated record
    INSERT INTO dkegl_stock (
      organization_id, item_code, location, current_qty, 
      unit_cost, last_transaction_date, last_updated
    ) VALUES (
      _org_id, duplicate_record.item_code, 'MAIN-STORE', total_qty,
      COALESCE(latest_cost, 0), latest_date, NOW()
    );
    
    consolidation_count := consolidation_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'consolidated_items', consolidation_count,
    'message', format('Successfully consolidated %s items', consolidation_count)
  );
END;
$$;

-- 3. Create negative stock correction function
CREATE OR REPLACE FUNCTION dkegl_correct_negative_stocks(_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  negative_record RECORD;
  correction_count INTEGER := 0;
  adjustment_grn_number TEXT;
BEGIN
  -- Process all negative stocks
  FOR negative_record IN 
    SELECT item_code, location, current_qty, unit_cost
    FROM dkegl_stock 
    WHERE organization_id = _org_id AND current_qty < 0
  LOOP
    -- Generate adjustment GRN number
    adjustment_grn_number := 'ADJ-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') || '-' || LEFT(negative_record.item_code, 5);
    
    -- Create adjustment GRN entry
    INSERT INTO dkegl_grn_log (
      organization_id, grn_number, item_code, date, qty_received,
      unit_rate, total_amount, supplier_name, uom, remarks, created_by
    ) VALUES (
      _org_id, adjustment_grn_number, negative_record.item_code, CURRENT_DATE,
      ABS(negative_record.current_qty), -- Positive adjustment quantity
      COALESCE(negative_record.unit_cost, 0),
      ABS(negative_record.current_qty) * COALESCE(negative_record.unit_cost, 0),
      'SYSTEM ADJUSTMENT', 'PCS',
      format('Stock correction for negative balance: %s', negative_record.current_qty),
      auth.uid()
    );
    
    -- Log the correction
    INSERT INTO dkegl_stock_corrections (
      organization_id, item_code, old_location, new_location,
      old_qty, new_qty, correction_type, reason, reference_number, created_by
    ) VALUES (
      _org_id, negative_record.item_code, negative_record.location, negative_record.location,
      negative_record.current_qty, 0, 'negative_correction',
      format('Corrected negative stock from %s to 0', negative_record.current_qty),
      adjustment_grn_number, auth.uid()
    );
    
    -- Set stock to zero
    UPDATE dkegl_stock 
    SET current_qty = 0, last_updated = NOW()
    WHERE organization_id = _org_id 
      AND item_code = negative_record.item_code 
      AND location = negative_record.location;
    
    correction_count := correction_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'corrected_items', correction_count,
    'message', format('Successfully corrected %s negative stock items', correction_count)
  );
END;
$$;

-- 4. Enhanced stock validation trigger (replace existing)
CREATE OR REPLACE FUNCTION dkegl_update_stock_on_issue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_stock_qty NUMERIC := 0;
  item_reorder_level NUMERIC := 0;
BEGIN
  -- Get current stock quantity
  SELECT COALESCE(current_qty, 0) INTO current_stock_qty
  FROM dkegl_stock 
  WHERE organization_id = NEW.organization_id 
    AND UPPER(item_code) = UPPER(NEW.item_code);
  
  -- Check for sufficient stock (unless emergency override)
  IF current_stock_qty < NEW.qty_issued AND NEW.purpose != 'EMERGENCY_OVERRIDE' THEN
    RAISE EXCEPTION 'Insufficient stock for item %. Available: %, Requested: %. Use purpose "EMERGENCY_OVERRIDE" to override.',
      NEW.item_code, current_stock_qty, NEW.qty_issued;
  END IF;
  
  -- Update stock (case-insensitive item code matching)
  UPDATE dkegl_stock 
  SET 
    current_qty = current_qty - NEW.qty_issued,
    last_transaction_date = NEW.date,
    last_updated = now()
  WHERE organization_id = NEW.organization_id 
    AND UPPER(item_code) = UPPER(NEW.item_code);
  
  -- Check for low stock alert
  SELECT COALESCE(reorder_level, 0) INTO item_reorder_level
  FROM dkegl_item_master 
  WHERE organization_id = NEW.organization_id 
    AND UPPER(item_code) = UPPER(NEW.item_code);
    
  IF (current_stock_qty - NEW.qty_issued) <= item_reorder_level AND item_reorder_level > 0 THEN
    -- Log low stock warning
    INSERT INTO dkegl_error_log (
      organization_id, user_id, error_type, error_message, severity, context
    ) VALUES (
      NEW.organization_id, auth.uid(), 'LOW_STOCK_WARNING',
      format('Item %s stock level (%s) is at or below reorder level (%s)', 
        NEW.item_code, (current_stock_qty - NEW.qty_issued), item_reorder_level),
      'medium',
      jsonb_build_object('item_code', NEW.item_code, 'current_qty', (current_stock_qty - NEW.qty_issued), 'reorder_level', item_reorder_level)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Add case-insensitive functional index
CREATE INDEX IF NOT EXISTS idx_dkegl_stock_item_code_upper 
ON dkegl_stock (organization_id, UPPER(item_code), location);

CREATE INDEX IF NOT EXISTS idx_dkegl_item_master_code_upper 
ON dkegl_item_master (organization_id, UPPER(item_code));

-- 6. Create stock reconciliation summary function
CREATE OR REPLACE FUNCTION dkegl_get_stock_reconciliation_summary(_org_id UUID)
RETURNS TABLE(
  summary_type TEXT,
  item_count INTEGER,
  total_value NUMERIC,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Negative stocks summary
  RETURN QUERY
  SELECT 
    'Negative Stocks'::TEXT,
    COUNT(*)::INTEGER,
    SUM(current_qty * unit_cost)::NUMERIC,
    jsonb_agg(jsonb_build_object(
      'item_code', item_code,
      'location', location,
      'qty', current_qty,
      'value', current_qty * unit_cost
    ))
  FROM dkegl_stock
  WHERE organization_id = _org_id AND current_qty < 0;
  
  -- Duplicate locations summary  
  RETURN QUERY
  SELECT 
    'Duplicate Locations'::TEXT,
    COUNT(DISTINCT item_code)::INTEGER,
    SUM(current_qty * unit_cost)::NUMERIC,
    jsonb_agg(jsonb_build_object(
      'item_code', item_code,
      'locations', location_list,
      'total_qty', total_qty
    ))
  FROM (
    SELECT 
      item_code,
      ARRAY_AGG(location) as location_list,
      SUM(current_qty) as total_qty
    FROM dkegl_stock 
    WHERE organization_id = _org_id
    GROUP BY UPPER(item_code), item_code
    HAVING COUNT(*) > 1
  ) duplicates;
  
  -- Zero stock items
  RETURN QUERY
  SELECT 
    'Zero Stock Items'::TEXT,
    COUNT(*)::INTEGER,
    0::NUMERIC,
    jsonb_agg(jsonb_build_object(
      'item_code', item_code,
      'location', location,
      'last_transaction', last_transaction_date
    ))
  FROM dkegl_stock
  WHERE organization_id = _org_id AND current_qty = 0;
END;
$$;

-- 7. Master cleanup execution function
CREATE OR REPLACE FUNCTION dkegl_run_emergency_cleanup(_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  consolidation_result JSONB;
  correction_result JSONB;
  final_result JSONB;
BEGIN
  -- Step 1: Consolidate duplicate locations
  SELECT dkegl_consolidate_stock_locations(_org_id) INTO consolidation_result;
  
  -- Step 2: Correct negative stocks
  SELECT dkegl_correct_negative_stocks(_org_id) INTO correction_result;
  
  -- Step 3: Create summary
  final_result := jsonb_build_object(
    'success', true,
    'cleanup_completed_at', NOW(),
    'organization_id', _org_id,
    'consolidation', consolidation_result,
    'correction', correction_result,
    'message', 'Emergency data cleanup completed successfully'
  );
  
  -- Log the cleanup completion
  INSERT INTO dkegl_audit_log (
    organization_id, table_name, action, new_values, user_id
  ) VALUES (
    _org_id, 'dkegl_stock', 'EMERGENCY_CLEANUP', final_result, auth.uid()
  );
  
  RETURN final_result;
END;
$$;