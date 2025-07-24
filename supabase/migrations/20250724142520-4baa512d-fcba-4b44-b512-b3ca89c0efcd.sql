-- Fix the stock summary refresh function to handle duplicates
CREATE OR REPLACE FUNCTION public.dkegl_refresh_stock_summary(_org_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete existing summary for organization to avoid duplicates
  DELETE FROM dkegl_stock_summary WHERE organization_id = _org_id;
  
  -- Regenerate stock summary with proper handling
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
    s.organization_id,
    s.item_code,
    COALESCE(im.item_name, s.item_code) as item_name,
    COALESCE(c.category_name, 'Uncategorized') as category_name,
    COALESCE(s.opening_qty, 0) as opening_qty,
    COALESCE(grn_total.total_qty, 0) as total_grn_qty,
    COALESCE(issue_total.total_qty, 0) as total_issued_qty,
    COALESCE(s.current_qty, 0) as current_qty,
    COALESCE(s.opening_qty, 0) + COALESCE(grn_total.total_qty, 0) - COALESCE(issue_total.total_qty, 0) as calculated_qty,
    COALESCE(issue_7d.total_qty, 0) as issue_7d,
    COALESCE(issue_30d.total_qty, 0) as issue_30d,
    COALESCE(issue_90d.total_qty, 0) as issue_90d,
    CASE WHEN COALESCE(issue_7d.total_qty, 0) > 0 THEN COALESCE(issue_7d.total_qty, 0) / 7.0 ELSE 0 END as consumption_rate_7d,
    CASE WHEN COALESCE(issue_30d.total_qty, 0) > 0 THEN COALESCE(issue_30d.total_qty, 0) / 30.0 ELSE 0 END as consumption_rate_30d,
    CASE WHEN COALESCE(issue_90d.total_qty, 0) > 0 THEN COALESCE(issue_90d.total_qty, 0) / 90.0 ELSE 0 END as consumption_rate_90d,
    CASE 
      WHEN COALESCE(issue_30d.total_qty, 0) > 0 THEN COALESCE(s.current_qty, 0) / (COALESCE(issue_30d.total_qty, 0) / 30.0)
      ELSE 999
    END as days_of_cover,
    COALESCE(im.reorder_level, 0) as reorder_level,
    COALESCE(s.current_qty, 0) <= COALESCE(im.reorder_level, 0) as reorder_suggested,
    s.last_transaction_date
  FROM dkegl_stock s
  LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
  LEFT JOIN dkegl_categories c ON im.category_id = c.id
  LEFT JOIN (
    SELECT organization_id, item_code, SUM(qty_received) as total_qty
    FROM dkegl_grn_log
    WHERE organization_id = _org_id
    GROUP BY organization_id, item_code
  ) grn_total ON s.organization_id = grn_total.organization_id AND s.item_code = grn_total.item_code
  LEFT JOIN (
    SELECT organization_id, item_code, SUM(qty_issued) as total_qty
    FROM dkegl_issue_log
    WHERE organization_id = _org_id
    GROUP BY organization_id, item_code
  ) issue_total ON s.organization_id = issue_total.organization_id AND s.item_code = issue_total.item_code
  LEFT JOIN (
    SELECT organization_id, item_code, SUM(qty_issued) as total_qty
    FROM dkegl_issue_log
    WHERE organization_id = _org_id AND date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY organization_id, item_code
  ) issue_7d ON s.organization_id = issue_7d.organization_id AND s.item_code = issue_7d.item_code
  LEFT JOIN (
    SELECT organization_id, item_code, SUM(qty_issued) as total_qty
    FROM dkegl_issue_log
    WHERE organization_id = _org_id AND date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY organization_id, item_code
  ) issue_30d ON s.organization_id = issue_30d.organization_id AND s.item_code = issue_30d.item_code
  LEFT JOIN (
    SELECT organization_id, item_code, SUM(qty_issued) as total_qty
    FROM dkegl_issue_log
    WHERE organization_id = _org_id AND date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY organization_id, item_code
  ) issue_90d ON s.organization_id = issue_90d.organization_id AND s.item_code = issue_90d.item_code
  WHERE s.organization_id = _org_id;
  
  -- Add variance calculation
  UPDATE dkegl_stock_summary 
  SET variance_qty = current_qty - calculated_qty
  WHERE organization_id = _org_id;
END;
$function$;