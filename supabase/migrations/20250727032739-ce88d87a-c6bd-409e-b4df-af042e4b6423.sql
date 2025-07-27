-- Fixed Schema Migration: Complete Material Categories Setup
-- Using correct column names from database schema

-- 1. Complete BOM component stage assignments using correct column name
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

-- 2. Create missing material categories for all stages (using correct schema)
-- Order Punching stage materials
INSERT INTO dkegl_stage_material_categories (organization_id, stage_id, category_name, category_type, typical_consumption_rate, waste_allowance_percentage)
SELECT 
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  ws.id,
  unnest(ARRAY['substrate', 'tooling', 'consumables', 'setup_materials']),
  unnest(ARRAY['input', 'input', 'input', 'input']),
  unnest(ARRAY[1.0, 0.1, 0.5, 0.2]),
  unnest(ARRAY[2.0, 0.0, 5.0, 1.0])
FROM dkegl_workflow_stages ws
WHERE ws.stage_name = 'Order Punching'
AND NOT EXISTS (
  SELECT 1 FROM dkegl_stage_material_categories smc 
  WHERE smc.stage_id = ws.id AND smc.category_name = 'substrate'
);

-- Gravure Printing stage materials
INSERT INTO dkegl_stage_material_categories (organization_id, stage_id, category_name, category_type, typical_consumption_rate, waste_allowance_percentage)
SELECT 
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  ws.id,
  unnest(ARRAY['substrate', 'inks', 'solvents', 'plates', 'chemicals', 'cleaning_agents', 'cylinder_prep']),
  unnest(ARRAY['input', 'input', 'input', 'tool', 'input', 'input', 'setup']),
  unnest(ARRAY[1.0, 0.8, 0.3, 0.01, 0.1, 0.2, 0.05]),
  unnest(ARRAY[3.0, 8.0, 10.0, 0.0, 5.0, 2.0, 1.0])
FROM dkegl_workflow_stages ws
WHERE ws.stage_name = 'Gravure Printing'
AND NOT EXISTS (
  SELECT 1 FROM dkegl_stage_material_categories smc 
  WHERE smc.stage_id = ws.id AND smc.category_name = 'substrate'
);

-- Lamination Coating stage materials
INSERT INTO dkegl_stage_material_categories (organization_id, stage_id, category_name, category_type, typical_consumption_rate, waste_allowance_percentage)
SELECT 
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  ws.id,
  unnest(ARRAY['substrate', 'adhesives', 'primers', 'release_agents', 'catalysts', 'solvents']),
  unnest(ARRAY['input', 'input', 'input', 'input', 'input', 'input']),
  unnest(ARRAY[1.0, 0.4, 0.1, 0.05, 0.02, 0.15]),
  unnest(ARRAY[2.0, 5.0, 3.0, 1.0, 1.0, 8.0])
FROM dkegl_workflow_stages ws
WHERE ws.stage_name = 'Lamination Coating'
AND NOT EXISTS (
  SELECT 1 FROM dkegl_stage_material_categories smc 
  WHERE smc.stage_id = ws.id AND smc.category_name = 'substrate'
);

-- Adhesive Coating stage materials
INSERT INTO dkegl_stage_material_categories (organization_id, stage_id, category_name, category_type, typical_consumption_rate, waste_allowance_percentage)
SELECT 
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  ws.id,
  unnest(ARRAY['substrate', 'specialized_adhesives', 'activators', 'coating_chemicals', 'release_papers']),
  unnest(ARRAY['input', 'input', 'input', 'input', 'consumable']),
  unnest(ARRAY[1.0, 0.3, 0.05, 0.1, 1.1]),
  unnest(ARRAY[2.0, 4.0, 2.0, 3.0, 5.0])
FROM dkegl_workflow_stages ws
WHERE ws.stage_name = 'Adhesive Coating'
AND NOT EXISTS (
  SELECT 1 FROM dkegl_stage_material_categories smc 
  WHERE smc.stage_id = ws.id AND smc.category_name = 'substrate'
);

-- 3. Add 32 fresh materials to item master for all stages
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
  ('OP_TOOL_001', 'Cutting Blade Set', '{"blade_type": "carbide", "width_mm": 1200}'::jsonb, '{"unit_cost": 2500.0, "uom": "SET", "supplier": "Local Tooling"}'::jsonb),
  ('OP_CONS_001', 'Core Plugs', '{"material": "plastic", "color": "black"}'::jsonb, '{"unit_cost": 15.0, "uom": "PCS", "supplier": "Core Accessories"}'::jsonb),
  
  -- Gravure Printing Materials  
  ('GP_INK_001', 'Cyan Process Ink', '{"color": "cyan", "viscosity": "18-22", "solid_content": "45%"}'::jsonb, '{"unit_cost": 450.0, "uom": "KG", "supplier": "Siegwerk"}'::jsonb),
  ('GP_INK_002', 'Magenta Process Ink', '{"color": "magenta", "viscosity": "18-22", "solid_content": "45%"}'::jsonb, '{"unit_cost": 465.0, "uom": "KG", "supplier": "Siegwerk"}'::jsonb),
  ('GP_INK_003', 'Yellow Process Ink', '{"color": "yellow", "viscosity": "18-22", "solid_content": "45%"}'::jsonb, '{"unit_cost": 440.0, "uom": "KG", "supplier": "Siegwerk"}'::jsonb),
  ('GP_INK_004', 'Black Process Ink', '{"color": "black", "viscosity": "18-22", "solid_content": "45%"}'::jsonb, '{"unit_cost": 420.0, "uom": "KG", "supplier": "Siegwerk"}'::jsonb),
  ('GP_INK_005', 'White Opaque Ink', '{"color": "white", "opacity": "98%", "solid_content": "50%"}'::jsonb, '{"unit_cost": 380.0, "uom": "KG", "supplier": "Sun Chemical"}'::jsonb),
  ('GP_SOL_001', 'Ethyl Acetate', '{"purity": "99.5%", "flash_point": "-4C"}'::jsonb, '{"unit_cost": 95.0, "uom": "KG", "supplier": "INEOS"}'::jsonb),
  ('GP_SOL_002', 'Isopropanol', '{"purity": "99%", "flash_point": "12C"}'::jsonb, '{"unit_cost": 85.0, "uom": "KG", "supplier": "Shell"}'::jsonb),
  ('GP_SOL_003', 'Toluene', '{"purity": "99.5%", "flash_point": "4C"}'::jsonb, '{"unit_cost": 78.0, "uom": "KG", "supplier": "Reliance"}'::jsonb),
  ('GP_CHEM_001', 'Ink Hardener', '{"active_content": "80%", "pot_life": "8_hours"}'::jsonb, '{"unit_cost": 650.0, "uom": "KG", "supplier": "Siegwerk"}'::jsonb),
  ('GP_CLEAN_001', 'Press Wash Solvent', '{"flash_point": "25C", "evaporation_rate": "fast"}'::jsonb, '{"unit_cost": 120.0, "uom": "LTR", "supplier": "Local Chemical"}'::jsonb),
  
  -- Lamination Coating Materials
  ('LC_ADH_001', 'PU Lamination Adhesive', '{"type": "polyurethane", "solid_content": "25%", "pot_life": "24_hours"}'::jsonb, '{"unit_cost": 720.0, "uom": "KG", "supplier": "Coim India"}'::jsonb),
  ('LC_ADH_002', 'Solventless Adhesive Part A', '{"type": "polyol", "viscosity": "800-1200", "NCO_content": "12%"}'::jsonb, '{"unit_cost": 580.0, "uom": "KG", "supplier": "Henkel"}'::jsonb),
  ('LC_ADH_003', 'Solventless Adhesive Part B', '{"type": "isocyanate", "NCO_content": "15%", "functionality": "2.7"}'::jsonb, '{"unit_cost": 680.0, "uom": "KG", "supplier": "Henkel"}'::jsonb),
  ('LC_PRI_001', 'Corona Treatment Primer', '{"active_content": "5%", "application_method": "spray"}'::jsonb, '{"unit_cost": 850.0, "uom": "KG", "supplier": "3M"}'::jsonb),
  ('LC_REL_001', 'Silicone Release Agent', '{"active_content": "2%", "release_value": "200_CN/inch"}'::jsonb, '{"unit_cost": 1200.0, "uom": "KG", "supplier": "Dow Corning"}'::jsonb),
  ('LC_CAT_001', 'Polyurethane Catalyst', '{"active_content": "100%", "gel_time": "45_min"}'::jsonb, '{"unit_cost": 2200.0, "uom": "KG", "supplier": "Coim India"}'::jsonb),
  
  -- Adhesive Coating Materials
  ('AC_ADH_001', 'Hot Melt Adhesive PSA', '{"type": "hot_melt_PSA", "tack": "high", "temperature": "160C"}'::jsonb, '{"unit_cost": 320.0, "uom": "KG", "supplier": "H.B. Fuller"}'::jsonb),
  ('AC_ADH_002', 'Acrylic PSA Emulsion', '{"type": "acrylic_emulsion", "solid_content": "55%", "tack": "medium"}'::jsonb, '{"unit_cost": 280.0, "uom": "KG", "supplier": "Pidilite"}'::jsonb),
  ('AC_ADH_003', 'UV Curable Adhesive', '{"type": "UV_curable", "viscosity": "2000_cps", "cure_energy": "800_mj"}'::jsonb, '{"unit_cost": 1200.0, "uom": "KG", "supplier": "Henkel"}'::jsonb),
  ('AC_ACT_001', 'Crosslinker for PSA', '{"type": "isocyanate", "functionality": "3.0", "NCO_content": "18%"}'::jsonb, '{"unit_cost": 950.0, "uom": "KG", "supplier": "Covestro"}'::jsonb),
  ('AC_CHEM_001', 'Adhesion Promoter', '{"active_content": "20%", "application_rate": "0.3_gsm"}'::jsonb, '{"unit_cost": 2800.0, "uom": "KG", "supplier": "3M"}'::jsonb),
  ('AC_REL_001', 'Release Liner Paper', '{"basis_weight": "80_gsm", "release_level": "medium", "silicone_coating": "yes"}'::jsonb, '{"unit_cost": 95.0, "uom": "KG", "supplier": "Rayong Paper"}'::jsonb),
  
  -- Additional Slitting Materials
  ('SP_CORE_002', 'Cardboard Core 3 inch', '{"inner_diameter": "76mm", "wall_thickness": "8mm", "material": "recycled_cardboard"}'::jsonb, '{"unit_cost": 18.0, "uom": "PCS", "supplier": "Core Industries"}'::jsonb),
  ('SP_CORE_003', 'Cardboard Core 6 inch', '{"inner_diameter": "152mm", "wall_thickness": "10mm", "material": "virgin_cardboard"}'::jsonb, '{"unit_cost": 35.0, "uom": "PCS", "supplier": "Core Industries"}'::jsonb),
  ('SP_WRAP_001', 'LDPE Stretch Wrap', '{"thickness": "20_micron", "width": "500mm", "stretch": "300%"}'::jsonb, '{"unit_cost": 125.0, "uom": "KG", "supplier": "Polyplex"}'::jsonb),
  ('SP_BOX_001', 'Export Carton 5 Ply', '{"dimensions": "600x400x300mm", "burst_strength": "180_kgf", "material": "kraft"}'::jsonb, '{"unit_cost": 85.0, "uom": "PCS", "supplier": "VRL Packaging"}'::jsonb),
  ('SP_TAPE_001', 'BOPP Packing Tape', '{"width": "48mm", "thickness": "45_micron", "adhesive": "acrylic"}'::jsonb, '{"unit_cost": 45.0, "uom": "ROLL", "supplier": "3M"}'::jsonb),
  ('SP_LABEL_001', 'Paper Label Stock', '{"basis_weight": "80_gsm", "adhesive": "permanent", "liner": "glassine"}'::jsonb, '{"unit_cost": 120.0, "uom": "KG", "supplier": "Avery Dennison"}'::jsonb)
) AS materials(item_code, item_name, specifications, pricing_info)
WHERE NOT EXISTS (
  SELECT 1 FROM dkegl_item_master im 
  WHERE im.item_code = materials.item_code
);

-- 4. Create initial stock entries for new materials
INSERT INTO dkegl_stock (organization_id, item_code, current_qty, unit_cost, location)
SELECT 
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  im.item_code,
  CASE 
    WHEN im.item_code LIKE 'OP_%' THEN 500.0
    WHEN im.item_code LIKE 'GP_INK_%' THEN 100.0
    WHEN im.item_code LIKE 'GP_SOL_%' THEN 200.0
    WHEN im.item_code LIKE 'LC_ADH_%' THEN 150.0
    WHEN im.item_code LIKE 'AC_ADH_%' THEN 120.0
    WHEN im.item_code LIKE 'SP_%' THEN 1000.0
    ELSE 50.0
  END,
  (im.pricing_info->>'unit_cost')::numeric,
  'main_warehouse'
FROM dkegl_item_master im
WHERE im.item_code IN (
  SELECT unnest(ARRAY[
    'OP_SUBSTRATE_001', 'OP_SUBSTRATE_002', 'OP_SUBSTRATE_003', 'OP_TOOL_001', 'OP_CONS_001',
    'GP_INK_001', 'GP_INK_002', 'GP_INK_003', 'GP_INK_004', 'GP_INK_005',
    'GP_SOL_001', 'GP_SOL_002', 'GP_SOL_003', 'GP_CHEM_001', 'GP_CLEAN_001',
    'LC_ADH_001', 'LC_ADH_002', 'LC_ADH_003', 'LC_PRI_001', 'LC_REL_001', 'LC_CAT_001',
    'AC_ADH_001', 'AC_ADH_002', 'AC_ADH_003', 'AC_ACT_001', 'AC_CHEM_001', 'AC_REL_001',
    'SP_CORE_002', 'SP_CORE_003', 'SP_WRAP_001', 'SP_BOX_001', 'SP_TAPE_001', 'SP_LABEL_001'
  ])
)
AND NOT EXISTS (
  SELECT 1 FROM dkegl_stock s 
  WHERE s.item_code = im.item_code AND s.organization_id = im.organization_id
);