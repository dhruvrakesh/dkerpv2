-- Fix existing function parameter conflict first
DROP FUNCTION IF EXISTS public.dkegl_reconcile_stock_data(uuid);

-- Complete Stock Management System Overhaul
-- This migration fixes stock calculation discrepancies and implements opening stock integration

-- 1. Create opening stock table if not exists
CREATE TABLE IF NOT EXISTS public.dkegl_opening_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  item_code TEXT NOT NULL,
  opening_qty NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_value NUMERIC GENERATED ALWAYS AS (opening_qty * unit_cost) STORED,
  opening_date DATE NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, item_code, opening_date)
);

-- Enable RLS on opening stock
ALTER TABLE public.dkegl_opening_stock ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for opening stock (drop if exists)
DROP POLICY IF EXISTS "DKEGL organization members can access opening stock" ON public.dkegl_opening_stock;
CREATE POLICY "DKEGL organization members can access opening stock" 
ON public.dkegl_opening_stock 
FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- 2. Create comprehensive stock reconciliation audit table
CREATE TABLE IF NOT EXISTS public.dkegl_stock_reconciliation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  reconciliation_type TEXT NOT NULL, -- 'full', 'item_specific', 'opening_stock_upload'
  items_processed INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  total_value_before NUMERIC DEFAULT 0,
  total_value_after NUMERIC DEFAULT 0,
  reconciliation_summary JSONB DEFAULT '{}',
  triggered_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on reconciliation log
ALTER TABLE public.dkegl_stock_reconciliation_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for reconciliation log (drop if exists)
DROP POLICY IF EXISTS "DKEGL organization members can access reconciliation log" ON public.dkegl_stock_reconciliation_log;
CREATE POLICY "DKEGL organization members can access reconciliation log" 
ON public.dkegl_stock_reconciliation_log 
FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- 3. Create the CORRECT stock reconciliation function that actually UPDATES records
CREATE OR REPLACE FUNCTION public.dkegl_reconcile_stock_data(_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  reconciliation_id UUID;
  items_processed INTEGER := 0;
  items_updated INTEGER := 0;
  total_value_before NUMERIC := 0;
  total_value_after NUMERIC := 0;
  reconciliation_summary JSONB := '{}';
  stock_record RECORD;
  calculated_qty NUMERIC;
  calculated_cost NUMERIC;
  opening_stock_qty NUMERIC;
  opening_stock_date DATE;
BEGIN
  -- Log the start of reconciliation
  INSERT INTO dkegl_stock_reconciliation_log (
    organization_id, reconciliation_type, triggered_by
  ) VALUES (
    _org_id, 'full', auth.uid()
  ) RETURNING id INTO reconciliation_id;

  -- Get total value before reconciliation
  SELECT COALESCE(SUM(current_qty * unit_cost), 0) INTO total_value_before
  FROM dkegl_stock WHERE organization_id = _org_id;

  -- For each item in the organization, recalculate stock
  FOR stock_record IN (
    SELECT DISTINCT item_code 
    FROM (
      SELECT item_code FROM dkegl_grn_log WHERE organization_id = _org_id
      UNION
      SELECT item_code FROM dkegl_issue_log WHERE organization_id = _org_id
      UNION 
      SELECT item_code FROM dkegl_opening_stock WHERE organization_id = _org_id
    ) items
  ) LOOP
    
    items_processed := items_processed + 1;
    
    -- Get opening stock data (latest opening stock entry)
    SELECT opening_qty, opening_date INTO opening_stock_qty, opening_stock_date
    FROM dkegl_opening_stock 
    WHERE organization_id = _org_id 
      AND item_code = stock_record.item_code
    ORDER BY opening_date DESC
    LIMIT 1;
    
    -- Default to zero if no opening stock
    opening_stock_qty := COALESCE(opening_stock_qty, 0);
    opening_stock_date := COALESCE(opening_stock_date, '1900-01-01'::DATE);
    
    -- Calculate total GRN quantity after opening date
    WITH grn_total AS (
      SELECT COALESCE(SUM(qty_received), 0) as total_grn
      FROM dkegl_grn_log 
      WHERE organization_id = _org_id 
        AND item_code = stock_record.item_code
        AND date > opening_stock_date
    ),
    -- Calculate total Issue quantity after opening date  
    issue_total AS (
      SELECT COALESCE(SUM(qty_issued), 0) as total_issued
      FROM dkegl_issue_log 
      WHERE organization_id = _org_id 
        AND item_code = stock_record.item_code
        AND date > opening_stock_date
    ),
    -- Calculate weighted average cost
    cost_calc AS (
      SELECT 
        CASE 
          WHEN SUM(qty_received) > 0 THEN 
            SUM(total_amount) / SUM(qty_received)
          ELSE 0 
        END as avg_cost
      FROM dkegl_grn_log 
      WHERE organization_id = _org_id 
        AND item_code = stock_record.item_code
        AND qty_received > 0
        AND total_amount > 0
    )
    SELECT 
      opening_stock_qty + grn_total.total_grn - issue_total.total_issued,
      COALESCE(cost_calc.avg_cost, 0)
    INTO calculated_qty, calculated_cost
    FROM grn_total, issue_total, cost_calc;
    
    -- Insert or update the stock record with calculated values
    INSERT INTO dkegl_stock (
      organization_id, item_code, current_qty, unit_cost, 
      last_transaction_date, last_updated, location
    ) VALUES (
      _org_id, stock_record.item_code, calculated_qty, calculated_cost,
      CURRENT_DATE, now(), 'main_warehouse'
    )
    ON CONFLICT (organization_id, item_code, location)
    DO UPDATE SET 
      current_qty = EXCLUDED.current_qty,
      unit_cost = CASE 
        WHEN EXCLUDED.unit_cost > 0 THEN EXCLUDED.unit_cost 
        ELSE dkegl_stock.unit_cost 
      END,
      last_transaction_date = EXCLUDED.last_transaction_date,
      last_updated = now();
      
    items_updated := items_updated + 1;
  END LOOP;

  -- Get total value after reconciliation
  SELECT COALESCE(SUM(current_qty * unit_cost), 0) INTO total_value_after
  FROM dkegl_stock WHERE organization_id = _org_id;

  -- Build reconciliation summary
  reconciliation_summary := jsonb_build_object(
    'calculation_method', 'opening_stock + grn_received - issues',
    'reconciliation_date', CURRENT_DATE,
    'opening_stock_considered', true,
    'items_with_opening_stock', (
      SELECT COUNT(*) FROM dkegl_opening_stock WHERE organization_id = _org_id
    ),
    'total_grn_transactions', (
      SELECT COUNT(*) FROM dkegl_grn_log WHERE organization_id = _org_id
    ),
    'total_issue_transactions', (
      SELECT COUNT(*) FROM dkegl_issue_log WHERE organization_id = _org_id
    )
  );

  -- Update reconciliation log
  UPDATE dkegl_stock_reconciliation_log SET 
    items_processed = items_processed,
    items_updated = items_updated,
    total_value_before = total_value_before,
    total_value_after = total_value_after,
    reconciliation_summary = reconciliation_summary
  WHERE id = reconciliation_id;

  -- Return reconciliation result
  RETURN jsonb_build_object(
    'success', true,
    'reconciled_items', items_updated,
    'total_items', items_processed,
    'consolidated_location', 'main_warehouse',
    'calculation_formula', 'opening_stock + grn_received - qty_issued',
    'reconciliation_timestamp', now(),
    'value_change', total_value_after - total_value_before,
    'reconciliation_id', reconciliation_id
  );
END;
$$;

-- 4. Create trigger function for automatic reconciliation when opening stock is updated
CREATE OR REPLACE FUNCTION public.dkegl_trigger_stock_reconciliation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reconcile stock for the affected item when opening stock changes
  PERFORM dkegl_reconcile_stock_data(NEW.organization_id);
  RETURN NEW;
END;
$$;

-- Create trigger on opening stock table
DROP TRIGGER IF EXISTS trigger_opening_stock_reconciliation ON dkegl_opening_stock;
CREATE TRIGGER trigger_opening_stock_reconciliation
  AFTER INSERT OR UPDATE OR DELETE ON dkegl_opening_stock
  FOR EACH ROW 
  EXECUTE FUNCTION dkegl_trigger_stock_reconciliation();