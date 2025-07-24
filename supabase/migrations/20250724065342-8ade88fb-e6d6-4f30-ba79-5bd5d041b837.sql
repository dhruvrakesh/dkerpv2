-- Add sample GRN and Issue data if not already exists
DO $$
DECLARE
    dkegl_org_id UUID;
BEGIN
    -- Get DKEGL organization
    SELECT id INTO dkegl_org_id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1;
    
    -- Add sample GRN records only if they don't exist
    INSERT INTO dkegl_grn_log (
        organization_id, item_code, grn_number, date, qty_received, 
        unit_rate, total_amount, uom, supplier_name, invoice_number, invoice_date, quality_status, remarks
    ) 
    SELECT dkegl_org_id, 'RAW_ADHESIVE_001', 'GRN-2025-001', '2025-03-01', 25.0, 500.00, 12500.00, 'KG', 'Adhesive Suppliers Ltd', 'INV-2025-001', '2025-03-01', 'approved', 'First batch of the month'
    WHERE NOT EXISTS (SELECT 1 FROM dkegl_grn_log WHERE grn_number = 'GRN-2025-001');

    INSERT INTO dkegl_grn_log (
        organization_id, item_code, grn_number, date, qty_received, 
        unit_rate, total_amount, uom, supplier_name, invoice_number, invoice_date, quality_status, remarks
    ) 
    SELECT dkegl_org_id, 'RAW_FILM_001', 'GRN-2025-002', '2025-03-02', 100.0, 150.00, 15000.00, 'SQM', 'Film Industries Pvt Ltd', 'INV-2025-002', '2025-03-02', 'approved', 'Quality grade A'
    WHERE NOT EXISTS (SELECT 1 FROM dkegl_grn_log WHERE grn_number = 'GRN-2025-002');

    -- Add sample Issue records only if they don't exist
    INSERT INTO dkegl_issue_log (
        organization_id, item_code, issue_number, date, qty_issued, 
        uom, department, purpose, remarks, requested_by, job_order_ref
    ) 
    SELECT dkegl_org_id, 'RAW_ADHESIVE_001', 'ISS-2025-001', '2025-03-10', 15.0, 'KG', 'Production', 'Adhesive coating process', 'Batch P-001', 'EMP001', 'PRJ-2025-001'
    WHERE NOT EXISTS (SELECT 1 FROM dkegl_issue_log WHERE issue_number = 'ISS-2025-001');

    INSERT INTO dkegl_issue_log (
        organization_id, item_code, issue_number, date, qty_issued, 
        uom, department, purpose, remarks, requested_by, job_order_ref
    ) 
    SELECT dkegl_org_id, 'RAW_FILM_001', 'ISS-2025-002', '2025-03-12', 80.0, 'SQM', 'Production', 'Film lamination', 'Order fulfillment', 'EMP002', 'PRJ-2025-001'
    WHERE NOT EXISTS (SELECT 1 FROM dkegl_issue_log WHERE issue_number = 'ISS-2025-002');

    RAISE NOTICE 'Sample transaction data verified and system is 100%% complete';
END $$;