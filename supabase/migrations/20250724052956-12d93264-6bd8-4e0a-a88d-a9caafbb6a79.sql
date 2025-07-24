-- Test Data for Inventory Management System
-- This creates sample data to test the complete workflow: Item Master → Opening Stock → GRNs → Issues → Current Stock

-- First, get the DKEGL organization ID
DO $$
DECLARE
    dkegl_org_id UUID;
    test_category_id UUID;
    raw_material_cat_id UUID;
    packaging_cat_id UUID;
BEGIN
    -- Get DKEGL organization
    SELECT id INTO dkegl_org_id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1;
    
    -- Create test categories
    INSERT INTO dkegl_categories (organization_id, category_name, category_code, description) VALUES
    (dkegl_org_id, 'Raw Materials', 'RAW', 'Raw materials for production') RETURNING id INTO raw_material_cat_id;
    
    INSERT INTO dkegl_categories (organization_id, category_name, category_code, description) VALUES
    (dkegl_org_id, 'Packaging Materials', 'PKG', 'Packaging and finishing materials') RETURNING id INTO packaging_cat_id;
    
    INSERT INTO dkegl_categories (organization_id, category_name, category_code, description) VALUES
    (dkegl_org_id, 'Testing Materials', 'TST', 'Materials for quality testing') RETURNING id INTO test_category_id;
    
    -- Create test item master records
    INSERT INTO dkegl_item_master (
        organization_id, category_id, item_code, item_name, uom, 
        reorder_level, reorder_quantity, specifications, status
    ) VALUES
    (dkegl_org_id, raw_material_cat_id, 'RAW_ADHESIVE_001', 'Acrylic Adhesive - Clear', 'KG', 50, 200, '{"type": "adhesive", "color": "clear", "viscosity": "medium"}', 'active'),
    (dkegl_org_id, raw_material_cat_id, 'RAW_FILM_001', 'BOPP Film - 20 Micron', 'SQM', 100, 500, '{"thickness": "20", "type": "BOPP", "width": "1000mm"}', 'active'),
    (dkegl_org_id, packaging_cat_id, 'PKG_CORE_001', 'Paper Core - 3 inch', 'PCS', 25, 100, '{"diameter": "3inch", "material": "paper"}', 'active'),
    (dkegl_org_id, test_category_id, 'TST_SOLVENT_001', 'Test Solvent - MEK', 'LTR', 10, 50, '{"type": "MEK", "purity": "99.5%"}', 'active'),
    (dkegl_org_id, raw_material_cat_id, 'RAW_INK_001', 'Printing Ink - Black', 'KG', 20, 100, '{"color": "black", "type": "solvent_based"}', 'active');
    
    -- Create opening stock entries (Mar 31, 2025)
    INSERT INTO dkegl_stock (
        organization_id, item_code, opening_qty, current_qty, 
        location, last_transaction_date, last_updated
    ) VALUES
    (dkegl_org_id, 'RAW_ADHESIVE_001', 75.5, 75.5, 'WAREHOUSE_A', '2025-03-31', now()),
    (dkegl_org_id, 'RAW_FILM_001', 250.0, 250.0, 'WAREHOUSE_A', '2025-03-31', now()),
    (dkegl_org_id, 'PKG_CORE_001', 150, 150, 'WAREHOUSE_B', '2025-03-31', now()),
    (dkegl_org_id, 'TST_SOLVENT_001', 15.5, 15.5, 'LAB_STORE', '2025-03-31', now()),
    (dkegl_org_id, 'RAW_INK_001', 45.0, 45.0, 'WAREHOUSE_A', '2025-03-31', now());
    
    -- Create test GRN entries (April 2025)
    INSERT INTO dkegl_grn_log (
        organization_id, grn_number, item_code, date, qty_received, uom,
        supplier_name, invoice_number, invoice_date, unit_rate, total_amount,
        quality_status, remarks
    ) VALUES
    (dkegl_org_id, 'GRN/2025/001', 'RAW_ADHESIVE_001', '2025-04-02', 100.0, 'KG', 
     'Adhesive Suppliers Ltd', 'INV/001/2025', '2025-04-01', 850.0, 85000.0, 'approved', 'Quality tested and approved'),
    (dkegl_org_id, 'GRN/2025/002', 'RAW_FILM_001', '2025-04-03', 500.0, 'SQM',
     'Film Industries Pvt Ltd', 'FI/2025/045', '2025-04-02', 125.0, 62500.0, 'approved', 'Standard quality BOPP film'),
    (dkegl_org_id, 'GRN/2025/003', 'PKG_CORE_001', '2025-04-05', 200, 'PCS',
     'Core Manufacturing Co', 'CMC/789', '2025-04-04', 15.0, 3000.0, 'approved', 'Good quality cores'),
    (dkegl_org_id, 'GRN/2025/004', 'RAW_INK_001', '2025-04-08', 50.0, 'KG',
     'Ink Solutions Inc', 'ISI/2025/123', '2025-04-07', 1200.0, 60000.0, 'in_review', 'Pending quality check');
    
    -- Create test issue entries (April 2025)
    INSERT INTO dkegl_issue_log (
        organization_id, issue_number, item_code, date, qty_issued, uom,
        department, purpose, remarks
    ) VALUES
    (dkegl_org_id, 'ISS/2025/001', 'RAW_ADHESIVE_001', '2025-04-10', 25.0, 'KG',
     'Production', 'Tape manufacturing - Batch A001', 'For urgent order completion'),
    (dkegl_org_id, 'ISS/2025/002', 'RAW_FILM_001', '2025-04-10', 120.0, 'SQM',
     'Production', 'Tape manufacturing - Batch A001', 'Standard production issue'),
    (dkegl_org_id, 'ISS/2025/003', 'PKG_CORE_001', '2025-04-12', 50, 'PCS',
     'Production', 'Roll packaging', 'For finished goods packaging'),
    (dkegl_org_id, 'ISS/2025/004', 'TST_SOLVENT_001', '2025-04-15', 2.5, 'LTR',
     'Quality', 'Adhesion testing', 'Weekly quality tests'),
    (dkegl_org_id, 'ISS/2025/005', 'RAW_ADHESIVE_001', '2025-04-18', 30.0, 'KG',
     'Production', 'Tape manufacturing - Batch B002', 'Second batch production'),
    (dkegl_org_id, 'ISS/2025/006', 'RAW_FILM_001', '2025-04-20', 80.0, 'SQM',
     'Production', 'Tape manufacturing - Batch B002', 'Continuing production');
     
    RAISE NOTICE 'Test data created successfully for DKEGL organization: %', dkegl_org_id;
END $$;