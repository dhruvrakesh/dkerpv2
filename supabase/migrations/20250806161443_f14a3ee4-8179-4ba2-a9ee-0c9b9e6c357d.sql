-- Fix the dkegl_reconcile_stock_data function to use correct column name
DROP FUNCTION IF EXISTS public.dkegl_reconcile_stock_data(uuid);

CREATE OR REPLACE FUNCTION public.dkegl_reconcile_stock_data(p_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  reconciled_count INTEGER := 0;
  total_count INTEGER := 0;
  result_data JSONB;
BEGIN
  -- Get total count of items to process
  SELECT COUNT(*) INTO total_count
  FROM dkegl_item_master im
  WHERE im.organization_id = p_org_id
    AND im.status = 'active';

  -- Update stock based on calculated quantities from transactions
  WITH stock_calculations AS (
    SELECT 
      im.item_code,
      im.organization_id,
      -- Opening stock (sum all opening stock entries) - FIXED: use opening_qty not quantity
      COALESCE(
        (SELECT SUM(os.opening_qty) 
         FROM dkegl_opening_stock os 
         WHERE os.organization_id = im.organization_id 
           AND os.item_code = im.item_code), 0
      ) as opening_qty,
      
      -- Total GRN received
      COALESCE(
        (SELECT SUM(grn.qty_received) 
         FROM dkegl_grn_log grn 
         WHERE grn.organization_id = im.organization_id 
           AND grn.item_code = im.item_code), 0
      ) as total_grn_qty,
      
      -- Total issued
      COALESCE(
        (SELECT SUM(iss.qty_issued) 
         FROM dkegl_issue_log iss 
         WHERE iss.organization_id = im.organization_id 
           AND iss.item_code = im.item_code), 0
      ) as total_issued_qty
    FROM dkegl_item_master im
    WHERE im.organization_id = p_org_id
      AND im.status = 'active'
  ),
  calculated_stock AS (
    SELECT 
      sc.*,
      (sc.opening_qty + sc.total_grn_qty - sc.total_issued_qty) as calculated_current_qty
    FROM stock_calculations sc
  )
  -- Insert or update stock records with calculated quantities
  INSERT INTO dkegl_stock (
    organization_id,
    item_code,
    current_qty,
    unit_cost,
    location,
    last_transaction_date,
    last_updated
  )
  SELECT 
    cs.organization_id,
    cs.item_code,
    cs.calculated_current_qty,
    0, -- Unit cost will be updated separately
    'main_warehouse',
    CURRENT_DATE,
    NOW()
  FROM calculated_stock cs
  ON CONFLICT (organization_id, item_code, location)
  DO UPDATE SET
    current_qty = EXCLUDED.current_qty,
    last_updated = NOW(),
    last_transaction_date = CASE 
      WHEN EXCLUDED.current_qty != dkegl_stock.current_qty 
      THEN CURRENT_DATE 
      ELSE dkegl_stock.last_transaction_date 
    END;

  -- Get count of reconciled items
  GET DIAGNOSTICS reconciled_count = ROW_COUNT;

  -- Build result
  result_data := jsonb_build_object(
    'success', true,
    'reconciled_items', reconciled_count,
    'total_items', total_count,
    'consolidated_location', 'main_warehouse',
    'calculation_formula', 'opening_qty + total_grn_qty - total_issued_qty',
    'reconciliation_timestamp', NOW()
  );

  RETURN result_data;
END;
$function$;

-- Add sample opening stock data for key items
INSERT INTO dkegl_opening_stock (
  organization_id, 
  item_code, 
  opening_qty, 
  unit_cost, 
  total_value,
  opening_date,
  location,
  remarks
) VALUES 
(
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  'BOP_650_kg_50',
  1000.00,
  25.50,
  25500.00,
  CURRENT_DATE,
  'main_warehouse',
  'Initial opening stock - 1000 kg @ ₹25.50/kg'
),
(
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  'MDO_1000_ft_30',
  500.00,
  18.75,
  9375.00,
  CURRENT_DATE,
  'main_warehouse',
  'Initial opening stock - 500 ft @ ₹18.75/ft'
),
(
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  'LDO_800_mt_25',
  750.00,
  22.80,
  17100.00,
  CURRENT_DATE,
  'main_warehouse',
  'Initial opening stock - 750 mt @ ₹22.80/mt'
)
ON CONFLICT (organization_id, item_code, location, opening_date) 
DO UPDATE SET
  opening_qty = EXCLUDED.opening_qty,
  unit_cost = EXCLUDED.unit_cost,
  total_value = EXCLUDED.total_value,
  remarks = EXCLUDED.remarks,
  updated_at = NOW();