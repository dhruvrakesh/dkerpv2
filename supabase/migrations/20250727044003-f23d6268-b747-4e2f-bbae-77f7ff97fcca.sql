-- Fix Phase 1: Backend Foundation

-- Step 1: Fix dkegl_get_current_user_org function to handle null auth.uid()
CREATE OR REPLACE FUNCTION public.dkegl_get_current_user_org()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_org_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current user ID, handle null case
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    -- For system/admin operations, return DKEGL org ID
    SELECT id INTO user_org_id 
    FROM dkegl_organizations 
    WHERE code = 'DKEGL' 
    LIMIT 1;
    
    RETURN user_org_id;
  END IF;
  
  -- Get user's organization
  SELECT organization_id INTO user_org_id
  FROM dkegl_user_profiles
  WHERE user_id = current_user_id
  LIMIT 1;
  
  -- If no profile found, return DKEGL org as fallback
  IF user_org_id IS NULL THEN
    SELECT id INTO user_org_id 
    FROM dkegl_organizations 
    WHERE code = 'DKEGL' 
    LIMIT 1;
  END IF;
  
  RETURN user_org_id;
END;
$function$;

-- Step 2: Fix dkegl_refresh_stock_summary with proper upsert logic
CREATE OR REPLACE FUNCTION public.dkegl_refresh_stock_summary(_org_id uuid, _opening_date date DEFAULT '2025-03-31'::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  affected_rows INTEGER := 0;
  error_count INTEGER := 0;
  result_summary JSONB;
BEGIN
  -- Clear existing summary for this organization
  DELETE FROM dkegl_stock_summary WHERE organization_id = _org_id;
  
  -- Insert fresh stock summary data using upsert logic
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
    last_transaction_date,
    last_updated
  )
  SELECT 
    _org_id as organization_id,
    COALESCE(s.item_code, g.item_code, i.item_code) as item_code,
    COALESCE(im.item_name, 'Unknown Item') as item_name,
    COALESCE(c.category_name, 'Uncategorized') as category_name,
    
    -- Opening stock (from stock table or 0)
    COALESCE(s.opening_qty, 0) as opening_qty,
    
    -- Total GRN quantity (from opening date)
    COALESCE(grn_data.total_grn_qty, 0) as total_grn_qty,
    
    -- Total issued quantity (from opening date)
    COALESCE(issue_data.total_issued_qty, 0) as total_issued_qty,
    
    -- Current stock quantity
    COALESCE(s.current_qty, 0) as current_qty,
    
    -- Calculated quantity (Opening + GRN - Issues)
    (COALESCE(s.opening_qty, 0) + COALESCE(grn_data.total_grn_qty, 0) - COALESCE(issue_data.total_issued_qty, 0)) as calculated_qty,
    
    -- Issues in different periods
    COALESCE(issue_data.issue_7d, 0) as issue_7d,
    COALESCE(issue_data.issue_30d, 0) as issue_30d,
    COALESCE(issue_data.issue_90d, 0) as issue_90d,
    
    -- Consumption rates (per day)
    CASE WHEN issue_data.issue_7d > 0 THEN issue_data.issue_7d / 7.0 ELSE 0 END as consumption_rate_7d,
    CASE WHEN issue_data.issue_30d > 0 THEN issue_data.issue_30d / 30.0 ELSE 0 END as consumption_rate_30d,
    CASE WHEN issue_data.issue_90d > 0 THEN issue_data.issue_90d / 90.0 ELSE 0 END as consumption_rate_90d,
    
    -- Days of cover (based on 30-day consumption)
    CASE 
      WHEN issue_data.issue_30d > 0 AND s.current_qty > 0 
      THEN (s.current_qty / (issue_data.issue_30d / 30.0))
      ELSE NULL 
    END as days_of_cover,
    
    -- Reorder level (30-day consumption)
    COALESCE(issue_data.issue_30d, 0) as reorder_level,
    
    -- Reorder suggested (if current stock < reorder level)
    CASE 
      WHEN s.current_qty < COALESCE(issue_data.issue_30d, 0) AND issue_data.issue_30d > 0 
      THEN true 
      ELSE false 
    END as reorder_suggested,
    
    -- Last transaction date
    GREATEST(
      COALESCE(s.last_transaction_date, '1900-01-01'::date),
      COALESCE(grn_data.last_grn_date, '1900-01-01'::date),
      COALESCE(issue_data.last_issue_date, '1900-01-01'::date)
    ) as last_transaction_date,
    
    NOW() as last_updated
  
  FROM (
    -- Get all unique item codes from stock, GRN, and issues
    SELECT item_code FROM dkegl_stock WHERE organization_id = _org_id
    UNION
    SELECT item_code FROM dkegl_grn_log WHERE organization_id = _org_id AND date >= _opening_date
    UNION  
    SELECT item_code FROM dkegl_issue_log WHERE organization_id = _org_id AND date >= _opening_date
  ) all_items
  
  -- Join with stock data
  LEFT JOIN dkegl_stock s ON s.organization_id = _org_id AND s.item_code = all_items.item_code
  
  -- Join with item master for names
  LEFT JOIN dkegl_item_master im ON im.organization_id = _org_id AND im.item_code = all_items.item_code
  LEFT JOIN dkegl_categories c ON c.id = im.category_id
  
  -- GRN aggregation
  LEFT JOIN (
    SELECT 
      item_code,
      SUM(qty_received) as total_grn_qty,
      MAX(date) as last_grn_date
    FROM dkegl_grn_log 
    WHERE organization_id = _org_id AND date >= _opening_date
    GROUP BY item_code
  ) grn_data ON grn_data.item_code = all_items.item_code
  
  -- Issue aggregation  
  LEFT JOIN (
    SELECT 
      item_code,
      SUM(qty_issued) as total_issued_qty,
      SUM(CASE WHEN date >= CURRENT_DATE - INTERVAL '7 days' THEN qty_issued ELSE 0 END) as issue_7d,
      SUM(CASE WHEN date >= CURRENT_DATE - INTERVAL '30 days' THEN qty_issued ELSE 0 END) as issue_30d,
      SUM(CASE WHEN date >= CURRENT_DATE - INTERVAL '90 days' THEN qty_issued ELSE 0 END) as issue_90d,
      MAX(date) as last_issue_date
    FROM dkegl_issue_log 
    WHERE organization_id = _org_id AND date >= _opening_date
    GROUP BY item_code
  ) issue_data ON issue_data.item_code = all_items.item_code
  
  -- Exclude items with no activity
  WHERE (
    COALESCE(s.current_qty, 0) > 0 OR 
    COALESCE(grn_data.total_grn_qty, 0) > 0 OR 
    COALESCE(issue_data.total_issued_qty, 0) > 0
  )
  
  ON CONFLICT (organization_id, item_code) 
  DO UPDATE SET
    item_name = EXCLUDED.item_name,
    category_name = EXCLUDED.category_name,
    opening_qty = EXCLUDED.opening_qty,
    total_grn_qty = EXCLUDED.total_grn_qty,
    total_issued_qty = EXCLUDED.total_issued_qty,
    current_qty = EXCLUDED.current_qty,
    calculated_qty = EXCLUDED.calculated_qty,
    issue_7d = EXCLUDED.issue_7d,
    issue_30d = EXCLUDED.issue_30d,
    issue_90d = EXCLUDED.issue_90d,
    consumption_rate_7d = EXCLUDED.consumption_rate_7d,
    consumption_rate_30d = EXCLUDED.consumption_rate_30d,
    consumption_rate_90d = EXCLUDED.consumption_rate_90d,
    days_of_cover = EXCLUDED.days_of_cover,
    reorder_level = EXCLUDED.reorder_level,
    reorder_suggested = EXCLUDED.reorder_suggested,
    last_transaction_date = EXCLUDED.last_transaction_date,
    last_updated = EXCLUDED.last_updated;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Build result summary
  result_summary := jsonb_build_object(
    'success', true,
    'organization_id', _org_id,
    'opening_date', _opening_date,
    'records_processed', affected_rows,
    'errors', error_count,
    'timestamp', NOW()
  );
  
  RETURN result_summary;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'organization_id', _org_id,
    'timestamp', NOW()
  );
END;
$function$;

-- Step 3: Refresh stock summary for DKEGL organization
SELECT dkegl_refresh_stock_summary(
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  '2025-03-31'::date
);