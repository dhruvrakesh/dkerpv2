-- Drop existing function first
DROP FUNCTION IF EXISTS dkegl_get_procurement_analytics(uuid, integer);

-- Recreate the function with correct return types
CREATE OR REPLACE FUNCTION dkegl_get_procurement_analytics(_org_id UUID, _days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  total_vendors INTEGER,
  active_vendors INTEGER,
  total_spend NUMERIC,
  avg_order_value NUMERIC,
  on_time_delivery_rate NUMERIC,
  active_rfqs INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM dkegl_vendors WHERE organization_id = _org_id) as total_vendors,
    (SELECT COUNT(*)::INTEGER FROM dkegl_vendors WHERE organization_id = _org_id AND is_active = true) as active_vendors,
    COALESCE((SELECT SUM(total_amount) FROM dkegl_grn_log WHERE organization_id = _org_id AND date >= CURRENT_DATE - INTERVAL '1 day' * _days_back), 0) as total_spend,
    COALESCE((SELECT AVG(total_amount) FROM dkegl_grn_log WHERE organization_id = _org_id AND date >= CURRENT_DATE - INTERVAL '1 day' * _days_back), 0) as avg_order_value,
    COALESCE((SELECT 
      CASE WHEN COUNT(*) > 0 
           THEN COUNT(*) FILTER (WHERE quality_status = 'approved')::NUMERIC / COUNT(*)::NUMERIC * 100 
           ELSE 0 END
      FROM dkegl_grn_log WHERE organization_id = _org_id AND date >= CURRENT_DATE - INTERVAL '1 day' * _days_back), 0) as on_time_delivery_rate,
    (SELECT COUNT(*)::INTEGER FROM dkegl_rfq WHERE organization_id = _org_id AND status IN ('sent', 'in_progress')) as active_rfqs;
END;
$function$;