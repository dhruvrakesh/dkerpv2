-- Drop and recreate the function to fix the return type issue
DROP FUNCTION IF EXISTS public.dkegl_get_comprehensive_stock_summary(uuid);

CREATE OR REPLACE FUNCTION public.dkegl_get_comprehensive_stock_summary(_org_id uuid)
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
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    s.item_code,
    COALESCE(im.item_name, s.item_code) as item_name,
    COALESCE(c.category_name, 'Uncategorized') as category_name,
    s.current_qty,
    s.unit_cost,
    s.current_qty * s.unit_cost as total_value,
    s.last_transaction_date,
    s.location,
    COALESCE(im.specifications->>'reorder_level', '0')::numeric as reorder_level,
    s.current_qty <= COALESCE(im.specifications->>'reorder_level', '0')::numeric as is_low_stock,
    
    -- Opening stock (from opening_stock table)
    COALESCE(os.quantity, 0) as opening_qty,
    
    -- Total GRN quantity
    COALESCE(grn_summary.total_grn_qty, 0) as total_grn_qty,
    
    -- Total issued quantity  
    COALESCE(issue_summary.total_issued_qty, 0) as total_issued_qty,
    
    -- Calculated quantity (opening + grn - issued)
    COALESCE(os.quantity, 0) + COALESCE(grn_summary.total_grn_qty, 0) - COALESCE(issue_summary.total_issued_qty, 0) as calculated_qty,
    
    -- Variance (current - calculated)
    s.current_qty - (COALESCE(os.quantity, 0) + COALESCE(grn_summary.total_grn_qty, 0) - COALESCE(issue_summary.total_issued_qty, 0)) as variance_qty
    
  FROM dkegl_stock s
  LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
  LEFT JOIN dkegl_categories c ON im.category_id = c.id
  LEFT JOIN dkegl_opening_stock os ON s.organization_id = os.organization_id AND s.item_code = os.item_code
  LEFT JOIN (
    SELECT 
      organization_id, 
      item_code, 
      SUM(qty_received) as total_grn_qty
    FROM dkegl_grn_log 
    WHERE organization_id = _org_id
    GROUP BY organization_id, item_code
  ) grn_summary ON s.organization_id = grn_summary.organization_id AND s.item_code = grn_summary.item_code
  LEFT JOIN (
    SELECT 
      organization_id, 
      item_code, 
      SUM(qty_issued) as total_issued_qty
    FROM dkegl_issue_log 
    WHERE organization_id = _org_id
    GROUP BY organization_id, item_code
  ) issue_summary ON s.organization_id = issue_summary.organization_id AND s.item_code = issue_summary.item_code
  WHERE s.organization_id = _org_id
  ORDER BY s.item_code;