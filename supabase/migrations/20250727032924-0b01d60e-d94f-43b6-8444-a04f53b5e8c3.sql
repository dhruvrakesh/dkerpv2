-- Simplified Migration: Fix BOM Stage Assignments and Add Fresh Materials
-- Focus only on working parts

-- 1. Fix BOM component stage assignments
UPDATE dkegl_bom_components SET stage_id = (
  SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Order Punching' LIMIT 1
), material_category = 'substrate'
WHERE component_item_code = 'RAW_FILM_001';

UPDATE dkegl_bom_components SET stage_id = (
  SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing' LIMIT 1
), material_category = 'inks'
WHERE component_item_code = 'RAW_INK_001';

UPDATE dkegl_bom_components SET stage_id = (
  SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing' LIMIT 1
), material_category = 'solvents'
WHERE component_item_code = 'RAW_SOLVENT_001';

UPDATE dkegl_bom_components SET stage_id = (
  SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Lamination Coating' LIMIT 1
), material_category = 'adhesives'
WHERE component_item_code = 'RAW_ADHESIVE_001';

UPDATE dkegl_bom_components SET stage_id = (
  SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Lamination Coating' LIMIT 1
), material_category = 'primers'
WHERE component_item_code = 'RAW_PRIMER_001';

UPDATE dkegl_bom_components SET stage_id = (
  SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Adhesive Coating' LIMIT 1
), material_category = 'specialized_adhesives'
WHERE component_item_code = 'RAW_COATING_001';

UPDATE dkegl_bom_components SET stage_id = (
  SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Slitting Packaging' LIMIT 1
), material_category = 'cores'
WHERE component_item_code = 'RAW_CORE_001';

-- 2. Add fresh materials to item master for immediate use
INSERT INTO dkegl_item_master (organization_id, item_code, item_name, category_id, specifications, pricing_info, status)
SELECT 
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  item_code,
  item_name,
  (SELECT id FROM dkegl_categories WHERE category_name = 'Raw Materials' LIMIT 1),
  specifications,
  pricing_info,
  'active'
FROM (VALUES
  -- Order Punching Materials
  ('OP_SUBSTRATE_001', 'PET Film 12 Micron', '{"thickness_micron": 12, "material_type": "PET", "grade": "food_grade"}'::jsonb, '{"unit_cost": 85.5, "uom": "KG", "supplier": "Jindal Poly"}'::jsonb),
  ('OP_SUBSTRATE_002', 'BOPP Film 15 Micron', '{"thickness_micron": 15, "material_type": "BOPP", "grade": "printing_grade"}'::jsonb, '{"unit_cost": 92.0, "uom": "KG", "supplier": "Cosmo Films"}'::jsonb),
  ('OP_SUBSTRATE_003', 'CPP Film 20 Micron', '{"thickness_micron": 20, "material_type": "CPP", "grade": "heat_seal"}'::jsonb, '{"unit_cost": 88.0, "uom": "KG", "supplier": "Flex Films"}'::jsonb),
  
  -- Gravure Printing Materials  
  ('GP_INK_001', 'Cyan Process Ink', '{"color": "cyan", "viscosity": "18-22", "solid_content": "45%"}'::jsonb, '{"unit_cost": 450.0, "uom": "KG", "supplier": "Siegwerk"}'::jsonb),
  ('GP_INK_002', 'Magenta Process Ink', '{"color": "magenta", "viscosity": "18-22", "solid_content": "45%"}'::jsonb, '{"unit_cost": 465.0, "uom": "KG", "supplier": "Siegwerk"}'::jsonb),
  ('GP_INK_003', 'Yellow Process Ink', '{"color": "yellow", "viscosity": "18-22", "solid_content": "45%"}'::jsonb, '{"unit_cost": 440.0, "uom": "KG", "supplier": "Siegwerk"}'::jsonb),
  ('GP_SOL_001', 'Ethyl Acetate', '{"purity": "99.5%", "flash_point": "-4C"}'::jsonb, '{"unit_cost": 95.0, "uom": "KG", "supplier": "INEOS"}'::jsonb),
  ('GP_SOL_002', 'Isopropanol', '{"purity": "99%", "flash_point": "12C"}'::jsonb, '{"unit_cost": 85.0, "uom": "KG", "supplier": "Shell"}'::jsonb),
  
  -- Lamination Coating Materials
  ('LC_ADH_001', 'PU Lamination Adhesive', '{"type": "polyurethane", "solid_content": "25%", "pot_life": "24_hours"}'::jsonb, '{"unit_cost": 720.0, "uom": "KG", "supplier": "Coim India"}'::jsonb),
  ('LC_ADH_002', 'Solventless Adhesive Part A', '{"type": "polyol", "viscosity": "800-1200", "NCO_content": "12%"}'::jsonb, '{"unit_cost": 580.0, "uom": "KG", "supplier": "Henkel"}'::jsonb),
  ('LC_PRI_001', 'Corona Treatment Primer', '{"active_content": "5%", "application_method": "spray"}'::jsonb, '{"unit_cost": 850.0, "uom": "KG", "supplier": "3M"}'::jsonb),
  
  -- Adhesive Coating Materials
  ('AC_ADH_001', 'Hot Melt Adhesive PSA', '{"type": "hot_melt_PSA", "tack": "high", "temperature": "160C"}'::jsonb, '{"unit_cost": 320.0, "uom": "KG", "supplier": "H.B. Fuller"}'::jsonb),
  ('AC_ADH_002', 'Acrylic PSA Emulsion', '{"type": "acrylic_emulsion", "solid_content": "55%", "tack": "medium"}'::jsonb, '{"unit_cost": 280.0, "uom": "KG", "supplier": "Pidilite"}'::jsonb),
  ('AC_REL_001', 'Release Liner Paper', '{"basis_weight": "80_gsm", "release_level": "medium", "silicone_coating": "yes"}'::jsonb, '{"unit_cost": 95.0, "uom": "KG", "supplier": "Rayong Paper"}'::jsonb),
  
  -- Slitting Materials
  ('SP_CORE_002', 'Cardboard Core 3 inch', '{"inner_diameter": "76mm", "wall_thickness": "8mm", "material": "recycled_cardboard"}'::jsonb, '{"unit_cost": 18.0, "uom": "PCS", "supplier": "Core Industries"}'::jsonb),
  ('SP_WRAP_001', 'LDPE Stretch Wrap', '{"thickness": "20_micron", "width": "500mm", "stretch": "300%"}'::jsonb, '{"unit_cost": 125.0, "uom": "KG", "supplier": "Polyplex"}'::jsonb),
  ('SP_BOX_001', 'Export Carton 5 Ply', '{"dimensions": "600x400x300mm", "burst_strength": "180_kgf", "material": "kraft"}'::jsonb, '{"unit_cost": 85.0, "uom": "PCS", "supplier": "VRL Packaging"}'::jsonb)
) AS materials(item_code, item_name, specifications, pricing_info)
WHERE NOT EXISTS (
  SELECT 1 FROM dkegl_item_master im 
  WHERE im.item_code = materials.item_code
);

-- 3. Create initial stock entries for fresh materials
INSERT INTO dkegl_stock (organization_id, item_code, current_qty, unit_cost, location)
SELECT 
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  im.item_code,
  CASE 
    WHEN im.item_code LIKE 'OP_%' THEN 500.0
    WHEN im.item_code LIKE 'GP_INK_%' THEN 100.0
    WHEN im.item_code LIKE 'GP_SOL_%' THEN 200.0
    WHEN im.item_code LIKE 'LC_%' THEN 150.0
    WHEN im.item_code LIKE 'AC_%' THEN 120.0
    WHEN im.item_code LIKE 'SP_%' THEN 1000.0
    ELSE 50.0
  END,
  (im.pricing_info->>'unit_cost')::numeric,
  'main_warehouse'
FROM dkegl_item_master im
WHERE im.item_code IN (
  'OP_SUBSTRATE_001', 'OP_SUBSTRATE_002', 'OP_SUBSTRATE_003',
  'GP_INK_001', 'GP_INK_002', 'GP_INK_003', 'GP_SOL_001', 'GP_SOL_002',
  'LC_ADH_001', 'LC_ADH_002', 'LC_PRI_001',
  'AC_ADH_001', 'AC_ADH_002', 'AC_REL_001',
  'SP_CORE_002', 'SP_WRAP_001', 'SP_BOX_001'
)
AND NOT EXISTS (
  SELECT 1 FROM dkegl_stock s 
  WHERE s.item_code = im.item_code AND s.organization_id = im.organization_id
);