-- Fix database function casting issue in dkegl_get_stock_aging
CREATE OR REPLACE FUNCTION public.dkegl_get_stock_aging(_org_id uuid)
 RETURNS TABLE(item_code text, item_name text, category_name text, current_qty numeric, last_movement_date date, days_since_movement integer, aging_category text, estimated_value numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    s.item_code,
    im.item_name,
    c.category_name,
    s.current_qty,
    s.last_transaction_date,
    CASE 
      WHEN s.last_transaction_date IS NULL THEN 999
      ELSE EXTRACT(DAY FROM CURRENT_DATE - s.last_transaction_date)::INTEGER
    END as days_since_movement,
    CASE 
      WHEN s.last_transaction_date IS NULL THEN 'No Movement'
      WHEN EXTRACT(DAY FROM CURRENT_DATE - s.last_transaction_date) <= 30 THEN 'Fresh (0-30 days)'
      WHEN EXTRACT(DAY FROM CURRENT_DATE - s.last_transaction_date) <= 90 THEN 'Good (31-90 days)'
      WHEN EXTRACT(DAY FROM CURRENT_DATE - s.last_transaction_date) <= 180 THEN 'Aging (91-180 days)'
      WHEN EXTRACT(DAY FROM CURRENT_DATE - s.last_transaction_date) <= 365 THEN 'Old (181-365 days)'
      ELSE 'Critical (>365 days)'
    END as aging_category,
    s.current_qty * COALESCE(s.unit_cost, 0) as estimated_value
  FROM dkegl_stock s
  LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
  LEFT JOIN dkegl_categories c ON im.category_id = c.id
  WHERE s.organization_id = _org_id
    AND s.current_qty > 0
  ORDER BY days_since_movement DESC;
END;
$function$;