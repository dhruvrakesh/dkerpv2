-- PHASE 1: CRITICAL DATABASE FIXES (CORRECTED)

-- 1. Fix dkegl_calculate_item_pricing function - Change g.amount_inr to g.total_amount
CREATE OR REPLACE FUNCTION public.dkegl_calculate_item_pricing(_org_id uuid, _item_code text, _customer_tier text DEFAULT 'standard'::text, _quantity numeric DEFAULT 1)
 RETURNS TABLE(pricing_source text, unit_price numeric, total_price numeric, discount_applied numeric, margin_percentage numeric, is_primary boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  primary_price NUMERIC;
  grn_avg_price NUMERIC;
  master_cost NUMERIC;
  final_price NUMERIC;
  applied_discount NUMERIC;
  cost_basis NUMERIC;
BEGIN
  -- Get Primary Pricing (Pricing Hierarchy)
  SELECT ph.final_price, ph.discount_percentage
  INTO primary_price, applied_discount
  FROM dkegl_pricing_hierarchy ph
  WHERE ph.organization_id = _org_id 
    AND ph.item_code = _item_code
    AND ph.customer_tier = _customer_tier
    AND ph.is_active = true
    AND ph.effective_from <= CURRENT_DATE
    AND (ph.effective_until IS NULL OR ph.effective_until >= CURRENT_DATE)
    AND _quantity >= ph.min_quantity
    AND (_quantity <= ph.max_quantity OR ph.max_quantity IS NULL)
  ORDER BY ph.min_quantity DESC
  LIMIT 1;

  -- Get GRN Average Pricing (Last 90 days) - FIXED: Changed g.amount_inr to g.total_amount
  SELECT AVG(CASE WHEN g.qty_received > 0 AND g.total_amount > 0 
                  THEN g.total_amount / g.qty_received 
                  ELSE NULL END)
  INTO grn_avg_price
  FROM dkegl_grn_log g
  WHERE g.organization_id = _org_id 
    AND g.item_code = _item_code
    AND g.date >= CURRENT_DATE - INTERVAL '90 days';

  -- Get Item Master Cost
  SELECT COALESCE((im.pricing_info->>'unit_cost')::NUMERIC, 0)
  INTO master_cost
  FROM dkegl_item_master im
  WHERE im.organization_id = _org_id AND im.item_code = _item_code;

  -- Return pricing hierarchy
  IF primary_price IS NOT NULL THEN
    RETURN QUERY SELECT 
      'Pricing Master'::TEXT,
      primary_price,
      primary_price * _quantity,
      COALESCE(applied_discount, 0),
      CASE WHEN COALESCE(master_cost, 0) > 0 
           THEN ((primary_price - master_cost) / primary_price * 100)
           ELSE 0 END,
      true;
  END IF;

  IF grn_avg_price IS NOT NULL THEN
    RETURN QUERY SELECT 
      'GRN Average (90d)'::TEXT,
      grn_avg_price,
      grn_avg_price * _quantity,
      0::NUMERIC,
      CASE WHEN COALESCE(master_cost, 0) > 0 
           THEN ((grn_avg_price - master_cost) / grn_avg_price * 100)
           ELSE 0 END,
      primary_price IS NULL;
  END IF;

  IF master_cost IS NOT NULL AND master_cost > 0 THEN
    RETURN QUERY SELECT 
      'Item Master Cost'::TEXT,
      master_cost,
      master_cost * _quantity,
      0::NUMERIC,
      0::NUMERIC,
      primary_price IS NULL AND grn_avg_price IS NULL;
  END IF;
END;
$function$;

-- 2. Bulk update pricing master records using GRN weighted averages
-- First, create a function to calculate GRN weighted average for items
CREATE OR REPLACE FUNCTION dkegl_calculate_grn_weighted_average(_org_id uuid, _item_code text)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  weighted_avg NUMERIC := 0;
BEGIN
  SELECT 
    CASE 
      WHEN SUM(qty_received) > 0 
      THEN SUM(total_amount) / SUM(qty_received)
      ELSE 0 
    END
  INTO weighted_avg
  FROM dkegl_grn_log
  WHERE organization_id = _org_id 
    AND item_code = _item_code
    AND qty_received > 0 
    AND total_amount > 0
    AND date >= CURRENT_DATE - INTERVAL '12 months';
  
  RETURN COALESCE(weighted_avg, 0);
END;
$function$;

-- Update pricing master records with GRN-based weighted averages for items with 0 standard cost
WITH grn_averages AS (
  SELECT DISTINCT
    pm.organization_id,
    pm.item_code,
    dkegl_calculate_grn_weighted_average(pm.organization_id, pm.item_code) as grn_weighted_avg
  FROM dkegl_pricing_master pm
  WHERE pm.standard_cost = 0 
    AND pm.is_active = true
)
UPDATE dkegl_pricing_master pm
SET 
  standard_cost = ga.grn_weighted_avg,
  updated_at = now(),
  approval_status = CASE 
    WHEN ga.grn_weighted_avg > 0 THEN 'approved'
    ELSE pm.approval_status 
  END
FROM grn_averages ga
WHERE pm.organization_id = ga.organization_id 
  AND pm.item_code = ga.item_code
  AND ga.grn_weighted_avg > 0;

-- Clean up the temporary function
DROP FUNCTION IF EXISTS dkegl_calculate_grn_weighted_average(uuid, text);