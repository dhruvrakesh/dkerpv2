-- Execute the stock system activation with test data
DO $$
DECLARE
  org_id UUID;
  cat_pkg UUID;
BEGIN
  -- Get organization
  SELECT id INTO org_id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1;
  
  -- Check if test data already exists
  IF EXISTS (SELECT 1 FROM dkegl_item_master WHERE organization_id = org_id AND item_code = 'PKG_TEST') THEN
    RAISE NOTICE 'Test data already exists, refreshing summary only';
    PERFORM dkegl_refresh_stock_summary(org_id);
    RETURN;
  END IF;

  -- Create packaging category if it doesn't exist
  INSERT INTO dkegl_categories (organization_id, category_name, category_code, description, is_active)
  VALUES (org_id, 'Packaging Materials', 'PKG', 'Flexible packaging films and materials', true)
  ON CONFLICT (organization_id, category_code) DO NOTHING
  RETURNING id INTO cat_pkg;
  
  -- Get category ID if already exists
  IF cat_pkg IS NULL THEN
    SELECT id INTO cat_pkg FROM dkegl_categories WHERE organization_id = org_id AND category_code = 'PKG';
  END IF;

  -- Add test items
  INSERT INTO dkegl_item_master (organization_id, category_id, item_code, item_name, uom, item_type, reorder_level, reorder_quantity, pricing_info, status) VALUES
  (org_id, cat_pkg, 'PKG_TEST', 'Test Packaging Film', 'KG', 'raw_material', 50, 200, '{"unit_cost": 100}', 'active'),
  (org_id, cat_pkg, 'PKG_SEAL', 'Sealing Film', 'MTR', 'raw_material', 100, 500, '{"unit_cost": 75}', 'active'),
  (org_id, cat_pkg, 'PKG_BARRIER', 'Barrier Layer Film', 'KG', 'raw_material', 25, 100, '{"unit_cost": 150}', 'active');

  -- Add stock for these items with opening quantities
  INSERT INTO dkegl_stock (organization_id, item_code, opening_qty, current_qty, unit_cost) VALUES
  (org_id, 'PKG_TEST', 500, 425, 100),
  (org_id, 'PKG_SEAL', 1000, 850, 75),
  (org_id, 'PKG_BARRIER', 200, 175, 150);

  -- Add GRN records (goods received)
  INSERT INTO dkegl_grn_log (organization_id, grn_number, item_code, date, qty_received, uom, total_amount, supplier_name) VALUES
  (org_id, 'GRN001', 'PKG_TEST', CURRENT_DATE - 15, 100, 'KG', 10000, 'ABC Plastics Ltd'),
  (org_id, 'GRN002', 'PKG_SEAL', CURRENT_DATE - 12, 200, 'MTR', 15000, 'XYZ Films Co'),
  (org_id, 'GRN003', 'PKG_BARRIER', CURRENT_DATE - 10, 50, 'KG', 7500, 'Premium Materials Inc'),
  (org_id, 'GRN004', 'PKG_TEST', CURRENT_DATE - 5, 75, 'KG', 7500, 'ABC Plastics Ltd');

  -- Add issue records (materials used/issued)
  INSERT INTO dkegl_issue_log (organization_id, issue_number, item_code, date, qty_issued, uom, purpose) VALUES
  (org_id, 'ISS001', 'PKG_TEST', CURRENT_DATE - 8, 150, 'KG', 'Production Order PO001'),
  (org_id, 'ISS002', 'PKG_SEAL', CURRENT_DATE - 6, 350, 'MTR', 'Production Order PO002'),
  (org_id, 'ISS003', 'PKG_BARRIER', CURRENT_DATE - 4, 75, 'KG', 'Production Order PO003'),
  (org_id, 'ISS004', 'PKG_TEST', CURRENT_DATE - 2, 25, 'KG', 'Sample Production');

  -- Generate the stock summary
  PERFORM dkegl_refresh_stock_summary(org_id);

  RAISE NOTICE 'Complete stock system activated with realistic test data';
  RAISE NOTICE 'Items created: PKG_TEST, PKG_SEAL, PKG_BARRIER';
  RAISE NOTICE 'Stock summary generated with opening, GRN, and issue transactions';
END $$;