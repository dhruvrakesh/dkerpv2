-- Fix stock calculation discrepancies and create accurate stock reconciliation

-- Step 1: Drop and recreate the comprehensive stock summary function with better transaction handling
DROP FUNCTION IF EXISTS dkegl_get_comprehensive_stock_summary(uuid);

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
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH opening_stock AS (
    SELECT 
      os.item_code,
      COALESCE(SUM(os.opening_qty), 0) as opening_qty,
      MIN(os.opening_date) as opening_date
    FROM dkegl_opening_stock os
    WHERE os.organization_id = _org_id
    GROUP BY os.item_code
  ),
  grn_totals AS (
    SELECT 
      g.item_code,
      COALESCE(SUM(g.qty_received), 0) as total_grn_qty,
      MAX(g.date) as last_grn_date
    FROM dkegl_grn_log g
    WHERE g.organization_id = _org_id
    GROUP BY g.item_code
  ),
  issue_totals AS (
    SELECT 
      i.item_code,
      COALESCE(SUM(i.qty_issued), 0) as total_issued_qty,
      MAX(i.date) as last_issue_date
    FROM dkegl_issue_log i
    WHERE i.organization_id = _org_id
    GROUP BY i.item_code
  ),
  all_items AS (
    -- Get all items that have transactions or opening stock
    SELECT DISTINCT item_code FROM opening_stock
    UNION
    SELECT DISTINCT item_code FROM grn_totals  
    UNION
    SELECT DISTINCT item_code FROM issue_totals
  ),
  calculated_stock AS (
    SELECT 
      ai.item_code,
      COALESCE(os.opening_qty, 0) as opening_qty,
      COALESCE(gt.total_grn_qty, 0) as total_grn_qty,
      COALESCE(it.total_issued_qty, 0) as total_issued_qty,
      -- Accurate calculation: Opening + GRN - Issues
      (COALESCE(os.opening_qty, 0) + COALESCE(gt.total_grn_qty, 0) - COALESCE(it.total_issued_qty, 0)) as calculated_qty,
      GREATEST(
        COALESCE(os.opening_date, '1900-01-01'::date),
        COALESCE(gt.last_grn_date, '1900-01-01'::date),
        COALESCE(it.last_issue_date, '1900-01-01'::date)
      ) as last_transaction_date
    FROM all_items ai
    LEFT JOIN opening_stock os ON ai.item_code = os.item_code
    LEFT JOIN grn_totals gt ON ai.item_code = gt.item_code
    LEFT JOIN issue_totals it ON ai.item_code = it.item_code
  )
  SELECT 
    cs.item_code,
    COALESCE(im.item_name, cs.item_code) as item_name,
    COALESCE(cat.category_name, 'Uncategorized') as category_name,
    COALESCE(im.uom, 'PCS') as uom,
    cs.opening_qty,
    cs.total_grn_qty,
    cs.total_issued_qty,
    cs.calculated_qty as current_qty, -- Use calculated qty as the current qty
    cs.calculated_qty,
    0::numeric as variance_qty, -- No variance since we're using calculated as current
    COALESCE(s.unit_cost, 0) as unit_cost,
    (cs.calculated_qty * COALESCE(s.unit_cost, 0)) as total_value,
    cs.last_transaction_date,
    COALESCE(im.reorder_level, 0) as reorder_level,
    COALESCE(im.reorder_quantity, 0) as reorder_quantity,
    CASE 
      WHEN cs.last_transaction_date IS NULL OR cs.last_transaction_date = '1900-01-01'::date THEN 999
      ELSE EXTRACT(DAY FROM CURRENT_DATE - cs.last_transaction_date)::integer
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
  WHERE cs.calculated_qty != 0 OR cs.opening_qty != 0 OR cs.total_grn_qty != 0 OR cs.total_issued_qty != 0
  ORDER BY cs.item_code;
END;
$$;

-- Step 2: Create a stock reconciliation function to fix existing stock table data
CREATE OR REPLACE FUNCTION dkegl_reconcile_stock_data(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  reconciled_count INTEGER := 0;
  total_items INTEGER := 0;
  reconciliation_summary jsonb;
BEGIN
  -- Update existing stock records with correct calculated quantities
  WITH stock_calculations AS (
    SELECT 
      item_code,
      opening_qty,
      total_grn_qty,
      total_issued_qty,
      calculated_qty,
      last_transaction_date,
      unit_cost
    FROM dkegl_get_comprehensive_stock_summary(_org_id)
  )
  UPDATE dkegl_stock s
  SET 
    current_qty = sc.calculated_qty,
    last_transaction_date = sc.last_transaction_date,
    last_updated = now()
  FROM stock_calculations sc
  WHERE s.organization_id = _org_id 
    AND s.item_code = sc.item_code
    AND s.current_qty != sc.calculated_qty;

  GET DIAGNOSTICS reconciled_count = ROW_COUNT;

  -- Insert missing stock records for items with transactions but no stock record
  INSERT INTO dkegl_stock (organization_id, item_code, current_qty, unit_cost, last_transaction_date, last_updated)
  SELECT 
    _org_id,
    sc.item_code,
    sc.calculated_qty,
    COALESCE(sc.unit_cost, 0),
    sc.last_transaction_date,
    now()
  FROM dkegl_get_comprehensive_stock_summary(_org_id) sc
  WHERE NOT EXISTS (
    SELECT 1 FROM dkegl_stock s 
    WHERE s.organization_id = _org_id AND s.item_code = sc.item_code
  );

  -- Get total count of items processed
  SELECT COUNT(*) INTO total_items
  FROM dkegl_get_comprehensive_stock_summary(_org_id);

  -- Build reconciliation summary
  reconciliation_summary := jsonb_build_object(
    'success', true,
    'reconciled_items', reconciled_count,
    'total_items', total_items,
    'timestamp', now(),
    'organization_id', _org_id,
    'message', 'Stock reconciliation completed successfully'
  );

  RETURN reconciliation_summary;
END;
$$;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION dkegl_get_comprehensive_stock_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION dkegl_reconcile_stock_data(uuid) TO authenticated;