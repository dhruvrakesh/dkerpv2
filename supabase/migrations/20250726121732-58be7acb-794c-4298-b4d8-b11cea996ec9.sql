-- Fix the population function to exclude generated columns
CREATE OR REPLACE FUNCTION public.dkegl_populate_stock_summary(_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  records_processed INTEGER := 0;
  result jsonb;
BEGIN
  -- Clear existing summary data for organization
  DELETE FROM dkegl_stock_summary WHERE organization_id = _org_id;
  
  -- Insert comprehensive stock summary data (excluding generated columns)
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
    _org_id,
    s.item_code,
    im.item_name,
    c.category_name,
    s.opening_qty,
    COALESCE(grn_totals.total_grn, 0) as total_grn_qty,
    COALESCE(issue_totals.total_issued, 0) as total_issued_qty,
    s.current_qty,
    s.opening_qty + COALESCE(grn_totals.total_grn, 0) - COALESCE(issue_totals.total_issued, 0) as calculated_qty,
    COALESCE(issue_7d.qty_7d, 0) as issue_7d,
    COALESCE(issue_30d.qty_30d, 0) as issue_30d,
    COALESCE(issue_90d.qty_90d, 0) as issue_90d,
    CASE WHEN issue_7d.qty_7d > 0 THEN issue_7d.qty_7d / 7.0 ELSE 0 END as consumption_rate_7d,
    CASE WHEN issue_30d.qty_30d > 0 THEN issue_30d.qty_30d / 30.0 ELSE 0 END as consumption_rate_30d,
    CASE WHEN issue_90d.qty_90d > 0 THEN issue_90d.qty_90d / 90.0 ELSE 0 END as consumption_rate_90d,
    CASE 
      WHEN issue_30d.qty_30d > 0 THEN s.current_qty / (issue_30d.qty_30d / 30.0)
      ELSE 999 
    END as days_of_cover,
    im.reorder_level,
    CASE WHEN s.current_qty <= COALESCE(im.reorder_level, 0) AND im.reorder_level > 0 THEN true ELSE false END as reorder_suggested,
    GREATEST(s.last_transaction_date, COALESCE(grn_totals.last_grn_date, s.last_transaction_date), COALESCE(issue_totals.last_issue_date, s.last_transaction_date)) as last_transaction_date
  FROM dkegl_stock s
  LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
  LEFT JOIN dkegl_categories c ON im.category_id = c.id
  -- GRN totals
  LEFT JOIN (
    SELECT 
      item_code,
      SUM(qty_received) as total_grn,
      MAX(date) as last_grn_date
    FROM dkegl_grn_log 
    WHERE organization_id = _org_id
    GROUP BY item_code
  ) grn_totals ON s.item_code = grn_totals.item_code
  -- Issue totals
  LEFT JOIN (
    SELECT 
      item_code,
      SUM(qty_issued) as total_issued,
      MAX(date) as last_issue_date
    FROM dkegl_issue_log 
    WHERE organization_id = _org_id
    GROUP BY item_code
  ) issue_totals ON s.item_code = issue_totals.item_code
  -- 7-day issues
  LEFT JOIN (
    SELECT 
      item_code,
      SUM(qty_issued) as qty_7d
    FROM dkegl_issue_log 
    WHERE organization_id = _org_id 
      AND date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY item_code
  ) issue_7d ON s.item_code = issue_7d.item_code
  -- 30-day issues  
  LEFT JOIN (
    SELECT 
      item_code,
      SUM(qty_issued) as qty_30d
    FROM dkegl_issue_log 
    WHERE organization_id = _org_id 
      AND date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY item_code
  ) issue_30d ON s.item_code = issue_30d.item_code
  -- 90-day issues
  LEFT JOIN (
    SELECT 
      item_code,
      SUM(qty_issued) as qty_90d
    FROM dkegl_issue_log 
    WHERE organization_id = _org_id 
      AND date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY item_code
  ) issue_90d ON s.item_code = issue_90d.item_code
  WHERE s.organization_id = _org_id;
  
  GET DIAGNOSTICS records_processed = ROW_COUNT;
  
  result := jsonb_build_object(
    'success', true,
    'records_processed', records_processed,
    'organization_id', _org_id,
    'processed_at', now()
  );
  
  RETURN result;
END;
$function$;