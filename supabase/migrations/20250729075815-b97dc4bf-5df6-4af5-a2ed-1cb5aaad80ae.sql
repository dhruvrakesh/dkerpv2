-- Add reorder_level column to dkegl_stock table
ALTER TABLE dkegl_stock ADD COLUMN IF NOT EXISTS reorder_level NUMERIC DEFAULT 0;

-- Populate reorder_level from dkegl_item_master where available
UPDATE dkegl_stock 
SET reorder_level = COALESCE(im.reorder_level, 0)
FROM dkegl_item_master im 
WHERE dkegl_stock.organization_id = im.organization_id 
  AND dkegl_stock.item_code = im.item_code
  AND dkegl_stock.reorder_level = 0;

-- Create trigger to sync reorder_level changes from item_master to stock
CREATE OR REPLACE FUNCTION dkegl_sync_reorder_level_to_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update reorder_level in stock when item_master changes
  UPDATE dkegl_stock 
  SET reorder_level = NEW.reorder_level,
      last_updated = now()
  WHERE organization_id = NEW.organization_id 
    AND item_code = NEW.item_code;
  
  RETURN NEW;
END;
$$;

-- Create trigger on item_master updates
DROP TRIGGER IF EXISTS dkegl_sync_reorder_level_trigger ON dkegl_item_master;
CREATE TRIGGER dkegl_sync_reorder_level_trigger
  AFTER UPDATE OF reorder_level ON dkegl_item_master
  FOR EACH ROW
  WHEN (OLD.reorder_level IS DISTINCT FROM NEW.reorder_level)
  EXECUTE FUNCTION dkegl_sync_reorder_level_to_stock();

-- Fix the comprehensive stock summary function to use correct column references
CREATE OR REPLACE FUNCTION dkegl_get_comprehensive_stock_summary(_org_id uuid)
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
  is_low_stock boolean,
  opening_qty numeric,
  total_grn_qty numeric,
  total_issued_qty numeric,
  calculated_qty numeric,
  variance_qty numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH stock_aggregated AS (
    SELECT 
      s.item_code,
      SUM(s.opening_qty) as opening_qty,
      SUM(s.current_qty) as current_qty,
      AVG(s.unit_cost) as unit_cost,
      MAX(s.last_transaction_date) as last_transaction_date,
      string_agg(DISTINCT s.location, ', ') as location,
      MAX(s.reorder_level) as reorder_level  -- Now using s.reorder_level from stock table
    FROM dkegl_stock s
    WHERE s.organization_id = _org_id
    GROUP BY s.item_code
  ),
  grn_aggregated AS (
    SELECT 
      g.item_code,
      SUM(g.qty_received) as total_grn_qty
    FROM dkegl_grn_log g
    WHERE g.organization_id = _org_id
    GROUP BY g.item_code
  ),
  issue_aggregated AS (
    SELECT 
      i.item_code,
      SUM(i.qty_issued) as total_issued_qty
    FROM dkegl_issue_log i
    WHERE i.organization_id = _org_id
    GROUP BY i.item_code
  )
  SELECT 
    s.item_code,
    COALESCE(im.item_name, s.item_code) as item_name,
    COALESCE(c.category_name, 'Uncategorized') as category_name,
    s.current_qty,
    s.unit_cost,
    s.current_qty * s.unit_cost as total_value,
    s.last_transaction_date,
    s.location,
    s.reorder_level,
    (s.current_qty <= s.reorder_level) as is_low_stock,
    s.opening_qty,
    COALESCE(g.total_grn_qty, 0) as total_grn_qty,
    COALESCE(iss.total_issued_qty, 0) as total_issued_qty,
    (s.opening_qty + COALESCE(g.total_grn_qty, 0) - COALESCE(iss.total_issued_qty, 0)) as calculated_qty,
    (s.current_qty - (s.opening_qty + COALESCE(g.total_grn_qty, 0) - COALESCE(iss.total_issued_qty, 0))) as variance_qty
  FROM stock_aggregated s
  LEFT JOIN dkegl_item_master im ON s.item_code = im.item_code AND im.organization_id = _org_id
  LEFT JOIN dkegl_categories c ON im.category_id = c.id
  LEFT JOIN grn_aggregated g ON s.item_code = g.item_code
  LEFT JOIN issue_aggregated iss ON s.item_code = iss.item_code
  ORDER BY s.item_code;
END;
$$;

-- Fix the stock analytics totals function
CREATE OR REPLACE FUNCTION dkegl_get_stock_analytics_totals(_org_id uuid)
RETURNS TABLE(
  total_opening numeric,
  total_grn numeric,
  total_issued numeric,
  total_current numeric,
  total_calculated numeric,
  total_variance numeric,
  total_items bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(opening_qty), 0) as total_opening,
    COALESCE(SUM(total_grn_qty), 0) as total_grn,
    COALESCE(SUM(total_issued_qty), 0) as total_issued,
    COALESCE(SUM(current_qty), 0) as total_current,
    COALESCE(SUM(calculated_qty), 0) as total_calculated,
    COALESCE(SUM(variance_qty), 0) as total_variance,
    COUNT(*) as total_items
  FROM dkegl_get_comprehensive_stock_summary(_org_id);
END;
$$;

-- Update the reconcile stock data function to handle reorder_level properly
CREATE OR REPLACE FUNCTION dkegl_reconcile_stock_data(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  reconciliation_summary jsonb;
  affected_items integer := 0;
  total_variance numeric := 0;
BEGIN
  -- Log reconciliation start
  INSERT INTO dkegl_audit_log (
    organization_id,
    table_name,
    action,
    metadata
  ) VALUES (
    _org_id,
    'dkegl_stock',
    'STOCK_RECONCILIATION_START',
    jsonb_build_object(
      'started_at', now(),
      'triggered_by', auth.uid()
    )
  );

  -- Calculate and update any missing reorder_levels from item_master
  UPDATE dkegl_stock 
  SET reorder_level = COALESCE(im.reorder_level, 0),
      last_updated = now()
  FROM dkegl_item_master im 
  WHERE dkegl_stock.organization_id = _org_id
    AND dkegl_stock.organization_id = im.organization_id 
    AND dkegl_stock.item_code = im.item_code
    AND (dkegl_stock.reorder_level IS NULL OR dkegl_stock.reorder_level = 0)
    AND im.reorder_level > 0;

  GET DIAGNOSTICS affected_items = ROW_COUNT;

  -- Calculate total variance for reporting
  SELECT COALESCE(SUM(ABS(variance_qty)), 0)
  INTO total_variance
  FROM dkegl_get_comprehensive_stock_summary(_org_id);

  -- Create reconciliation summary
  reconciliation_summary := jsonb_build_object(
    'organization_id', _org_id,
    'reconciliation_date', CURRENT_DATE,
    'items_updated', affected_items,
    'total_variance', total_variance,
    'reconciled_at', now(),
    'reconciled_by', auth.uid()
  );

  -- Log reconciliation completion
  INSERT INTO dkegl_audit_log (
    organization_id,
    table_name,
    action,
    metadata
  ) VALUES (
    _org_id,
    'dkegl_stock',
    'STOCK_RECONCILIATION_COMPLETE',
    reconciliation_summary
  );

  RETURN reconciliation_summary;
END;
$$;