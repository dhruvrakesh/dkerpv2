-- Update workflow stages to match the 5 exhaustive manufacturing stages
-- First, update existing stages to match the constrained list
UPDATE dkegl_workflow_stages SET 
  stage_name = 'Order Punching',
  stage_type = 'punching',
  sequence_order = 1,
  is_active = true
WHERE stage_name = 'Artwork Review';

UPDATE dkegl_workflow_stages SET 
  stage_name = 'Gravure Printing',
  stage_type = 'printing', 
  sequence_order = 2,
  is_active = true
WHERE stage_name = 'Gravure Printing';

UPDATE dkegl_workflow_stages SET 
  stage_name = 'Lamination Coating',
  stage_type = 'lamination',
  sequence_order = 3,
  is_active = true
WHERE stage_name = 'Lamination';

UPDATE dkegl_workflow_stages SET 
  stage_name = 'Adhesive Coating',
  stage_type = 'coating',
  sequence_order = 4,
  is_active = true
WHERE stage_name = 'Adhesive Coating';

UPDATE dkegl_workflow_stages SET 
  stage_name = 'Slitting Packaging',
  stage_type = 'slitting_packaging',
  sequence_order = 5,
  is_active = true
WHERE stage_name = 'Slitting';

-- Update Packaging to be part of Slitting Packaging stage
UPDATE dkegl_workflow_stages SET 
  is_active = false
WHERE stage_name = 'Packaging';

-- Remove non-core stages
UPDATE dkegl_workflow_stages SET 
  is_active = false
WHERE stage_name IN ('Cylinder Preparation', 'Coating', 'Quality Assurance');

-- Add stage material categories to stage_config
UPDATE dkegl_workflow_stages SET 
  stage_config = jsonb_set(
    stage_config, 
    '{material_categories}', 
    '["substrate", "tooling", "consumables"]'
  )
WHERE stage_name = 'Order Punching';

UPDATE dkegl_workflow_stages SET 
  stage_config = jsonb_set(
    stage_config, 
    '{material_categories}', 
    '["substrate", "inks", "solvents", "plates", "chemicals", "cleaning_agents"]'
  )
WHERE stage_name = 'Gravure Printing';

UPDATE dkegl_workflow_stages SET 
  stage_config = jsonb_set(
    stage_config, 
    '{material_categories}', 
    '["substrate", "adhesives", "primers", "release_agents", "catalysts"]'
  )
WHERE stage_name = 'Lamination Coating';

UPDATE dkegl_workflow_stages SET 
  stage_config = jsonb_set(
    stage_config, 
    '{material_categories}', 
    '["substrate", "specialized_adhesives", "activators", "coating_chemicals"]'
  )
WHERE stage_name = 'Adhesive Coating';

UPDATE dkegl_workflow_stages SET 
  stage_config = jsonb_set(
    stage_config, 
    '{material_categories}', 
    '["substrate", "cores", "stretch_wrap", "packaging_materials", "labels"]'
  )
WHERE stage_name = 'Slitting Packaging';