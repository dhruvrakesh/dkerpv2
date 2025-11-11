-- ============================================================================
-- PHASE 1.3: DROP AND RECREATE FUNCTIONS WITH PROPER SIGNATURES
-- Handle return type changes by dropping first
-- ============================================================================

-- Drop functions that need signature changes
DROP FUNCTION IF EXISTS public.dkegl_calculate_item_pricing(uuid, text, text, numeric);
DROP FUNCTION IF EXISTS public.dkegl_calculate_gst(numeric, numeric, boolean);

-- Recreate with correct signatures
CREATE FUNCTION public.dkegl_calculate_item_pricing(
  _org_id uuid,
  _item_code text,
  _customer_tier text DEFAULT 'standard'::text,
  _quantity numeric DEFAULT 1
)
RETURNS TABLE(base_price numeric, tier_discount numeric, volume_discount numeric, final_price numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((pricing_info->>'unit_cost')::numeric, 0) as base_price,
    CASE 
      WHEN _customer_tier = 'premium' THEN 0.10
      WHEN _customer_tier = 'vip' THEN 0.15
      ELSE 0
    END as tier_discount,
    CASE
      WHEN _quantity >= 1000 THEN 0.15
      WHEN _quantity >= 500 THEN 0.10
      WHEN _quantity >= 100 THEN 0.05
      ELSE 0
    END as volume_discount,
    COALESCE((pricing_info->>'unit_cost')::numeric, 0) * 
    (1 - CASE 
      WHEN _customer_tier = 'premium' THEN 0.10
      WHEN _customer_tier = 'vip' THEN 0.15
      ELSE 0
    END) *
    (1 - CASE
      WHEN _quantity >= 1000 THEN 0.15
      WHEN _quantity >= 500 THEN 0.10
      WHEN _quantity >= 100 THEN 0.05
      ELSE 0
    END) as final_price
  FROM dkegl_item_master
  WHERE organization_id = _org_id AND item_code = _item_code;
END;
$function$;

CREATE FUNCTION public.dkegl_calculate_gst(
  _base_amount numeric,
  _gst_rate numeric DEFAULT 18,
  _is_interstate boolean DEFAULT false
)
RETURNS TABLE(
  base_amount numeric,
  cgst numeric,
  sgst numeric,
  igst numeric,
  total_gst numeric,
  total_amount numeric
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    _base_amount,
    CASE WHEN NOT _is_interstate THEN (_base_amount * _gst_rate / 100 / 2) ELSE 0 END as cgst,
    CASE WHEN NOT _is_interstate THEN (_base_amount * _gst_rate / 100 / 2) ELSE 0 END as sgst,
    CASE WHEN _is_interstate THEN (_base_amount * _gst_rate / 100) ELSE 0 END as igst,
    (_base_amount * _gst_rate / 100) as total_gst,
    _base_amount + (_base_amount * _gst_rate / 100) as total_amount;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.dkegl_calculate_item_pricing(uuid, text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dkegl_calculate_gst(numeric, numeric, boolean) TO authenticated;