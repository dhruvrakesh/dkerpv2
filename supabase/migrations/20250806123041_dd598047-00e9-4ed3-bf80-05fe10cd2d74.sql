-- COMPREHENSIVE STOCK CONSOLIDATION MIGRATION - FIXED
-- Step 1: Drop existing function first
DROP FUNCTION IF EXISTS dkegl_get_comprehensive_stock_summary(uuid);

-- Step 2: Consolidate all stock records under 'main_warehouse' location
DO $$
BEGIN
  -- Create temporary table if it doesn't exist
  CREATE TEMP TABLE IF NOT EXISTS temp_consolidated_stock AS
  SELECT 
    organization_id,
    item_code,
    'main_warehouse' as location,
    SUM(current_qty) as current_qty,
    AVG(unit_cost) as unit_cost,
    MAX(last_transaction_date) as last_transaction_date,
    now() as last_updated
  FROM dkegl_stock
  GROUP BY organization_id, item_code;

  -- Delete all existing stock records
  DELETE FROM dkegl_stock;

  -- Insert consolidated records
  INSERT INTO dkegl_stock (organization_id, item_code, location, current_qty, unit_cost, last_transaction_date, last_updated)
  SELECT * FROM temp_consolidated_stock;
END $$;

-- Step 3: Add unique constraint to prevent future duplicates (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'dkegl_stock_org_item_location_unique'
  ) THEN
    ALTER TABLE dkegl_stock 
    ADD CONSTRAINT dkegl_stock_org_item_location_unique 
    UNIQUE (organization_id, item_code, location);
  END IF;
END $$;

-- Step 4: Create comprehensive stock calculation function with correct signature
CREATE OR REPLACE FUNCTION dkegl_get_comprehensive_stock_summary(_org_id uuid)
RETURNS TABLE(
  item_code text,
  item_name text,
  category_name text,
  uom text,
  opening_qty numeric,
  total_grn_qty numeric,
  total_issued_qty numeric,
  current_qty numeric,
  calculated_qty numeric,
  variance_qty numeric,
  unit_cost numeric,
  total_value numeric,
  last_transaction_date date,
  reorder_level numeric,
  reorder_quantity numeric,
  days_since_last_movement integer,
  stock_status text,
  location text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH opening_stock AS (
    SELECT 
      os.item_code,
      COALESCE(SUM(os.opening_qty), 0) as opening_qty
    FROM dkegl_opening_stock os
    WHERE os.organization_id = _org_id
    GROUP BY os.item_code
  ),
  grn_totals AS (
    SELECT 
      g.item_code,
      COALESCE(SUM(g.qty_received), 0) as total_grn_qty
    FROM dkegl_grn_log g
    WHERE g.organization_id = _org_id
    GROUP BY g.item_code
  ),
  issue_totals AS (
    SELECT 
      i.item_code,
      COALESCE(SUM(i.qty_issued), 0) as total_issued_qty
    FROM dkegl_issue_log i
    WHERE i.organization_id = _org_id
    GROUP BY i.item_code
  ),
  calculated_stock AS (
    SELECT 
      COALESCE(os.item_code, gt.item_code, it.item_code) as item_code,
      COALESCE(os.opening_qty, 0) as opening_qty,
      COALESCE(gt.total_grn_qty, 0) as total_grn_qty,
      COALESCE(it.total_issued_qty, 0) as total_issued_qty,
      -- Correct calculation: Opening + GRN - Issues
      (COALESCE(os.opening_qty, 0) + COALESCE(gt.total_grn_qty, 0) - COALESCE(it.total_issued_qty, 0)) as calculated_qty
    FROM opening_stock os
    FULL OUTER JOIN grn_totals gt ON os.item_code = gt.item_code
    FULL OUTER JOIN issue_totals it ON COALESCE(os.item_code, gt.item_code) = it.item_code
  )
  SELECT 
    cs.item_code,
    COALESCE(im.item_name, cs.item_code) as item_name,
    COALESCE(cat.category_name, 'Uncategorized') as category_name,
    COALESCE(im.uom, 'PCS') as uom,
    cs.opening_qty,
    cs.total_grn_qty,
    cs.total_issued_qty,
    COALESCE(s.current_qty, 0) as current_qty,
    cs.calculated_qty,
    -- Variance between current stock table and calculated
    (COALESCE(s.current_qty, 0) - cs.calculated_qty) as variance_qty,
    COALESCE(s.unit_cost, 0) as unit_cost,
    (cs.calculated_qty * COALESCE(s.unit_cost, 0)) as total_value,
    s.last_transaction_date,
    COALESCE(im.reorder_level, 0) as reorder_level,
    COALESCE(im.reorder_quantity, 0) as reorder_quantity,
    CASE 
      WHEN s.last_transaction_date IS NULL THEN 999
      ELSE EXTRACT(DAY FROM CURRENT_DATE - s.last_transaction_date)::integer
    END as days_since_last_movement,
    CASE 
      WHEN cs.calculated_qty <= 0 THEN 'Out of Stock'
      WHEN cs.calculated_qty <= COALESCE(im.reorder_level, 0) THEN 'Low Stock'
      ELSE 'In Stock'
    END as stock_status,
    COALESCE(s.location, 'main_warehouse') as location
  FROM calculated_stock cs
  LEFT JOIN dkegl_item_master im ON cs.item_code = im.item_code AND im.organization_id = _org_id
  LEFT JOIN dkegl_categories cat ON im.category_id = cat.id
  LEFT JOIN dkegl_stock s ON cs.item_code = s.item_code AND s.organization_id = _org_id
  WHERE cs.calculated_qty != 0 OR COALESCE(s.current_qty, 0) != 0
  ORDER BY cs.item_code;
END;
$$;

-- Step 5: Create stock reconciliation function
CREATE OR REPLACE FUNCTION dkegl_reconcile_stock_data(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reconciled_count integer := 0;
  total_items integer := 0;
  reconciliation_summary jsonb;
BEGIN
  -- Calculate correct stock for all items and update the stock table
  WITH calculated_stock AS (
    SELECT 
      item_code,
      (
        COALESCE((SELECT SUM(opening_qty) FROM dkegl_opening_stock WHERE organization_id = _org_id AND item_code = all_items.item_code), 0) +
        COALESCE((SELECT SUM(qty_received) FROM dkegl_grn_log WHERE organization_id = _org_id AND item_code = all_items.item_code), 0) -
        COALESCE((SELECT SUM(qty_issued) FROM dkegl_issue_log WHERE organization_id = _org_id AND item_code = all_items.item_code), 0)
      ) as calculated_qty,
      GREATEST(
        COALESCE((SELECT MAX(date) FROM dkegl_grn_log WHERE organization_id = _org_id AND item_code = all_items.item_code), '1900-01-01'::date),
        COALESCE((SELECT MAX(date) FROM dkegl_issue_log WHERE organization_id = _org_id AND item_code = all_items.item_code), '1900-01-01'::date)
      ) as last_transaction_date
    FROM (
      SELECT DISTINCT item_code FROM dkegl_opening_stock WHERE organization_id = _org_id
      UNION
      SELECT DISTINCT item_code FROM dkegl_grn_log WHERE organization_id = _org_id
      UNION  
      SELECT DISTINCT item_code FROM dkegl_issue_log WHERE organization_id = _org_id
    ) all_items
  )
  UPDATE dkegl_stock 
  SET 
    current_qty = calculated_stock.calculated_qty,
    last_transaction_date = calculated_stock.last_transaction_date,
    last_updated = now()
  FROM calculated_stock
  WHERE dkegl_stock.organization_id = _org_id 
    AND dkegl_stock.item_code = calculated_stock.item_code;

  GET DIAGNOSTICS reconciled_count = ROW_COUNT;

  -- Insert missing stock records
  INSERT INTO dkegl_stock (organization_id, item_code, location, current_qty, last_transaction_date, last_updated)
  SELECT 
    _org_id,
    cs.item_code,
    'main_warehouse',
    cs.calculated_qty,
    cs.last_transaction_date,
    now()
  FROM (
    SELECT 
      item_code,
      (
        COALESCE((SELECT SUM(opening_qty) FROM dkegl_opening_stock WHERE organization_id = _org_id AND item_code = all_items.item_code), 0) +
        COALESCE((SELECT SUM(qty_received) FROM dkegl_grn_log WHERE organization_id = _org_id AND item_code = all_items.item_code), 0) -
        COALESCE((SELECT SUM(qty_issued) FROM dkegl_issue_log WHERE organization_id = _org_id AND item_code = all_items.item_code), 0)
      ) as calculated_qty,
      GREATEST(
        COALESCE((SELECT MAX(date) FROM dkegl_grn_log WHERE organization_id = _org_id AND item_code = all_items.item_code), '1900-01-01'::date),
        COALESCE((SELECT MAX(date) FROM dkegl_issue_log WHERE organization_id = _org_id AND item_code = all_items.item_code), '1900-01-01'::date)
      ) as last_transaction_date
    FROM (
      SELECT DISTINCT item_code FROM dkegl_opening_stock WHERE organization_id = _org_id
      UNION
      SELECT DISTINCT item_code FROM dkegl_grn_log WHERE organization_id = _org_id
      UNION  
      SELECT DISTINCT item_code FROM dkegl_issue_log WHERE organization_id = _org_id
    ) all_items
  ) cs
  WHERE NOT EXISTS (
    SELECT 1 FROM dkegl_stock 
    WHERE organization_id = _org_id AND item_code = cs.item_code
  );

  SELECT COUNT(DISTINCT item_code) INTO total_items
  FROM (
    SELECT item_code FROM dkegl_opening_stock WHERE organization_id = _org_id
    UNION
    SELECT item_code FROM dkegl_grn_log WHERE organization_id = _org_id
    UNION  
    SELECT item_code FROM dkegl_issue_log WHERE organization_id = _org_id
  ) all_items;

  reconciliation_summary := jsonb_build_object(
    'success', true,
    'reconciled_items', reconciled_count,
    'total_items', total_items,
    'consolidated_location', 'main_warehouse',
    'calculation_formula', 'Opening Stock + GRN Receipts - Issues = Current Stock',
    'reconciliation_timestamp', now()
  );

  RETURN reconciliation_summary;
END;
$$;