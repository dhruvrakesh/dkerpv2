-- Fix SQL function naming conflicts - Drop and recreate functions with proper parameter names

-- 1. Drop existing functions first
DROP FUNCTION IF EXISTS dkegl_get_comprehensive_stock_summary(uuid);
DROP FUNCTION IF EXISTS dkegl_reconcile_stock_data(uuid);

-- 2. Create dkegl_get_comprehensive_stock_summary with proper parameter naming
CREATE OR REPLACE FUNCTION dkegl_get_comprehensive_stock_summary(p_org_id uuid)
RETURNS TABLE(
  item_code text,
  item_name text,
  category_name text,
  current_qty numeric,
  opening_qty numeric,
  total_grn_qty numeric,
  total_issued_qty numeric,
  calculated_qty numeric,
  unit_cost numeric,
  total_value numeric,
  last_movement_date date,
  stock_status text,
  is_low_stock boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH stock_summary AS (
    SELECT 
      item.code as item_code,
      COALESCE(item.name, item.code) as item_name,
      COALESCE(cat.category_name, 'Uncategorized') as category_name,
      
      -- Current stock from dkegl_stock table
      COALESCE(stock.current_qty, 0) as current_qty,
      
      -- Opening stock from dkegl_opening_stock table
      COALESCE(opening.opening_qty, 0) as opening_qty,
      
      -- Total GRN quantity
      COALESCE(grn_summary.total_grn_qty, 0) as total_grn_qty,
      
      -- Total issued quantity  
      COALESCE(issue_summary.total_issued_qty, 0) as total_issued_qty,
      
      -- Calculated stock (Opening + GRN - Issues)
      COALESCE(opening.opening_qty, 0) + 
      COALESCE(grn_summary.total_grn_qty, 0) - 
      COALESCE(issue_summary.total_issued_qty, 0) as calculated_qty,
      
      -- Unit cost from latest pricing or stock table
      COALESCE(stock.unit_cost, 0) as unit_cost,
      
      -- Last movement date
      GREATEST(
        COALESCE(grn_summary.last_grn_date, '1900-01-01'::date),
        COALESCE(issue_summary.last_issue_date, '1900-01-01'::date)
      ) as last_movement_date
      
    FROM dkeglpkl_item item
    
    -- Left join with current stock
    LEFT JOIN dkeglpkl_stock stock ON stock.org_id = item.org_id AND stock.item_code = item.code
    
    -- Left join with opening stock
    LEFT JOIN (
      SELECT org_id, item_code, SUM(opening_qty) as opening_qty
      FROM dkegl_opening_stock 
      WHERE org_id = p_org_id
      GROUP BY org_id, item_code
    ) opening ON opening.org_id = item.org_id AND opening.item_code = item.code
    
    -- Left join with GRN summary
    LEFT JOIN (
      SELECT 
        org_id, 
        item_code,
        SUM(qty_received) as total_grn_qty,
        MAX(date) as last_grn_date
      FROM dkegl_grn_log 
      WHERE org_id = p_org_id
      GROUP BY org_id, item_code
    ) grn_summary ON grn_summary.org_id = item.org_id AND grn_summary.item_code = item.code
    
    -- Left join with issue summary
    LEFT JOIN (
      SELECT 
        org_id,
        item_code,
        SUM(qty_issued) as total_issued_qty,
        MAX(date) as last_issue_date
      FROM dkegl_issue_log 
      WHERE org_id = p_org_id
      GROUP BY org_id, item_code
    ) issue_summary ON issue_summary.org_id = item.org_id AND issue_summary.item_code = item.code
    
    -- Left join with categories
    LEFT JOIN dkegl_categories cat ON cat.id = item.category_id
    
    WHERE item.org_id = p_org_id
  )
  SELECT 
    ss.item_code,
    ss.item_name,
    ss.category_name,
    ss.current_qty,
    ss.opening_qty,
    ss.total_grn_qty,
    ss.total_issued_qty,
    ss.calculated_qty,
    ss.unit_cost,
    ss.calculated_qty * ss.unit_cost as total_value,
    CASE WHEN ss.last_movement_date = '1900-01-01'::date THEN NULL ELSE ss.last_movement_date END,
    CASE 
      WHEN ss.calculated_qty <= 0 THEN 'Out of Stock'
      WHEN ss.calculated_qty <= 10 THEN 'Low Stock'
      WHEN ss.calculated_qty <= 50 THEN 'Medium Stock'
      ELSE 'Good Stock'
    END as stock_status,
    (ss.calculated_qty <= 10) as is_low_stock
  FROM stock_summary ss
  ORDER BY ss.item_code;
END;
$function$;

-- 3. Create dkegl_reconcile_stock_data with proper parameter naming
CREATE OR REPLACE FUNCTION dkegl_reconcile_stock_data(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  reconciled_count INTEGER := 0;
  total_items INTEGER := 0;
  stock_record RECORD;
  calc_qty NUMERIC;
  current_time TIMESTAMP WITH TIME ZONE := now();
BEGIN
  -- Get comprehensive stock data and reconcile with actual stock table
  FOR stock_record IN (
    SELECT * FROM dkegl_get_comprehensive_stock_summary(p_org_id)
  ) LOOP
    total_items := total_items + 1;
    calc_qty := stock_record.calculated_qty;
    
    -- Update or insert into dkegl_stock table with calculated quantity
    INSERT INTO dkeglpkl_stock (
      org_id, 
      item_code, 
      location, 
      bin, 
      current_qty, 
      unit_cost, 
      last_transaction_date, 
      last_updated,
      created_at,
      updated_at
    ) VALUES (
      p_org_id,
      stock_record.item_code,
      'MAIN',
      'DEFAULT', 
      calc_qty,
      stock_record.unit_cost,
      stock_record.last_movement_date,
      current_time,
      current_time,
      current_time
    )
    ON CONFLICT (org_id, item_code, location, bin) 
    DO UPDATE SET
      current_qty = calc_qty,
      unit_cost = CASE 
        WHEN stock_record.unit_cost > 0 THEN stock_record.unit_cost 
        ELSE dkeglpkl_stock.unit_cost 
      END,
      last_transaction_date = COALESCE(stock_record.last_movement_date, dkeglpkl_stock.last_transaction_date),
      last_updated = current_time,
      updated_at = current_time;
    
    reconciled_count := reconciled_count + 1;
  END LOOP;
  
  -- Return reconciliation summary
  RETURN jsonb_build_object(
    'success', true,
    'reconciled_items', reconciled_count,
    'total_items', total_items,
    'consolidated_location', 'MAIN',
    'calculation_formula', 'Opening Stock + GRN Received - Issues',
    'reconciliation_timestamp', current_time
  );
END;
$function$;

-- 4. Run reconciliation to fix stock calculations
DO $$
DECLARE
  org_id UUID;
  reconciliation_result JSONB;
BEGIN
  -- Get DKEGL organization ID
  SELECT id INTO org_id FROM dkeglpkl_org WHERE code = 'DKEGL' LIMIT 1;
  
  IF org_id IS NOT NULL THEN
    -- Run stock reconciliation
    SELECT dkegl_reconcile_stock_data(org_id) INTO reconciliation_result;
    
    RAISE NOTICE 'Stock reconciliation completed: %', reconciliation_result;
  ELSE
    RAISE NOTICE 'DKEGL organization not found';
  END IF;
END
$$;