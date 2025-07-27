-- Fix date_part error in dkegl_get_stock_metrics function
DROP FUNCTION IF EXISTS public.dkegl_get_stock_metrics(uuid);

CREATE OR REPLACE FUNCTION public.dkegl_get_stock_metrics(_org_id uuid)
 RETURNS TABLE(total_items bigint, total_value numeric, low_stock_count bigint, zero_stock_count bigint, avg_stock_age numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_items,
    COALESCE(SUM(s.current_qty * s.unit_cost), 0) as total_value,
    COUNT(*) FILTER (WHERE s.current_qty <= 10) as low_stock_count,
    COUNT(*) FILTER (WHERE s.current_qty = 0) as zero_stock_count,
    COALESCE(AVG(
      CASE 
        WHEN s.last_transaction_date IS NOT NULL 
        THEN (CURRENT_DATE - s.last_transaction_date)::NUMERIC
        ELSE 365 
      END
    ), 0) as avg_stock_age
  FROM dkegl_stock s
  WHERE s.organization_id = _org_id;
END;
$function$;