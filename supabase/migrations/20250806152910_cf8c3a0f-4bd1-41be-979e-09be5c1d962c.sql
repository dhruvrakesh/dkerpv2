-- Fix the dkegl_reconcile_stock_data function to resolve ambiguous column reference
CREATE OR REPLACE FUNCTION public.dkegl_reconcile_stock_data(_org_id uuid)
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
  WHERE im.organization_id = _org_id
    AND im.status = 'active';

  -- Update stock based on calculated quantities from transactions
  WITH stock_calculations AS (
    SELECT 
      im.item_code,
      im.organization_id,
      -- Opening stock (sum all opening stock entries)
      COALESCE(
        (SELECT SUM(os.quantity) 
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
    WHERE im.organization_id = _org_id
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