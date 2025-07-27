-- Create RPC function to get real-time stock data with item details
CREATE OR REPLACE FUNCTION dkegl_get_real_stock_summary(_org_id uuid)
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
  is_low_stock boolean
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
    COALESCE(s.unit_cost, 0) as unit_cost,
    (s.current_qty * COALESCE(s.unit_cost, 0)) as total_value,
    s.last_transaction_date,
    COALESCE(s.location, 'Main Warehouse') as location,
    COALESCE(im.reorder_level, 0) as reorder_level,
    (s.current_qty <= COALESCE(im.reorder_level, 0)) as is_low_stock
  FROM dkegl_stock s
  LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
  LEFT JOIN dkegl_categories c ON im.category_id = c.id
  WHERE s.organization_id = _org_id
    AND s.current_qty >= 0
  ORDER BY s.item_code;
END;
$function$;

-- Create function to get stock summary metrics
CREATE OR REPLACE FUNCTION dkegl_get_stock_metrics(_org_id uuid)
RETURNS TABLE(
  total_items integer,
  total_value numeric,
  low_stock_items integer,
  zero_stock_items integer,
  avg_stock_age_days numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::integer as total_items,
    SUM(s.current_qty * COALESCE(s.unit_cost, 0)) as total_value,
    COUNT(CASE WHEN s.current_qty <= COALESCE(im.reorder_level, 0) AND s.current_qty > 0 THEN 1 END)::integer as low_stock_items,
    COUNT(CASE WHEN s.current_qty = 0 THEN 1 END)::integer as zero_stock_items,
    AVG(CASE 
      WHEN s.last_transaction_date IS NOT NULL 
      THEN EXTRACT(DAY FROM CURRENT_DATE - s.last_transaction_date)
      ELSE 0 
    END) as avg_stock_age_days
  FROM dkegl_stock s
  LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
  WHERE s.organization_id = _org_id;
END;
$function$;