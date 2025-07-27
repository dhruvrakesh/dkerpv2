-- Phase 1A: Fix BOM Structure & Stage Integration

-- First, let's get the stage IDs for reference
-- Update BOM components with proper stage assignments
UPDATE dkegl_bom_components 
SET stage_id = (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Order Punching' AND organization_id = dkegl_get_current_user_org())
WHERE item_code = 'RAW_FILM_001' AND stage_id IS NULL;

UPDATE dkegl_bom_components 
SET stage_id = (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing' AND organization_id = dkegl_get_current_user_org()),
    material_category = 'inks'
WHERE item_code LIKE '%INK%' AND stage_id IS NULL;

UPDATE dkegl_bom_components 
SET stage_id = (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Lamination Coating' AND organization_id = dkegl_get_current_user_org()),
    material_category = 'adhesives'
WHERE item_code LIKE '%ADHESIVE%' AND stage_id IS NULL;

UPDATE dkegl_bom_components 
SET stage_id = (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Adhesive Coating' AND organization_id = dkegl_get_current_user_org()),
    material_category = 'specialized_adhesives'
WHERE item_code LIKE '%COATING%' AND stage_id IS NULL;

-- Create comprehensive material categories for each stage
CREATE TABLE IF NOT EXISTS dkegl_stage_material_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  stage_id UUID REFERENCES dkegl_workflow_stages(id),
  category_name TEXT NOT NULL,
  category_type TEXT NOT NULL, -- 'primary', 'consumable', 'tooling', 'chemical'
  is_trackable BOOLEAN DEFAULT true,
  requires_lot_tracking BOOLEAN DEFAULT false,
  default_uom TEXT DEFAULT 'KG',
  consumption_pattern TEXT DEFAULT 'per_unit', -- 'per_unit', 'per_batch', 'per_hour'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, stage_id, category_name)
);

-- Enable RLS
ALTER TABLE dkegl_stage_material_categories ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "DKEGL organization members can access stage material categories"
ON dkegl_stage_material_categories
FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Insert material categories for all stages
INSERT INTO dkegl_stage_material_categories (organization_id, stage_id, category_name, category_type, requires_lot_tracking) VALUES
-- Order Punching Stage
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Order Punching' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'substrate', 'primary', true),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Order Punching' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'tooling', 'tooling', false),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Order Punching' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'consumables', 'consumable', false),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Order Punching' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'setup_materials', 'consumable', false),

-- Gravure Printing Stage  
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'substrate', 'primary', true),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'inks', 'chemical', true),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'solvents', 'chemical', true),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'plates', 'tooling', false),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'chemicals', 'chemical', true),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'cleaning_agents', 'chemical', false),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'cylinder_prep', 'consumable', false),

-- Lamination Coating Stage
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Lamination Coating' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'substrate', 'primary', true),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Lamination Coating' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'adhesives', 'chemical', true),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Lamination Coating' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'primers', 'chemical', true),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Lamination Coating' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'release_agents', 'chemical', false),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Lamination Coating' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'catalysts', 'chemical', true),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Lamination Coating' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'solvents', 'chemical', true),

-- Adhesive Coating Stage
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Adhesive Coating' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'substrate', 'primary', true),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Adhesive Coating' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'specialized_adhesives', 'chemical', true),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Adhesive Coating' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'activators', 'chemical', true),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Adhesive Coating' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'coating_chemicals', 'chemical', true),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Adhesive Coating' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'release_papers', 'consumable', false),

-- Slitting Packaging Stage
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Slitting Packaging' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'substrate', 'primary', true),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Slitting Packaging' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'cores', 'consumable', false),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Slitting Packaging' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'stretch_wrap', 'consumable', false),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Slitting Packaging' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'packaging_materials', 'consumable', false),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Slitting Packaging' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'labels', 'consumable', false),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 
 (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Slitting Packaging' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')), 
 'cartons', 'consumable', false);

-- Add fresh materials to item master
INSERT INTO dkegl_item_master (organization_id, item_code, item_name, category_id, status, uom, pricing_info) VALUES
-- Gravure Printing Materials
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'INK_CYAN_001', 'Cyan Process Ink', (SELECT id FROM dkegl_categories WHERE category_name = 'Raw Materials'), 'active', 'KG', '{"unit_cost": 25.50}'),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'INK_MAGENTA_001', 'Magenta Process Ink', (SELECT id FROM dkegl_categories WHERE category_name = 'Raw Materials'), 'active', 'KG', '{"unit_cost": 26.00}'),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'INK_YELLOW_001', 'Yellow Process Ink', (SELECT id FROM dkegl_categories WHERE category_name = 'Raw Materials'), 'active', 'KG', '{"unit_cost": 24.75}'),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'INK_BLACK_001', 'Black Process Ink', (SELECT id FROM dkegl_categories WHERE category_name = 'Raw Materials'), 'active', 'KG', '{"unit_cost": 22.50}'),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'SOLVENT_PG_001', 'Propylene Glycol Solvent', (SELECT id FROM dkegl_categories WHERE category_name = 'Raw Materials'), 'active', 'LTR', '{"unit_cost": 15.25}'),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'SOLVENT_EA_001', 'Ethyl Acetate Solvent', (SELECT id FROM dkegl_categories WHERE category_name = 'Raw Materials'), 'active', 'LTR', '{"unit_cost": 18.50}'),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'CLEANER_IPA_001', 'Isopropyl Alcohol Cleaner', (SELECT id FROM dkegl_categories WHERE category_name = 'Raw Materials'), 'active', 'LTR', '{"unit_cost": 12.75}'),

-- Lamination Materials
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'ADHV_PU_001', 'Polyurethane Adhesive', (SELECT id FROM dkegl_categories WHERE category_name = 'Raw Materials'), 'active', 'KG', '{"unit_cost": 45.00}'),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'ADHV_ACRYLIC_001', 'Acrylic Adhesive', (SELECT id FROM dkegl_categories WHERE category_name = 'Raw Materials'), 'active', 'KG', '{"unit_cost": 38.50}'),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'PRIMER_001', 'Adhesion Primer', (SELECT id FROM dkegl_categories WHERE category_name = 'Raw Materials'), 'active', 'KG', '{"unit_cost": 28.75}'),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'CATALYST_001', 'Curing Catalyst', (SELECT id FROM dkegl_categories WHERE category_name = 'Raw Materials'), 'active', 'KG', '{"unit_cost": 55.00}'),

-- Adhesive Coating Materials
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'ADHV_SPEC_001', 'Specialized Pressure Sensitive Adhesive', (SELECT id FROM dkegl_categories WHERE category_name = 'Raw Materials'), 'active', 'KG', '{"unit_cost": 65.00}'),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'ACTIVATOR_001', 'Adhesive Activator', (SELECT id FROM dkegl_categories WHERE category_name = 'Raw Materials'), 'active', 'KG', '{"unit_cost": 32.50}'),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'RELEASE_PAPER_001', 'Silicone Release Paper', (SELECT id FROM dkegl_categories WHERE category_name = 'Raw Materials'), 'active', 'SQM', '{"unit_cost": 2.85}'),

-- Slitting & Packaging Materials
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'CORE_76MM_001', '76mm Paper Core', (SELECT id FROM dkegl_categories WHERE category_name = 'Packaging'), 'active', 'PCS', '{"unit_cost": 3.50}'),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'CORE_152MM_001', '152mm Paper Core', (SELECT id FROM dkegl_categories WHERE category_name = 'Packaging'), 'active', 'PCS', '{"unit_cost": 7.25}'),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'STRETCH_WRAP_001', 'Industrial Stretch Wrap', (SELECT id FROM dkegl_categories WHERE category_name = 'Packaging'), 'active', 'ROLL', '{"unit_cost": 45.00}'),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'CARTON_SMALL_001', 'Small Shipping Carton', (SELECT id FROM dkegl_categories WHERE category_name = 'Packaging'), 'active', 'PCS', '{"unit_cost": 12.50}'),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'CARTON_LARGE_001', 'Large Shipping Carton', (SELECT id FROM dkegl_categories WHERE category_name = 'Packaging'), 'active', 'PCS', '{"unit_cost": 18.75}'),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'LABEL_PRODUCT_001', 'Product Identification Label', (SELECT id FROM dkegl_categories WHERE category_name = 'Packaging'), 'active', 'PCS', '{"unit_cost": 0.85}'),

-- Order Punching Materials
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'TOOL_DIE_001', 'Custom Punching Die', (SELECT id FROM dkegl_categories WHERE category_name = 'Tooling'), 'active', 'PCS', '{"unit_cost": 250.00}'),
((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL'), 'SETUP_MAT_001', 'Setup Material Sheets', (SELECT id FROM dkegl_categories WHERE category_name = 'Raw Materials'), 'active', 'SHT', '{"unit_cost": 5.75}');

-- Update existing BOM components with better categorization
UPDATE dkegl_bom_components 
SET material_category = 'substrate'
WHERE item_code = 'RAW_FILM_001';

-- Create BOM entries for fresh materials in existing products
INSERT INTO dkegl_bom_components (organization_id, bom_master_id, stage_id, item_code, material_category, planned_quantity, unit_cost) 
SELECT 
  bm.organization_id,
  bm.id,
  (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing' AND organization_id = bm.organization_id),
  'INK_CYAN_001',
  'inks',
  0.5, -- 0.5 kg per unit
  25.50
FROM dkegl_bom_master bm 
WHERE bm.is_active = true;

INSERT INTO dkegl_bom_components (organization_id, bom_master_id, stage_id, item_code, material_category, planned_quantity, unit_cost) 
SELECT 
  bm.organization_id,
  bm.id,
  (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Lamination Coating' AND organization_id = bm.organization_id),
  'ADHV_PU_001',
  'adhesives',
  0.3, -- 0.3 kg per unit
  45.00
FROM dkegl_bom_master bm 
WHERE bm.is_active = true;