-- COMPREHENSIVE STOCK CONSOLIDATION MIGRATION
-- Step 1: Consolidate all stock records under 'main_warehouse' location

-- First, create a temporary table to hold consolidated stock data
CREATE TEMP TABLE temp_consolidated_stock AS
SELECT 
  organization_id,
  item_code,
  'main_warehouse' as location,
  SUM(current_qty) as current_qty,
  AVG(unit_cost) as unit_cost, -- Use average unit cost for consolidation
  MAX(last_transaction_date) as last_transaction_date,
  now() as last_updated
FROM dkegl_stock
GROUP BY organization_id, item_code;

-- Delete all existing stock records
DELETE FROM dkegl_stock;

-- Insert consolidated records
INSERT INTO dkegl_stock (organization_id, item_code, location, current_qty, unit_cost, last_transaction_date, last_updated)
SELECT * FROM temp_consolidated_stock;

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE dkegl_stock 
ADD CONSTRAINT dkegl_stock_org_item_location_unique 
UNIQUE (organization_id, item_code, location);

-- Step 3: Create comprehensive stock calculation function
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
  WHERE cs.calculated_qty != 0 OR COALESCE(s.current_qty, 0) != 0 -- Only show items with stock
  ORDER BY cs.item_code;
END;
$$;

-- Step 4: Create stock reconciliation function
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
      -- Correct calculation: Opening + GRN - Issues
      (
        COALESCE((SELECT SUM(opening_qty) FROM dkegl_opening_stock WHERE organization_id = _org_id AND item_code = all_items.item_code), 0) +
        COALESCE((SELECT SUM(qty_received) FROM dkegl_grn_log WHERE organization_id = _org_id AND item_code = all_items.item_code), 0) -
        COALESCE((SELECT SUM(qty_issued) FROM dkegl_issue_log WHERE organization_id = _org_id AND item_code = all_items.item_code), 0)
      ) as calculated_qty,
      -- Get latest transaction date
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

  -- Insert missing stock records for items that have transactions but no stock record
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

  -- Get total count of items
  SELECT COUNT(DISTINCT item_code) INTO total_items
  FROM (
    SELECT item_code FROM dkegl_opening_stock WHERE organization_id = _org_id
    UNION
    SELECT item_code FROM dkegl_grn_log WHERE organization_id = _org_id
    UNION  
    SELECT item_code FROM dkegl_issue_log WHERE organization_id = _org_id
  ) all_items;

  -- Create summary
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

-- Step 5: Update the paginated stock function to use consolidated data
CREATE OR REPLACE FUNCTION dkegl_get_paginated_stock(
  _org_id uuid,
  _page integer DEFAULT 1,
  _page_size integer DEFAULT 50,
  _search_term text DEFAULT '',
  _category_filter text DEFAULT 'all',
  _status_filter text DEFAULT 'all',
  _sort_column text DEFAULT 'item_code',
  _sort_direction text DEFAULT 'asc'
)
RETURNS TABLE(
  item_code text,
  item_name text,
  category_name text,
  uom text,
  current_qty numeric,
  unit_cost numeric,
  total_value numeric,
  last_transaction_date date,
  reorder_level numeric,
  reorder_quantity numeric,
  stock_status text,
  location text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _offset integer;
  _limit integer;
BEGIN
  _offset := (_page - 1) * _page_size;
  _limit := _page_size;

  RETURN QUERY
  WITH stock_summary AS (
    SELECT * FROM dkegl_get_comprehensive_stock_summary(_org_id)
  ),
  filtered_stock AS (
    SELECT 
      ss.*,
      COUNT(*) OVER() as total_count
    FROM stock_summary ss
    WHERE 
      (_search_term = '' OR 
       ss.item_code ILIKE '%' || _search_term || '%' OR 
       ss.item_name ILIKE '%' || _search_term || '%')
      AND (_category_filter = 'all' OR ss.category_name = _category_filter)
      AND (_status_filter = 'all' OR ss.stock_status = _status_filter)
  )
  SELECT 
    fs.item_code,
    fs.item_name,
    fs.category_name,
    fs.uom,
    fs.calculated_qty as current_qty, -- Use calculated quantity instead of stock table
    fs.unit_cost,
    fs.total_value,
    fs.last_transaction_date,
    fs.reorder_level,
    fs.reorder_quantity,
    fs.stock_status,
    fs.location,
    fs.total_count
  FROM filtered_stock fs
  ORDER BY 
    CASE WHEN _sort_direction = 'asc' THEN
      CASE _sort_column
        WHEN 'item_code' THEN fs.item_code
        WHEN 'item_name' THEN fs.item_name
        WHEN 'category_name' THEN fs.category_name
        WHEN 'stock_status' THEN fs.stock_status
        ELSE fs.item_code
      END
    END ASC,
    CASE WHEN _sort_direction = 'desc' THEN
      CASE _sort_column
        WHEN 'item_code' THEN fs.item_code
        WHEN 'item_name' THEN fs.item_name
        WHEN 'category_name' THEN fs.category_name
        WHEN 'stock_status' THEN fs.stock_status
        ELSE fs.item_code
      END
    END DESC,
    CASE WHEN _sort_direction = 'asc' AND _sort_column IN ('current_qty', 'unit_cost', 'total_value', 'reorder_level') THEN
      CASE _sort_column
        WHEN 'current_qty' THEN fs.calculated_qty
        WHEN 'unit_cost' THEN fs.unit_cost
        WHEN 'total_value' THEN fs.total_value
        WHEN 'reorder_level' THEN fs.reorder_level
        ELSE 0
      END
    END ASC,
    CASE WHEN _sort_direction = 'desc' AND _sort_column IN ('current_qty', 'unit_cost', 'total_value', 'reorder_level') THEN
      CASE _sort_column
        WHEN 'current_qty' THEN fs.calculated_qty
        WHEN 'unit_cost' THEN fs.unit_cost
        WHEN 'total_value' THEN fs.total_value
        WHEN 'reorder_level' THEN fs.reorder_level
        ELSE 0
      END
    END DESC
  LIMIT _limit OFFSET _offset;
END;
$$;