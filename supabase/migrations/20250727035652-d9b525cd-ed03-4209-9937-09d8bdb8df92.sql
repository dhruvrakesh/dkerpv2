-- Phase 2 Implementation: Complete Foundation & Material Flow Engine (Clean)

-- Step 1: Add Missing Material Categories for 7 stages (skip if already exist)
INSERT INTO dkegl_stage_material_categories (organization_id, stage_id, category_name, category_type, is_required, typical_consumption_rate, waste_allowance_percentage, created_at) 
SELECT org.id, stage.id, category_data.category_name, category_data.category_type, category_data.is_required, category_data.typical_consumption_rate, category_data.waste_allowance_percentage, now()
FROM dkegl_organizations org
CROSS JOIN dkegl_workflow_stages stage
CROSS JOIN (VALUES
    ('Order Punching', 'substrate', 'substrate', true, 1.0, 5.0),
    ('Order Punching', 'tooling', 'tooling', false, 0.1, 2.0),
    ('Order Punching', 'consumables', 'consumable', true, 0.05, 10.0),
    ('Order Punching', 'setup_materials', 'fresh_material', true, 0.02, 15.0),
    ('Gravure Printing', 'substrate', 'substrate', true, 1.0, 3.0),
    ('Gravure Printing', 'inks', 'fresh_material', true, 0.15, 8.0),
    ('Gravure Printing', 'solvents', 'fresh_material', true, 0.08, 12.0),
    ('Gravure Printing', 'plates', 'tooling', false, 0.001, 2.0),
    ('Gravure Printing', 'chemicals', 'consumable', true, 0.03, 15.0),
    ('Gravure Printing', 'cleaning_agents', 'consumable', true, 0.02, 20.0),
    ('Lamination Coating', 'substrate', 'substrate', true, 1.0, 2.0),
    ('Lamination Coating', 'adhesives', 'fresh_material', true, 0.12, 5.0),
    ('Lamination Coating', 'primers', 'fresh_material', true, 0.05, 10.0),
    ('Lamination Coating', 'release_agents', 'consumable', true, 0.01, 25.0),
    ('Lamination Coating', 'catalysts', 'fresh_material', true, 0.02, 8.0),
    ('Adhesive Coating', 'substrate', 'substrate', true, 1.0, 2.0),
    ('Adhesive Coating', 'specialized_adhesives', 'fresh_material', true, 0.18, 6.0),
    ('Adhesive Coating', 'activators', 'fresh_material', true, 0.03, 12.0),
    ('Adhesive Coating', 'coating_chemicals', 'consumable', true, 0.04, 15.0),
    ('Adhesive Coating', 'release_papers', 'packaging', true, 0.1, 8.0),
    ('Coating', 'substrate', 'substrate', true, 1.0, 2.0),
    ('Coating', 'coating_materials', 'fresh_material', true, 0.15, 7.0),
    ('Coating', 'solvents', 'fresh_material', true, 0.08, 18.0),
    ('Cylinder Preparation', 'cylinders', 'tooling', false, 0.1, 1.0),
    ('Cylinder Preparation', 'engraving_materials', 'consumable', true, 0.01, 30.0),
    ('Cylinder Preparation', 'chrome_plating', 'fresh_material', true, 0.02, 5.0),
    ('Quality Assurance', 'test_materials', 'consumable', true, 0.001, 50.0),
    ('Quality Assurance', 'calibration_standards', 'tooling', false, 0.0001, 5.0),
    ('Quality Assurance', 'sampling_materials', 'consumable', true, 0.001, 100.0)
) AS category_data(stage_name, category_name, category_type, is_required, typical_consumption_rate, waste_allowance_percentage)
WHERE org.code = 'DKEGL' 
AND stage.stage_name = category_data.stage_name
AND NOT EXISTS (
    SELECT 1 FROM dkegl_stage_material_categories existing 
    WHERE existing.organization_id = org.id 
    AND existing.stage_id = stage.id 
    AND existing.category_name = category_data.category_name
);

-- Step 2: Complete BOM Stage Assignments for remaining 4 components
UPDATE dkegl_bom_components 
SET stage_id = (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Order Punching')
WHERE component_item_code = 'RAW_FILM_001' AND stage_id IS NULL;

UPDATE dkegl_bom_components 
SET stage_id = (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Adhesive Coating')
WHERE component_item_code = 'RAW_ADHESIVE_001' AND stage_id IS NULL;

UPDATE dkegl_bom_components 
SET stage_id = (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing')
WHERE component_item_code IN ('INK_CYAN_001', 'INK_MAGENTA_001') AND stage_id IS NULL;

-- Step 3: Update material categories
UPDATE dkegl_bom_components 
SET material_category = 'substrate' 
WHERE component_item_code = 'RAW_FILM_001';

UPDATE dkegl_bom_components 
SET material_category = 'adhesive' 
WHERE component_item_code = 'RAW_ADHESIVE_001';

UPDATE dkegl_bom_components 
SET material_category = 'ink' 
WHERE component_item_code IN ('INK_CYAN_001', 'INK_MAGENTA_001');

-- Step 4: Create the missing material transformations table if needed
CREATE TABLE IF NOT EXISTS dkegl_material_transformations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    order_id UUID NOT NULL,
    stage_id UUID NOT NULL,
    workflow_progress_id UUID NOT NULL,
    input_item_code TEXT NOT NULL,
    input_quantity NUMERIC NOT NULL DEFAULT 0,
    output_item_code TEXT NOT NULL,
    output_quantity NUMERIC NOT NULL DEFAULT 0,
    transformation_type TEXT NOT NULL,
    yield_percentage NUMERIC NOT NULL DEFAULT 100,
    transformation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    material_properties JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on material transformations if not already enabled
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dkegl_material_transformations' AND policyname = 'DKEGL organization members can access material transformations') THEN
        ALTER TABLE dkegl_material_transformations ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "DKEGL organization members can access material transformations" 
        ON dkegl_material_transformations 
        FOR ALL 
        USING (organization_id = dkegl_get_current_user_org()) 
        WITH CHECK (organization_id = dkegl_get_current_user_org());
    END IF;
END $$;