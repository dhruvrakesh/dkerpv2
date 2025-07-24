-- Simple Stock Data Addition
DO $$
DECLARE
  org_id UUID;
  cat_pkg UUID;
BEGIN
  -- Get organization
  SELECT id INTO org_id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1;
  SELECT id INTO cat_pkg FROM dkegl_categories WHERE organization_id = org_id AND category_code = 'PKG' LIMIT 1;

  -- Add just one item to test
  INSERT INTO dkegl_item_master (organization_id, category_id, item_code, item_name, uom, item_type, reorder_level, reorder_quantity, pricing_info, status) 
  VALUES (org_id, cat_pkg, 'PKG_TEST', 'Test Film Package', 'KG', 'raw_material', 50, 200, '{"unit_cost": 100}', 'active');

  -- Add stock for this item
  INSERT INTO dkegl_stock (organization_id, item_code, opening_qty, current_qty, unit_cost) 
  VALUES (org_id, 'PKG_TEST', 100, 75, 100);

  -- Add one GRN
  INSERT INTO dkegl_grn_log (organization_id, grn_number, item_code, date, qty_received, uom, total_amount, supplier_name) 
  VALUES (org_id, 'GRN_TEST', 'PKG_TEST', CURRENT_DATE - 10, 50, 'KG', 5000, 'Test Supplier');

  -- Add one issue
  INSERT INTO dkegl_issue_log (organization_id, issue_number, item_code, date, qty_issued, uom, purpose) 
  VALUES (org_id, 'ISS_TEST', 'PKG_TEST', CURRENT_DATE - 2, 25, 'KG', 'Test Production');

  -- Generate summary
  PERFORM dkegl_refresh_stock_summary(org_id);

  RAISE NOTICE 'Basic stock system activated with test data';
END $$;