-- Execute the complete stock system test data activation
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

  -- Add comprehensive test items
  INSERT INTO dkegl_item_master (organization_id, category_id, item_code, item_name, uom, item_type, reorder_level, reorder_quantity, pricing_info, status) VALUES
  (org_id, cat_pkg, 'PKG_TEST', 'Test Packaging Film', 'KG', 'raw_material', 50, 200, '{"unit_cost": 100}', 'active'),
  (org_id, cat_pkg, 'PKG_SEAL', 'Sealing Film Premium', 'MTR', 'raw_material', 100, 500, '{"unit_cost": 75}', 'active'),
  (org_id, cat_pkg, 'PKG_BARRIER', 'High Barrier Layer Film', 'KG', 'raw_material', 25, 100, '{"unit_cost": 150}', 'active'),
  (org_id, cat_pkg, 'PKG_ADHESIVE', 'Adhesive Layer Material', 'KG', 'raw_material', 40, 150, '{"unit_cost": 120}', 'active'),
  (org_id, cat_pkg, 'PKG_PRINT', 'Printable Film Substrate', 'SQM', 'raw_material', 200, 800, '{"unit_cost": 85}', 'active');

  -- Add stock records with realistic opening quantities
  INSERT INTO dkegl_stock (organization_id, item_code, opening_qty, current_qty, unit_cost) VALUES
  (org_id, 'PKG_TEST', 500, 375, 100),
  (org_id, 'PKG_SEAL', 1000, 750, 75),
  (org_id, 'PKG_BARRIER', 200, 125, 150),
  (org_id, 'PKG_ADHESIVE', 300, 245, 120),
  (org_id, 'PKG_PRINT', 1500, 1200, 85);

  -- Add comprehensive GRN records (goods received over time)
  INSERT INTO dkegl_grn_log (organization_id, grn_number, item_code, date, qty_received, uom, total_amount, supplier_name) VALUES
  -- Recent GRNs (last 15 days)
  (org_id, 'GRN001', 'PKG_TEST', CURRENT_DATE - 15, 100, 'KG', 10000, 'ABC Plastics Ltd'),
  (org_id, 'GRN002', 'PKG_SEAL', CURRENT_DATE - 12, 200, 'MTR', 15000, 'XYZ Films Co'),
  (org_id, 'GRN003', 'PKG_BARRIER', CURRENT_DATE - 10, 50, 'KG', 7500, 'Premium Materials Inc'),
  (org_id, 'GRN004', 'PKG_ADHESIVE', CURRENT_DATE - 8, 80, 'KG', 9600, 'Chemical Solutions Ltd'),
  (org_id, 'GRN005', 'PKG_PRINT', CURRENT_DATE - 5, 300, 'SQM', 25500, 'Print Substrate Co'),
  (org_id, 'GRN006', 'PKG_TEST', CURRENT_DATE - 3, 75, 'KG', 7500, 'ABC Plastics Ltd'),
  -- Older GRNs (for trend analysis)
  (org_id, 'GRN007', 'PKG_SEAL', CURRENT_DATE - 25, 150, 'MTR', 11250, 'XYZ Films Co'),
  (org_id, 'GRN008', 'PKG_BARRIER', CURRENT_DATE - 35, 25, 'KG', 3750, 'Premium Materials Inc'),
  (org_id, 'GRN009', 'PKG_ADHESIVE', CURRENT_DATE - 40, 65, 'KG', 7800, 'Chemical Solutions Ltd');

  -- Add comprehensive issue records (materials consumed in production)
  INSERT INTO dkegl_issue_log (organization_id, issue_number, item_code, date, qty_issued, uom, purpose) VALUES
  -- Recent issues (last 30 days)
  (org_id, 'ISS001', 'PKG_TEST', CURRENT_DATE - 8, 150, 'KG', 'Production Order PO001'),
  (org_id, 'ISS002', 'PKG_SEAL', CURRENT_DATE - 6, 350, 'MTR', 'Production Order PO002'),
  (org_id, 'ISS003', 'PKG_BARRIER', CURRENT_DATE - 4, 75, 'KG', 'Production Order PO003'),
  (org_id, 'ISS004', 'PKG_ADHESIVE', CURRENT_DATE - 3, 45, 'KG', 'Production Order PO004'),
  (org_id, 'ISS005', 'PKG_PRINT', CURRENT_DATE - 2, 600, 'SQM', 'Large Order PO005'),
  (org_id, 'ISS006', 'PKG_TEST', CURRENT_DATE - 1, 50, 'KG', 'Sample Production'),
  -- Issues for 7-day consumption analysis
  (org_id, 'ISS007', 'PKG_SEAL', CURRENT_DATE - 5, 100, 'MTR', 'Rush Order PO006'),
  (org_id, 'ISS008', 'PKG_BARRIER', CURRENT_DATE - 7, 25, 'KG', 'Custom Job PO007'),
  -- Issues for 30-day and 90-day analysis
  (org_id, 'ISS009', 'PKG_TEST', CURRENT_DATE - 20, 75, 'KG', 'Monthly Production'),
  (org_id, 'ISS010', 'PKG_ADHESIVE', CURRENT_DATE - 25, 55, 'KG', 'Bulk Order PO008'),
  (org_id, 'ISS011', 'PKG_PRINT', CURRENT_DATE - 45, 400, 'SQM', 'Quarterly Order PO009'),
  (org_id, 'ISS012', 'PKG_SEAL', CURRENT_DATE - 60, 200, 'MTR', 'Export Order PO010'),
  (org_id, 'ISS013', 'PKG_BARRIER', CURRENT_DATE - 75, 50, 'KG', 'Special Project PO011');

  -- Generate the comprehensive stock summary
  PERFORM dkegl_refresh_stock_summary(org_id);

  RAISE NOTICE 'DKEGL Stock Analytics System Successfully Activated!';
  RAISE NOTICE '✓ Created 5 packaging material items with realistic data';
  RAISE NOTICE '✓ Added opening stock balances';
  RAISE NOTICE '✓ Created 9 GRN transactions over different time periods';
  RAISE NOTICE '✓ Added 13 issue transactions for consumption analysis';
  RAISE NOTICE '✓ Generated complete stock summary with analytics';
  RAISE NOTICE 'Navigate to /analytics/stock to view the complete dashboard';
END $$;