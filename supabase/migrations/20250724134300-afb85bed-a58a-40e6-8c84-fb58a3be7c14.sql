-- Activate Stock Summary System with Comprehensive Sample Data (Fixed)
DO $$
DECLARE
  org_id UUID;
  cat_packaging_id UUID;
  cat_raw_material_id UUID;
  cat_consumables_id UUID;
BEGIN
  -- Get DKEGL organization ID
  SELECT id INTO org_id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1;
  
  IF org_id IS NULL THEN
    RAISE EXCEPTION 'DKEGL organization not found';
  END IF;

  -- Insert Categories with required category_code
  INSERT INTO dkegl_categories (id, organization_id, category_name, category_code, description, is_active) VALUES
  (gen_random_uuid(), org_id, 'Packaging Materials', 'PKG', 'Flexible packaging and films', true),
  (gen_random_uuid(), org_id, 'Raw Materials', 'RAW', 'Base materials for production', true),
  (gen_random_uuid(), org_id, 'Consumables', 'CON', 'Production consumables and supplies', true)
  ON CONFLICT (organization_id, category_code) DO NOTHING;

  -- Get category IDs
  SELECT id INTO cat_packaging_id FROM dkegl_categories WHERE organization_id = org_id AND category_code = 'PKG';
  SELECT id INTO cat_raw_material_id FROM dkegl_categories WHERE organization_id = org_id AND category_code = 'RAW';
  SELECT id INTO cat_consumables_id FROM dkegl_categories WHERE organization_id = org_id AND category_code = 'CON';

  -- Insert Sample Items
  INSERT INTO dkegl_item_master (
    organization_id, category_id, item_code, item_name, uom, item_type,
    reorder_level, reorder_quantity, pricing_info, status
  ) VALUES
  -- Packaging Materials
  (org_id, cat_packaging_id, 'PKG_001', 'BOPP Film 20 Micron', 'KG', 'raw_material', 100, 500, '{"unit_cost": 120}', 'active'),
  (org_id, cat_packaging_id, 'PKG_002', 'PE Film 25 Micron', 'KG', 'raw_material', 80, 400, '{"unit_cost": 95}', 'active'),
  (org_id, cat_packaging_id, 'PKG_003', 'Metalized BOPP Film', 'KG', 'raw_material', 50, 200, '{"unit_cost": 180}', 'active'),
  (org_id, cat_packaging_id, 'PKG_004', 'Barrier Film Laminate', 'SQM', 'raw_material', 200, 1000, '{"unit_cost": 25}', 'active'),
  -- Raw Materials
  (org_id, cat_raw_material_id, 'RAW_001', 'Printing Ink - Cyan', 'KG', 'raw_material', 30, 100, '{"unit_cost": 450}', 'active'),
  (org_id, cat_raw_material_id, 'RAW_002', 'Printing Ink - Magenta', 'KG', 'raw_material', 30, 100, '{"unit_cost": 465}', 'active'),
  (org_id, cat_raw_material_id, 'RAW_003', 'Adhesive PU Base', 'KG', 'raw_material', 40, 150, '{"unit_cost": 320}', 'active'),
  (org_id, cat_raw_material_id, 'RAW_004', 'Solvent - Ethyl Acetate', 'LTR', 'raw_material', 100, 500, '{"unit_cost": 85}', 'active'),
  -- Consumables
  (org_id, cat_consumables_id, 'CON_001', 'Printing Blanket', 'PCS', 'consumable', 5, 20, '{"unit_cost": 2500}', 'active'),
  (org_id, cat_consumables_id, 'CON_002', 'Doctor Blade', 'PCS', 'consumable', 10, 50, '{"unit_cost": 180}', 'active'),
  (org_id, cat_consumables_id, 'CON_003', 'Anilox Roller', 'PCS', 'consumable', 2, 5, '{"unit_cost": 15000}', 'active'),
  (org_id, cat_consumables_id, 'CON_004', 'Cleaning Chemicals', 'LTR', 'consumable', 50, 200, '{"unit_cost": 125}', 'active')
  ON CONFLICT (organization_id, item_code) DO NOTHING;

  -- Insert Opening Stock
  INSERT INTO dkegl_stock (organization_id, item_code, opening_qty, current_qty, unit_cost) VALUES
  (org_id, 'PKG_001', 250, 180, 120),
  (org_id, 'PKG_002', 320, 225, 95),
  (org_id, 'PKG_003', 150, 85, 180),
  (org_id, 'PKG_004', 800, 650, 25),
  (org_id, 'RAW_001', 75, 45, 450),
  (org_id, 'RAW_002', 80, 52, 465),
  (org_id, 'RAW_003', 120, 95, 320),
  (org_id, 'RAW_004', 300, 180, 85),
  (org_id, 'CON_001', 15, 8, 2500),
  (org_id, 'CON_002', 35, 22, 180),
  (org_id, 'CON_003', 4, 2, 15000),
  (org_id, 'CON_004', 150, 85, 125)
  ON CONFLICT (organization_id, item_code, location) DO NOTHING;

  -- Insert GRN Logs (Goods Received)
  INSERT INTO dkegl_grn_log (
    organization_id, grn_number, item_code, date, qty_received, total_amount, supplier_name
  ) VALUES
  -- Recent receipts (last 30 days)
  (org_id, 'GRN24001', 'PKG_001', CURRENT_DATE - 5, 100, 12000, 'Uflex Ltd'),
  (org_id, 'GRN24002', 'PKG_002', CURRENT_DATE - 8, 150, 14250, 'Polyplex Corporation'),
  (org_id, 'GRN24003', 'RAW_001', CURRENT_DATE - 12, 50, 22500, 'Siegwerk India'),
  (org_id, 'GRN24004', 'RAW_004', CURRENT_DATE - 15, 200, 17000, 'Chemanol India'),
  (org_id, 'GRN24005', 'CON_002', CURRENT_DATE - 18, 25, 4500, 'Heidelberg Equipment'),
  -- Older receipts (31-90 days)
  (org_id, 'GRN23045', 'PKG_003', CURRENT_DATE - 45, 80, 14400, 'Cosmo Films'),
  (org_id, 'GRN23046', 'RAW_003', CURRENT_DATE - 50, 75, 24000, 'Covestro India'),
  (org_id, 'GRN23047', 'CON_001', CURRENT_DATE - 60, 10, 25000, 'Komori India'),
  (org_id, 'GRN23048', 'PKG_004', CURRENT_DATE - 70, 500, 12500, 'Jindal Poly Films'),
  (org_id, 'GRN23049', 'CON_004', CURRENT_DATE - 80, 100, 12500, 'Henkel Adhesives')
  ON CONFLICT (organization_id, grn_number, item_code) DO NOTHING;

  -- Insert Issue Logs (Materials Issued)
  INSERT INTO dkegl_issue_log (
    organization_id, item_code, date, qty_issued, purpose
  ) VALUES
  -- Recent issues (last 7 days)
  (org_id, 'PKG_001', CURRENT_DATE - 2, 25, 'Production Order PO-2024-001'),
  (org_id, 'PKG_002', CURRENT_DATE - 3, 35, 'Production Order PO-2024-002'),
  (org_id, 'RAW_001', CURRENT_DATE - 4, 8, 'Printing Job J-001'),
  (org_id, 'RAW_002', CURRENT_DATE - 5, 10, 'Printing Job J-002'),
  (org_id, 'CON_002', CURRENT_DATE - 6, 3, 'Machine Maintenance'),
  -- Medium term issues (8-30 days)
  (org_id, 'PKG_003', CURRENT_DATE - 15, 45, 'Export Order EX-2024-001'),
  (org_id, 'RAW_003', CURRENT_DATE - 20, 15, 'Lamination Process'),
  (org_id, 'RAW_004', CURRENT_DATE - 25, 80, 'Cleaning & Maintenance'),
  (org_id, 'CON_001', CURRENT_DATE - 28, 2, 'Press Setup'),
  -- Older issues (31-90 days)
  (org_id, 'PKG_001', CURRENT_DATE - 40, 45, 'Production Order PO-2023-089'),
  (org_id, 'PKG_002', CURRENT_DATE - 50, 60, 'Production Order PO-2023-090'),
  (org_id, 'RAW_001', CURRENT_DATE - 55, 12, 'Color Matching'),
  (org_id, 'CON_003', CURRENT_DATE - 65, 1, 'Quality Control'),
  (org_id, 'CON_004', CURRENT_DATE - 75, 40, 'Equipment Cleaning')
  ON CONFLICT DO NOTHING;

  -- Insert Pricing Master Data
  INSERT INTO dkegl_pricing_master (
    organization_id, item_code, standard_cost, valuation_method, 
    price_tolerance_percentage, approval_status, effective_from
  ) VALUES
  (org_id, 'PKG_001', 120, 'standard_cost', 5.0, 'approved', CURRENT_DATE - 30),
  (org_id, 'PKG_002', 95, 'weighted_average', 7.0, 'approved', CURRENT_DATE - 30),
  (org_id, 'PKG_003', 180, 'standard_cost', 8.0, 'approved', CURRENT_DATE - 30),
  (org_id, 'PKG_004', 25, 'weighted_average', 6.0, 'approved', CURRENT_DATE - 30),
  (org_id, 'RAW_001', 450, 'standard_cost', 10.0, 'approved', CURRENT_DATE - 30),
  (org_id, 'RAW_002', 465, 'standard_cost', 10.0, 'approved', CURRENT_DATE - 30),
  (org_id, 'RAW_003', 320, 'fifo', 12.0, 'approved', CURRENT_DATE - 30),
  (org_id, 'RAW_004', 85, 'weighted_average', 8.0, 'approved', CURRENT_DATE - 30),
  (org_id, 'CON_001', 2500, 'standard_cost', 15.0, 'approved', CURRENT_DATE - 30),
  (org_id, 'CON_002', 180, 'standard_cost', 12.0, 'approved', CURRENT_DATE - 30),
  (org_id, 'CON_003', 15000, 'standard_cost', 20.0, 'approved', CURRENT_DATE - 30),
  (org_id, 'CON_004', 125, 'weighted_average', 10.0, 'approved', CURRENT_DATE - 30)
  ON CONFLICT (organization_id, item_code) DO NOTHING;

  -- Generate Stock Summary
  PERFORM dkegl_refresh_stock_summary(org_id);
  
  -- Create Daily Stock Snapshot
  PERFORM dkegl_capture_daily_stock_snapshot(org_id);

  RAISE NOTICE 'Stock Summary System Activated with % items and comprehensive analytics', (SELECT COUNT(*) FROM dkegl_item_master WHERE organization_id = org_id);
END $$;