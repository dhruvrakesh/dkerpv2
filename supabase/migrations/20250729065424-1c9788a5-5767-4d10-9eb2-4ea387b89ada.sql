-- Create comprehensive stock summary function that unifies all stock data sources
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
  WITH stock_base AS (
    SELECT 
      s.item_code,
      s.current_qty,
      s.unit_cost,
      s.location,
      s.last_transaction_date,
      im.item_name,
      c.category_name,
      im.reorder_level
    FROM dkegl_stock s
    LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
    LEFT JOIN dkegl_categories c ON im.category_id = c.id
    WHERE s.organization_id = _org_id
  ),
  grn_totals AS (
    SELECT 
      g.item_code,
      SUM(g.qty_received) as total_grn_qty
    FROM dkegl_grn_log g
    WHERE g.organization_id = _org_id
    GROUP BY g.item_code
  ),
  issue_totals AS (
    SELECT 
      i.item_code,
      SUM(i.qty_issued) as total_issued_qty
    FROM dkegl_issue_log i
    WHERE i.organization_id = _org_id
    GROUP BY i.item_code
  ),
  opening_stock AS (
    -- Calculate opening stock based on current stock minus all movements
    -- This assumes no explicit opening stock table, so we calculate it
    SELECT 
      s.item_code,
      GREATEST(0, s.current_qty - COALESCE(g.total_grn_qty, 0) + COALESCE(i.total_issued_qty, 0)) as opening_qty
    FROM stock_base s
    LEFT JOIN grn_totals g ON s.item_code = g.item_code
    LEFT JOIN issue_totals i ON s.item_code = i.item_code
  )
  SELECT 
    sb.item_code,
    sb.item_name,
    sb.category_name,
    sb.current_qty,
    COALESCE(sb.unit_cost, 0) as unit_cost,
    sb.current_qty * COALESCE(sb.unit_cost, 0) as total_value,
    sb.last_transaction_date,
    COALESCE(sb.location, 'main_warehouse') as location,
    COALESCE(sb.reorder_level, 0) as reorder_level,
    sb.current_qty <= COALESCE(sb.reorder_level, 0) as is_low_stock,
    COALESCE(os.opening_qty, 0) as opening_qty,
    COALESCE(gt.total_grn_qty, 0) as total_grn_qty,
    COALESCE(it.total_issued_qty, 0) as total_issued_qty,
    COALESCE(os.opening_qty, 0) + COALESCE(gt.total_grn_qty, 0) - COALESCE(it.total_issued_qty, 0) as calculated_qty,
    sb.current_qty - (COALESCE(os.opening_qty, 0) + COALESCE(gt.total_grn_qty, 0) - COALESCE(it.total_issued_qty, 0)) as variance_qty
  FROM stock_base sb
  LEFT JOIN grn_totals gt ON sb.item_code = gt.item_code
  LEFT JOIN issue_totals it ON sb.item_code = it.item_code
  LEFT JOIN opening_stock os ON sb.item_code = os.item_code
  ORDER BY sb.item_code;
END;
$function$;

-- Create function to get stock analytics summary totals
CREATE OR REPLACE FUNCTION public.dkegl_get_stock_analytics_totals(_org_id uuid)
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
AS $function$
BEGIN
  RETURN QUERY
  WITH summary_data AS (
    SELECT * FROM dkegl_get_comprehensive_stock_summary(_org_id)
  )
  SELECT 
    COALESCE(SUM(opening_qty), 0) as total_opening,
    COALESCE(SUM(total_grn_qty), 0) as total_grn,
    COALESCE(SUM(total_issued_qty), 0) as total_issued,
    COALESCE(SUM(current_qty), 0) as total_current,
    COALESCE(SUM(calculated_qty), 0) as total_calculated,
    COALESCE(SUM(ABS(variance_qty)), 0) as total_variance,
    COUNT(*)::bigint as total_items
  FROM summary_data;
END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION dkegl_get_comprehensive_stock_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION dkegl_get_stock_analytics_totals(uuid) TO authenticated;