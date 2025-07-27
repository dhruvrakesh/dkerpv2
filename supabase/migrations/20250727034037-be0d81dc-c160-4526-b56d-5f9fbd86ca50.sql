-- Phase 2 Implementation: Complete Foundation & Material Flow Engine

-- Step 1: Add Missing Material Categories for 7 stages
INSERT INTO dkegl_stage_material_categories (organization_id, stage_id, category_name, category_type, is_consumable, unit_of_measure, created_at) VALUES
-- Order Punching categories
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Order Punching'), 
 'substrate', 'primary', false, 'KG', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Order Punching'), 
 'tooling', 'secondary', false, 'PCS', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Order Punching'), 
 'consumables', 'consumable', true, 'PCS', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Order Punching'), 
 'setup_materials', 'secondary', true, 'KG', now()),

-- Gravure Printing categories  
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing'), 
 'substrate', 'primary', false, 'KG', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing'), 
 'inks', 'secondary', true, 'KG', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing'), 
 'solvents', 'secondary', true, 'LTR', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing'), 
 'plates', 'secondary', false, 'PCS', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing'), 
 'chemicals', 'consumable', true, 'KG', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing'), 
 'cleaning_agents', 'consumable', true, 'LTR', now()),

-- Lamination Coating categories
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Lamination Coating'), 
 'substrate', 'primary', false, 'KG', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Lamination Coating'), 
 'adhesives', 'secondary', true, 'KG', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Lamination Coating'), 
 'primers', 'secondary', true, 'KG', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Lamination Coating'), 
 'release_agents', 'consumable', true, 'LTR', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Lamination Coating'), 
 'catalysts', 'secondary', true, 'KG', now()),

-- Adhesive Coating categories
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Adhesive Coating'), 
 'substrate', 'primary', false, 'KG', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Adhesive Coating'), 
 'specialized_adhesives', 'secondary', true, 'KG', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Adhesive Coating'), 
 'activators', 'secondary', true, 'KG', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Adhesive Coating'), 
 'coating_chemicals', 'consumable', true, 'KG', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Adhesive Coating'), 
 'release_papers', 'secondary', true, 'KG', now()),

-- Coating categories
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Coating'), 
 'substrate', 'primary', false, 'KG', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Coating'), 
 'coating_materials', 'secondary', true, 'KG', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Coating'), 
 'solvents', 'secondary', true, 'LTR', now()),

-- Cylinder Preparation categories
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Cylinder Preparation'), 
 'cylinders', 'secondary', false, 'PCS', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Cylinder Preparation'), 
 'engraving_materials', 'consumable', true, 'KG', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Cylinder Preparation'), 
 'chrome_plating', 'secondary', true, 'KG', now()),

-- Quality Assurance categories
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Quality Assurance'), 
 'test_materials', 'consumable', true, 'PCS', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Quality Assurance'), 
 'calibration_standards', 'secondary', false, 'PCS', now()),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Quality Assurance'), 
 'sampling_materials', 'consumable', true, 'PCS', now());

-- Step 2: Complete BOM Stage Assignments for remaining 4 components
UPDATE dkegl_bom_components 
SET stage_id = (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Order Punching')
WHERE component_code = 'RAW_FILM_001';

UPDATE dkegl_bom_components 
SET stage_id = (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Adhesive Coating')
WHERE component_code = 'RAW_ADHESIVE_001';

UPDATE dkegl_bom_components 
SET stage_id = (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing')
WHERE component_code IN ('INK_CYAN_001', 'INK_MAGENTA_001');

-- Step 3: Update remaining raw_material categories to specific ones
UPDATE dkegl_item_master 
SET category_id = (SELECT id FROM dkegl_categories WHERE category_name = 'substrate')
WHERE item_code = 'RAW_FILM_001';

UPDATE dkegl_item_master 
SET category_id = (SELECT id FROM dkegl_categories WHERE category_name = 'adhesives')
WHERE item_code = 'RAW_ADHESIVE_001';

UPDATE dkegl_item_master 
SET category_id = (SELECT id FROM dkegl_categories WHERE category_name = 'inks')
WHERE item_code IN ('INK_CYAN_001', 'INK_MAGENTA_001');

-- Step 4: Create Cross-Stage Material Flow Functions

-- Function to calculate stage material requirements with carry-forward logic
CREATE OR REPLACE FUNCTION dkegl_calculate_stage_material_requirements(
    _order_id UUID,
    _stage_id UUID
) RETURNS TABLE(
    item_code TEXT,
    item_name TEXT,
    required_quantity NUMERIC,
    available_from_previous_stage NUMERIC,
    fresh_material_needed NUMERIC,
    material_source TEXT,
    cost_estimate NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    order_qty NUMERIC;
    prev_stage_id UUID;
BEGIN
    -- Get order quantity
    SELECT order_quantity INTO order_qty 
    FROM dkegl_orders WHERE id = _order_id;
    
    -- Get previous stage in sequence
    SELECT id INTO prev_stage_id
    FROM dkegl_workflow_stages 
    WHERE organization_id = (SELECT organization_id FROM dkegl_orders WHERE id = _order_id)
    AND sequence_order = (
        SELECT sequence_order - 1 
        FROM dkegl_workflow_stages 
        WHERE id = _stage_id
    );
    
    RETURN QUERY
    WITH bom_requirements AS (
        SELECT 
            bc.component_code as item_code,
            im.item_name,
            bc.quantity_per_unit * order_qty as required_quantity,
            0 as available_from_previous_stage,
            bc.quantity_per_unit * order_qty as fresh_material_needed,
            'bom_component' as material_source,
            COALESCE(bc.unit_cost, 0) * bc.quantity_per_unit * order_qty as cost_estimate
        FROM dkegl_bom_components bc
        LEFT JOIN dkegl_item_master im ON bc.component_code = im.item_code
        WHERE bc.stage_id = _stage_id
    ),
    substrate_carryforward AS (
        SELECT 
            smo.item_code,
            im.item_name,
            smo.output_quantity as required_quantity,
            smo.output_quantity as available_from_previous_stage,
            0 as fresh_material_needed,
            'substrate_carryforward' as material_source,
            0 as cost_estimate
        FROM dkegl_stage_material_outputs smo
        LEFT JOIN dkegl_item_master im ON smo.item_code = im.item_code
        WHERE smo.stage_id = prev_stage_id 
        AND smo.order_id = _order_id
        AND smo.output_type = 'substrate'
    )
    SELECT * FROM bom_requirements
    UNION ALL
    SELECT * FROM substrate_carryforward
    ORDER BY material_source, item_code;
END;
$$;

-- Function to create material transformations between stages
CREATE OR REPLACE FUNCTION dkegl_create_material_transformation(
    _workflow_progress_id UUID,
    _input_item_code TEXT,
    _input_quantity NUMERIC,
    _output_item_code TEXT,
    _output_quantity NUMERIC,
    _transformation_type TEXT,
    _yield_percentage NUMERIC DEFAULT 100
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    transformation_id UUID;
    stage_data RECORD;
BEGIN
    -- Get stage and order information
    SELECT wp.*, ws.organization_id, wp.order_id, wp.stage_id
    INTO stage_data
    FROM dkegl_workflow_progress wp
    JOIN dkegl_workflow_stages ws ON wp.stage_id = ws.id
    WHERE wp.id = _workflow_progress_id;
    
    -- Insert transformation record
    INSERT INTO dkegl_material_transformations (
        organization_id,
        order_id,
        stage_id,
        workflow_progress_id,
        input_item_code,
        input_quantity,
        output_item_code,
        output_quantity,
        transformation_type,
        yield_percentage,
        transformation_date
    ) VALUES (
        stage_data.organization_id,
        stage_data.order_id,
        stage_data.stage_id,
        _workflow_progress_id,
        _input_item_code,
        _input_quantity,
        _output_item_code,
        _output_quantity,
        _transformation_type,
        _yield_percentage,
        CURRENT_DATE
    ) RETURNING id INTO transformation_id;
    
    -- Create corresponding stage material output
    INSERT INTO dkegl_stage_material_outputs (
        organization_id,
        order_id,
        stage_id,
        workflow_progress_id,
        item_code,
        output_quantity,
        unit_cost,
        output_type,
        quality_grade,
        transformation_id
    ) VALUES (
        stage_data.organization_id,
        stage_data.order_id,
        stage_data.stage_id,
        _workflow_progress_id,
        _output_item_code,
        _output_quantity,
        0, -- Will be calculated later
        _transformation_type,
        'A',
        transformation_id
    );
    
    RETURN transformation_id;
END;
$$;

-- Function to detect material shortages across workflow
CREATE OR REPLACE FUNCTION dkegl_detect_material_shortages(
    _order_id UUID
) RETURNS TABLE(
    stage_name TEXT,
    item_code TEXT,
    item_name TEXT,
    required_quantity NUMERIC,
    available_quantity NUMERIC,
    shortage_quantity NUMERIC,
    severity TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    WITH stage_requirements AS (
        SELECT 
            ws.stage_name,
            req.item_code,
            req.item_name,
            req.fresh_material_needed as required_quantity
        FROM dkegl_workflow_stages ws
        CROSS JOIN LATERAL dkegl_calculate_stage_material_requirements(_order_id, ws.id) req
        WHERE ws.organization_id = (SELECT organization_id FROM dkegl_orders WHERE id = _order_id)
        AND req.fresh_material_needed > 0
    )
    SELECT 
        sr.stage_name,
        sr.item_code,
        sr.item_name,
        sr.required_quantity,
        COALESCE(s.current_qty, 0) as available_quantity,
        GREATEST(sr.required_quantity - COALESCE(s.current_qty, 0), 0) as shortage_quantity,
        CASE 
            WHEN COALESCE(s.current_qty, 0) >= sr.required_quantity THEN 'none'
            WHEN COALESCE(s.current_qty, 0) >= sr.required_quantity * 0.8 THEN 'low'
            WHEN COALESCE(s.current_qty, 0) >= sr.required_quantity * 0.5 THEN 'medium'
            ELSE 'critical'
        END as severity
    FROM stage_requirements sr
    LEFT JOIN dkegl_stock s ON sr.item_code = s.item_code 
        AND s.organization_id = (SELECT organization_id FROM dkegl_orders WHERE id = _order_id)
    WHERE GREATEST(sr.required_quantity - COALESCE(s.current_qty, 0), 0) > 0
    ORDER BY 
        CASE 
            WHEN COALESCE(s.current_qty, 0) < sr.required_quantity * 0.5 THEN 1
            WHEN COALESCE(s.current_qty, 0) < sr.required_quantity * 0.8 THEN 2
            ELSE 3
        END,
        sr.stage_name;
END;
$$;