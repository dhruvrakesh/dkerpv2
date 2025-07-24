-- Clear and Refresh Stock Summary System
DO $$
DECLARE
  org_id UUID;
BEGIN
  -- Get organization
  SELECT id INTO org_id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1;
  
  -- Clear existing data
  DELETE FROM dkegl_stock_summary WHERE organization_id = org_id;
  DELETE FROM dkegl_daily_stock_snapshots WHERE organization_id = org_id;
  DELETE FROM dkegl_pricing_master WHERE organization_id = org_id;
  DELETE FROM dkegl_issue_log WHERE organization_id = org_id;
  DELETE FROM dkegl_grn_log WHERE organization_id = org_id;
  DELETE FROM dkegl_stock WHERE organization_id = org_id;
  DELETE FROM dkegl_item_master WHERE organization_id = org_id;

  -- Get existing category IDs
  DECLARE
    cat_pkg UUID;
    cat_raw UUID; 
    cat_con UUID;
  BEGIN
    SELECT id INTO cat_pkg FROM dkegl_categories WHERE organization_id = org_id AND category_code = 'PKG';
    SELECT id INTO cat_raw FROM dkegl_categories WHERE organization_id = org_id AND category_code = 'RAW';
    SELECT id INTO cat_con FROM dkegl_categories WHERE organization_id = org_id AND category_code = 'CON';

    -- Add fresh data
    INSERT INTO dkegl_item_master (organization_id, category_id, item_code, item_name, uom, item_type, reorder_level, reorder_quantity, pricing_info, status) VALUES
    (org_id, cat_pkg, 'PKG_001', 'BOPP Film 20 Micron', 'KG', 'raw_material', 100, 500, '{"unit_cost": 120}', 'active'),
    (org_id, cat_pkg, 'PKG_002', 'PE Film 25 Micron', 'KG', 'raw_material', 80, 400, '{"unit_cost": 95}', 'active'),
    (org_id, cat_raw, 'RAW_001', 'Printing Ink - Cyan', 'KG', 'raw_material', 30, 100, '{"unit_cost": 450}', 'active'),
    (org_id, cat_raw, 'RAW_002', 'Solvent - Ethyl Acetate', 'LTR', 'raw_material', 100, 500, '{"unit_cost": 85}', 'active'),
    (org_id, cat_con, 'CON_001', 'Printing Blanket', 'PCS', 'consumable', 5, 20, '{"unit_cost": 2500}', 'active'),
    (org_id, cat_con, 'CON_002', 'Doctor Blade', 'PCS', 'consumable', 10, 50, '{"unit_cost": 180}', 'active');

    INSERT INTO dkegl_stock (organization_id, item_code, opening_qty, current_qty, unit_cost) VALUES
    (org_id, 'PKG_001', 250, 180, 120), (org_id, 'PKG_002', 320, 225, 95), (org_id, 'RAW_001', 75, 45, 450),
    (org_id, 'RAW_002', 300, 180, 85), (org_id, 'CON_001', 15, 8, 2500), (org_id, 'CON_002', 35, 22, 180);

    INSERT INTO dkegl_grn_log (organization_id, grn_number, item_code, date, qty_received, uom, total_amount, supplier_name) VALUES
    (org_id, 'GRN24001', 'PKG_001', CURRENT_DATE - 5, 100, 'KG', 12000, 'Uflex Ltd'),
    (org_id, 'GRN24002', 'PKG_002', CURRENT_DATE - 8, 150, 'KG', 14250, 'Polyplex Corp'),
    (org_id, 'GRN24003', 'RAW_001', CURRENT_DATE - 12, 50, 'KG', 22500, 'Siegwerk India'),
    (org_id, 'GRN24004', 'RAW_002', CURRENT_DATE - 15, 200, 'LTR', 17000, 'Chemanol India'),
    (org_id, 'GRN24005', 'CON_001', CURRENT_DATE - 30, 10, 'PCS', 25000, 'Heidelberg Equip'),
    (org_id, 'GRN24006', 'CON_002', CURRENT_DATE - 18, 25, 'PCS', 4500, 'Komori India');

    INSERT INTO dkegl_issue_log (organization_id, issue_number, item_code, date, qty_issued, uom, purpose) VALUES
    (org_id, 'ISS24001', 'PKG_001', CURRENT_DATE - 2, 25, 'KG', 'Production Order PO-2024-001'),
    (org_id, 'ISS24002', 'PKG_002', CURRENT_DATE - 3, 35, 'KG', 'Production Order PO-2024-002'),
    (org_id, 'ISS24003', 'RAW_001', CURRENT_DATE - 4, 8, 'KG', 'Printing Job J-001'),
    (org_id, 'ISS24004', 'RAW_002', CURRENT_DATE - 5, 80, 'LTR', 'Cleaning Process'),
    (org_id, 'ISS24005', 'CON_001', CURRENT_DATE - 15, 2, 'PCS', 'Press Setup'),
    (org_id, 'ISS24006', 'CON_002', CURRENT_DATE - 6, 3, 'PCS', 'Machine Maintenance');

    INSERT INTO dkegl_pricing_master (organization_id, item_code, standard_cost, valuation_method, price_tolerance_percentage, approval_status, effective_from) VALUES
    (org_id, 'PKG_001', 120, 'standard_cost', 5.0, 'approved', CURRENT_DATE - 30),
    (org_id, 'PKG_002', 95, 'weighted_average', 7.0, 'approved', CURRENT_DATE - 30),
    (org_id, 'RAW_001', 450, 'standard_cost', 10.0, 'approved', CURRENT_DATE - 30),
    (org_id, 'RAW_002', 85, 'weighted_average', 8.0, 'approved', CURRENT_DATE - 30),
    (org_id, 'CON_001', 2500, 'standard_cost', 15.0, 'approved', CURRENT_DATE - 30),
    (org_id, 'CON_002', 180, 'standard_cost', 12.0, 'approved', CURRENT_DATE - 30);

    -- Generate analytics
    PERFORM dkegl_refresh_stock_summary(org_id);
    PERFORM dkegl_capture_daily_stock_snapshot(org_id);

    RAISE NOTICE 'Stock Summary System SUCCESSFULLY ACTIVATED with complete analytics!';
  END;
END $$;