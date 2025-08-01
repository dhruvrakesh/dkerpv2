-- Fix consolidation function to preserve original case from item_master
DROP FUNCTION IF EXISTS dkegl_consolidate_stock_locations(uuid);

CREATE OR REPLACE FUNCTION dkegl_consolidate_stock_locations(_org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  consolidated_count INTEGER := 0;
  correction_count INTEGER := 0;
  orphaned_count INTEGER := 0;
  item_record RECORD;
  total_qty NUMERIC;
  main_stock_id UUID;
  canonical_item_code TEXT;
BEGIN
  -- First, handle orphaned stock records (items not in item_master)
  FOR item_record IN 
    SELECT s.item_code, SUM(s.current_qty) as total_quantity
    FROM dkegl_stock s
    LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id 
      AND s.item_code = im.item_code
    WHERE s.organization_id = _org_id 
      AND im.item_code IS NULL
    GROUP BY s.item_code
  LOOP
    -- Log orphaned stock removal
    INSERT INTO dkegl_stock_corrections (
      organization_id, item_code, old_qty, new_qty,
      correction_type, reason, created_by
    ) VALUES (
      _org_id, item_record.item_code, item_record.total_quantity, 0,
      'orphaned_cleanup', 'Removed orphaned stock not in item master', auth.uid()
    );
    
    -- Remove orphaned stock records
    DELETE FROM dkegl_stock 
    WHERE organization_id = _org_id 
      AND item_code = item_record.item_code;
    
    orphaned_count := orphaned_count + 1;
  END LOOP;

  -- Process each valid item that has multiple locations or wrong location
  FOR item_record IN 
    SELECT 
      im.item_code as canonical_item_code,
      SUM(s.current_qty) as total_quantity,
      COUNT(*) as location_count,
      MAX(s.last_transaction_date) as latest_date,
      AVG(s.unit_cost) as avg_cost
    FROM dkegl_stock s
    INNER JOIN dkegl_item_master im ON s.organization_id = im.organization_id 
      AND s.item_code = im.item_code
    WHERE s.organization_id = _org_id
    GROUP BY im.item_code
    HAVING COUNT(*) > 1 OR MIN(LOWER(s.location)) != 'main-store'
  LOOP
    total_qty := item_record.total_quantity;
    canonical_item_code := item_record.canonical_item_code;
    
    -- Create or update main store record using canonical case from item_master
    INSERT INTO dkegl_stock (
      organization_id, item_code, location, current_qty, 
      unit_cost, last_transaction_date, last_updated
    ) VALUES (
      _org_id, canonical_item_code, 'MAIN-STORE', 
      total_qty, item_record.avg_cost, item_record.latest_date, NOW()
    )
    ON CONFLICT (organization_id, item_code, location)
    DO UPDATE SET 
      current_qty = total_qty,
      unit_cost = item_record.avg_cost,
      last_transaction_date = item_record.latest_date,
      last_updated = NOW()
    RETURNING id INTO main_stock_id;
    
    -- Log consolidation correction
    INSERT INTO dkegl_stock_corrections (
      organization_id, item_code, old_qty, new_qty, 
      correction_type, reason, created_by
    ) VALUES (
      _org_id, canonical_item_code, 0, total_qty,
      'consolidation', 'Location consolidation to MAIN-STORE', auth.uid()
    );
    
    -- Delete all other location records for this item
    DELETE FROM dkegl_stock 
    WHERE organization_id = _org_id 
      AND item_code = canonical_item_code 
      AND id != main_stock_id;
    
    consolidated_count := consolidated_count + 1;
  END LOOP;
  
  -- Fix negative stocks (only for valid items)
  FOR item_record IN 
    SELECT s.id, s.item_code, s.current_qty
    FROM dkegl_stock s
    INNER JOIN dkegl_item_master im ON s.organization_id = im.organization_id 
      AND s.item_code = im.item_code
    WHERE s.organization_id = _org_id AND s.current_qty < 0
  LOOP
    -- Log negative stock correction
    INSERT INTO dkegl_stock_corrections (
      organization_id, item_code, old_qty, new_qty,
      correction_type, reason, created_by
    ) VALUES (
      _org_id, item_record.item_code, item_record.current_qty, 0,
      'negative_fix', 'Negative stock corrected to zero', auth.uid()
    );
    
    -- Set to zero
    UPDATE dkegl_stock 
    SET current_qty = 0, last_updated = NOW()
    WHERE id = item_record.id;
    
    correction_count := correction_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'consolidated_items', consolidated_count,
    'negative_corrections', correction_count,
    'orphaned_removals', orphaned_count,
    'message', 'Stock consolidation completed successfully'
  );
END;
$$;

-- Execute the consolidation
SELECT dkegl_run_emergency_cleanup('DKEGL') as consolidation_result;