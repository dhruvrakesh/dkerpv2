-- Fix duplicate key issue and simplify stock summary population

-- First, create a simpler refresh function that handles duplicates properly
CREATE OR REPLACE FUNCTION public.dkegl_populate_stock_summary(_org_id uuid, _opening_date date DEFAULT '2025-03-31'::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  affected_rows INTEGER := 0;
  result_summary JSONB;
BEGIN
  -- Clear existing summary for this organization
  DELETE FROM dkegl_stock_summary WHERE organization_id = _org_id;
  
  -- Simple INSERT without ON CONFLICT to avoid duplicate issues
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
  SELECT DISTINCT
    _org_id as organization_id,
    s.item_code,
    COALESCE(im.item_name, 'Unknown Item') as item_name,
    COALESCE(c.category_name, 'Uncategorized') as category_name,
    
    -- Opening stock
    COALESCE(s.opening_qty, 0) as opening_qty,
    
    -- Total GRN quantity
    COALESCE(grn_agg.total_grn_qty, 0) as total_grn_qty,
    
    -- Total issued quantity
    COALESCE(issue_agg.total_issued_qty, 0) as total_issued_qty,
    
    -- Current stock quantity
    COALESCE(s.current_qty, 0) as current_qty,
    
    -- Calculated quantity (Opening + GRN - Issues)
    (COALESCE(s.opening_qty, 0) + COALESCE(grn_agg.total_grn_qty, 0) - COALESCE(issue_agg.total_issued_qty, 0)) as calculated_qty,
    
    -- Issues in different periods
    COALESCE(issue_agg.issue_7d, 0) as issue_7d,
    COALESCE(issue_agg.issue_30d, 0) as issue_30d,
    COALESCE(issue_agg.issue_90d, 0) as issue_90d,
    
    -- Consumption rates (per day)
    CASE WHEN issue_agg.issue_7d > 0 THEN issue_agg.issue_7d / 7.0 ELSE 0 END as consumption_rate_7d,
    CASE WHEN issue_agg.issue_30d > 0 THEN issue_agg.issue_30d / 30.0 ELSE 0 END as consumption_rate_30d,
    CASE WHEN issue_agg.issue_90d > 0 THEN issue_agg.issue_90d / 90.0 ELSE 0 END as consumption_rate_90d,
    
    -- Days of cover (based on 30-day consumption)
    CASE 
      WHEN issue_agg.issue_30d > 0 AND s.current_qty > 0 
      THEN (s.current_qty / (issue_agg.issue_30d / 30.0))
      ELSE NULL 
    END as days_of_cover,
    
    -- Reorder level (30-day consumption)
    COALESCE(issue_agg.issue_30d, 0) as reorder_level,
    
    -- Reorder suggested
    CASE 
      WHEN s.current_qty < COALESCE(issue_agg.issue_30d, 0) AND issue_agg.issue_30d > 0 
      THEN true 
      ELSE false 
    END as reorder_suggested,
    
    -- Last transaction date
    GREATEST(
      COALESCE(s.last_transaction_date, '1900-01-01'::date),
      COALESCE(grn_agg.last_grn_date, '1900-01-01'::date),
      COALESCE(issue_agg.last_issue_date, '1900-01-01'::date)
    ) as last_transaction_date,
    
    NOW() as last_updated
  
  FROM dkegl_stock s
  LEFT JOIN dkegl_item_master im ON im.organization_id = s.organization_id AND im.item_code = s.item_code
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
  ) grn_agg ON grn_agg.item_code = s.item_code
  
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
  ) issue_agg ON issue_agg.item_code = s.item_code
  
  WHERE s.organization_id = _org_id;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  
  -- Build result summary
  result_summary := jsonb_build_object(
    'success', true,
    'organization_id', _org_id,
    'opening_date', _opening_date,
    'records_processed', affected_rows,
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

-- Now run the simpler function to populate the stock summary
SELECT dkegl_populate_stock_summary(
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  '2025-03-31'::date
);