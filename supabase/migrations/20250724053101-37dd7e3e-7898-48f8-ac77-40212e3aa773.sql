-- Test Data for Inventory Management System (Safe Insert)
-- This creates sample data only if it doesn't exist

DO $$
DECLARE
    dkegl_org_id UUID;
    raw_material_cat_id UUID;
    packaging_cat_id UUID;
    test_category_id UUID;
BEGIN
    -- Get DKEGL organization
    SELECT id INTO dkegl_org_id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1;
    
    -- Get or create test categories
    SELECT id INTO raw_material_cat_id FROM dkegl_categories 
    WHERE organization_id = dkegl_org_id AND category_code = 'RAW';
    
    IF raw_material_cat_id IS NULL THEN
        INSERT INTO dkegl_categories (organization_id, category_name, category_code, description) VALUES
        (dkegl_org_id, 'Raw Materials', 'RAW', 'Raw materials for production') RETURNING id INTO raw_material_cat_id;
    END IF;
    
    SELECT id INTO packaging_cat_id FROM dkegl_categories 
    WHERE organization_id = dkegl_org_id AND category_code = 'PKG';
    
    IF packaging_cat_id IS NULL THEN
        INSERT INTO dkegl_categories (organization_id, category_name, category_code, description) VALUES
        (dkegl_org_id, 'Packaging Materials', 'PKG', 'Packaging and finishing materials') RETURNING id INTO packaging_cat_id;
    END IF;
    
    -- Create test item master records only if they don't exist
    INSERT INTO dkegl_item_master (
        organization_id, category_id, item_code, item_name, uom, 
        reorder_level, reorder_quantity, specifications, status
    ) 
    SELECT dkegl_org_id, raw_material_cat_id, 'RAW_ADHESIVE_001', 'Acrylic Adhesive - Clear', 'KG', 50, 200, '{"type": "adhesive", "color": "clear", "viscosity": "medium"}', 'active'
    WHERE NOT EXISTS (SELECT 1 FROM dkegl_item_master WHERE organization_id = dkegl_org_id AND item_code = 'RAW_ADHESIVE_001');
    
    INSERT INTO dkegl_item_master (
        organization_id, category_id, item_code, item_name, uom, 
        reorder_level, reorder_quantity, specifications, status
    )
    SELECT dkegl_org_id, raw_material_cat_id, 'RAW_FILM_001', 'BOPP Film - 20 Micron', 'SQM', 100, 500, '{"thickness": "20", "type": "BOPP", "width": "1000mm"}', 'active'
    WHERE NOT EXISTS (SELECT 1 FROM dkegl_item_master WHERE organization_id = dkegl_org_id AND item_code = 'RAW_FILM_001');
    
    INSERT INTO dkegl_item_master (
        organization_id, category_id, item_code, item_name, uom, 
        reorder_level, reorder_quantity, specifications, status
    )
    SELECT dkegl_org_id, packaging_cat_id, 'PKG_CORE_001', 'Paper Core - 3 inch', 'PCS', 25, 100, '{"diameter": "3inch", "material": "paper"}', 'active'
    WHERE NOT EXISTS (SELECT 1 FROM dkegl_item_master WHERE organization_id = dkegl_org_id AND item_code = 'PKG_CORE_001');
    
    -- Create opening stock entries only if they don't exist
    INSERT INTO dkegl_stock (
        organization_id, item_code, opening_qty, current_qty, 
        location, last_transaction_date, last_updated
    )
    SELECT dkegl_org_id, 'RAW_ADHESIVE_001', 75.5, 75.5, 'WAREHOUSE_A', '2025-03-31', now()
    WHERE NOT EXISTS (SELECT 1 FROM dkegl_stock WHERE organization_id = dkegl_org_id AND item_code = 'RAW_ADHESIVE_001');
    
    INSERT INTO dkegl_stock (
        organization_id, item_code, opening_qty, current_qty, 
        location, last_transaction_date, last_updated
    )
    SELECT dkegl_org_id, 'RAW_FILM_001', 250.0, 250.0, 'WAREHOUSE_A', '2025-03-31', now()
    WHERE NOT EXISTS (SELECT 1 FROM dkegl_stock WHERE organization_id = dkegl_org_id AND item_code = 'RAW_FILM_001');
    
    INSERT INTO dkegl_stock (
        organization_id, item_code, opening_qty, current_qty, 
        location, last_transaction_date, last_updated
    )
    SELECT dkegl_org_id, 'PKG_CORE_001', 150, 150, 'WAREHOUSE_B', '2025-03-31', now()
    WHERE NOT EXISTS (SELECT 1 FROM dkegl_stock WHERE organization_id = dkegl_org_id AND item_code = 'PKG_CORE_001');
    
    RAISE NOTICE 'Test data created/verified successfully for DKEGL organization: %', dkegl_org_id;
END $$;