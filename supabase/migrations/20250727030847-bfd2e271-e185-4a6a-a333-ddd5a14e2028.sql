-- Phase 1A: Fix BOM Structure & Stage Integration (Final)

-- Update BOM components with proper stage assignments
UPDATE dkegl_bom_components 
SET stage_id = (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Order Punching' AND organization_id = dkegl_get_current_user_org())
WHERE component_item_code = 'RAW_FILM_001' AND stage_id IS NULL;

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
WHERE component_item_code = 'RAW_FILM_001';

-- Create BOM entries for fresh materials in existing products
INSERT INTO dkegl_bom_components (organization_id, bom_master_id, stage_id, component_item_code, material_category, quantity_per_unit) 
SELECT 
  bm.organization_id,
  bm.id,
  (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing' AND organization_id = bm.organization_id),
  'INK_CYAN_001',
  'inks',
  0.5 -- 0.5 kg per unit
FROM dkegl_bom_master bm 
WHERE bm.is_active = true;

INSERT INTO dkegl_bom_components (organization_id, bom_master_id, stage_id, component_item_code, material_category, quantity_per_unit) 
SELECT 
  bm.organization_id,
  bm.id,
  (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Lamination Coating' AND organization_id = bm.organization_id),
  'ADHV_PU_001',
  'adhesives',
  0.3 -- 0.3 kg per unit
FROM dkegl_bom_master bm 
WHERE bm.is_active = true;