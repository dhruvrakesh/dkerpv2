-- Fix the stock summary function to exclude generated columns

CREATE OR REPLACE FUNCTION dkegl_refresh_stock_summary(
  _org_id uuid DEFAULT NULL,
  _opening_date date DEFAULT '2025-03-31'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_org_id uuid;
  summary_count INTEGER := 0;
  result_summary jsonb;
BEGIN
  -- Get organization ID
  IF _org_id IS NULL THEN
    target_org_id := dkegl_get_current_user_org();
  ELSE
    target_org_id := _org_id;
  END IF;
  
  IF target_org_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization not found'
    );
  END IF;
  
  -- Delete existing summary for this organization
  DELETE FROM dkegl_stock_summary WHERE organization_id = target_org_id;
  
  -- Generate comprehensive stock summary (excluding generated columns)
  INSERT INTO dkegl_stock_summary (
    organization_id,
    item_code,
    item_name,
    category_name,
    opening_qty,
    total_grn_qty,
    total_issued_qty,
    current_qty,
    calculated_qty,
    issue_7d,
    issue_30d,
    issue_90d,
    consumption_rate_7d,
    consumption_rate_30d,
    consumption_rate_90d,
    days_of_cover,
    reorder_level,
    reorder_suggested,
    last_transaction_date
  )
  SELECT 
    target_org_id,
    stock_calc.item_code,
    stock_calc.item_name,
    stock_calc.category_name,
    stock_calc.opening_qty,
    stock_calc.total_grn_qty,
    stock_calc.total_issued_qty,
    stock_calc.current_qty,
    stock_calc.calculated_qty,
    stock_calc.issue_7d,
    stock_calc.issue_30d,
    stock_calc.issue_90d,
    stock_calc.consumption_rate_7d,
    stock_calc.consumption_rate_30d,
    stock_calc.consumption_rate_90d,
    stock_calc.days_of_cover,
    stock_calc.reorder_level,
    stock_calc.reorder_suggested,
    stock_calc.last_transaction_date
  FROM (
    WITH all_items AS (
      -- Get all unique item codes from stock, GRN, and issues
      SELECT DISTINCT s.item_code
      FROM dkegl_stock s
      WHERE s.organization_id = target_org_id
      
      UNION
      
      SELECT DISTINCT g.item_code
      FROM dkegl_grn_log g
      WHERE g.organization_id = target_org_id
      
      UNION
      
      SELECT DISTINCT i.item_code
      FROM dkegl_issue_log i
      WHERE i.organization_id = target_org_id
    ),
    stock_data AS (
      SELECT 
        ai.item_code,
        im.item_name,
        cat.category_name,
        -- Opening stock (from user-defined opening date)
        COALESCE(s.opening_qty, 0) as opening_qty,
        -- Current physical stock
        COALESCE(s.current_qty, 0) as current_qty,
        -- Reorder levels
        COALESCE(im.reorder_level, 0) as reorder_level,
        -- Last transaction from any source
        GREATEST(
          COALESCE(s.last_transaction_date, _opening_date),
          COALESCE((SELECT MAX(g.date) FROM dkegl_grn_log g WHERE g.organization_id = target_org_id AND g.item_code = ai.item_code), _opening_date),
          COALESCE((SELECT MAX(i.date) FROM dkegl_issue_log i WHERE i.organization_id = target_org_id AND i.item_code = ai.item_code), _opening_date)
        ) as last_transaction_date
      FROM all_items ai
      LEFT JOIN dkegl_item_master im ON ai.item_code = im.item_code AND im.organization_id = target_org_id
      LEFT JOIN dkegl_categories cat ON im.category_id = cat.id
      LEFT JOIN dkegl_stock s ON ai.item_code = s.item_code AND s.organization_id = target_org_id
    ),
    grn_totals AS (
      SELECT 
        item_code,
        COALESCE(SUM(CASE WHEN date >= _opening_date THEN qty_received ELSE 0 END), 0) as total_grn_qty
      FROM dkegl_grn_log
      WHERE organization_id = target_org_id
      GROUP BY item_code
    ),
    issue_totals AS (
      SELECT 
        item_code,
        COALESCE(SUM(CASE WHEN date >= _opening_date THEN qty_issued ELSE 0 END), 0) as total_issued_qty,
        COALESCE(SUM(CASE WHEN date >= CURRENT_DATE - INTERVAL '7 days' THEN qty_issued ELSE 0 END), 0) as issue_7d,
        COALESCE(SUM(CASE WHEN date >= CURRENT_DATE - INTERVAL '30 days' THEN qty_issued ELSE 0 END), 0) as issue_30d,
        COALESCE(SUM(CASE WHEN date >= CURRENT_DATE - INTERVAL '90 days' THEN qty_issued ELSE 0 END), 0) as issue_90d
      FROM dkegl_issue_log
      WHERE organization_id = target_org_id
      GROUP BY item_code
    )
    SELECT 
      sd.item_code,
      sd.item_name,
      sd.category_name,
      sd.opening_qty,
      COALESCE(gt.total_grn_qty, 0) as total_grn_qty,
      COALESCE(it.total_issued_qty, 0) as total_issued_qty,
      sd.current_qty,
      -- Calculated stock = Opening + GRNs - Issues
      (sd.opening_qty + COALESCE(gt.total_grn_qty, 0) - COALESCE(it.total_issued_qty, 0)) as calculated_qty,
      COALESCE(it.issue_7d, 0) as issue_7d,
      COALESCE(it.issue_30d, 0) as issue_30d,
      COALESCE(it.issue_90d, 0) as issue_90d,
      -- Consumption rates (daily)
      CASE WHEN it.issue_7d > 0 THEN it.issue_7d / 7.0 ELSE 0 END as consumption_rate_7d,
      CASE WHEN it.issue_30d > 0 THEN it.issue_30d / 30.0 ELSE 0 END as consumption_rate_30d,
      CASE WHEN it.issue_90d > 0 THEN it.issue_90d / 90.0 ELSE 0 END as consumption_rate_90d,
      -- Days of cover (current stock / daily consumption)
      CASE 
        WHEN it.issue_30d > 0 THEN sd.current_qty / (it.issue_30d / 30.0)
        ELSE 999 
      END as days_of_cover,
      sd.reorder_level,
      (sd.current_qty <= sd.reorder_level) as reorder_suggested,
      sd.last_transaction_date
    FROM stock_data sd
    LEFT JOIN grn_totals gt ON sd.item_code = gt.item_code
    LEFT JOIN issue_totals it ON sd.item_code = it.item_code
  ) stock_calc;
  
  GET DIAGNOSTICS summary_count = ROW_COUNT;
  
  -- Build result summary
  SELECT jsonb_build_object(
    'success', true,
    'organization_id', target_org_id,
    'opening_date', _opening_date,
    'records_processed', summary_count,
    'timestamp', now(),
    'summary', (
      SELECT jsonb_build_object(
        'total_items', COUNT(*),
        'total_opening_qty', COALESCE(SUM(opening_qty), 0),
        'total_grn_qty', COALESCE(SUM(total_grn_qty), 0),
        'total_issued_qty', COALESCE(SUM(total_issued_qty), 0),
        'total_current_qty', COALESCE(SUM(current_qty), 0),
        'total_calculated_qty', COALESCE(SUM(calculated_qty), 0),
        'total_variance_qty', COALESCE(SUM(ABS(variance_qty)), 0),
        'reorder_items', COUNT(*) FILTER (WHERE reorder_suggested = true)
      )
      FROM dkegl_stock_summary 
      WHERE organization_id = target_org_id
    )
  ) INTO result_summary;
  
  RETURN result_summary;
END;
$$;

-- Refresh stock summary for current organization
DO $$
DECLARE
    target_org_id uuid;
    refresh_result jsonb;
BEGIN
    -- Get the DKEGL organization
    SELECT id INTO target_org_id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1;
    
    IF target_org_id IS NOT NULL THEN
        -- Refresh stock summary for this organization
        SELECT dkegl_refresh_stock_summary(target_org_id, '2025-03-31'::date) INTO refresh_result;
        
        RAISE NOTICE 'Stock summary refresh result: %', refresh_result;
    ELSE
        RAISE NOTICE 'DKEGL organization not found';
    END IF;
END $$;