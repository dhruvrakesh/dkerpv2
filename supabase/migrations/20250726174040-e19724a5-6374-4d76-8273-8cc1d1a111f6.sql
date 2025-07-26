-- First, update the check constraint to allow new stage types
ALTER TABLE dkegl_workflow_stages DROP CONSTRAINT dkegl_workflow_stages_stage_type_check;

-- Add new constraint with the constrained stage types
ALTER TABLE dkegl_workflow_stages ADD CONSTRAINT dkegl_workflow_stages_stage_type_check 
CHECK (stage_type = ANY (ARRAY['punching'::text, 'printing'::text, 'lamination'::text, 'coating'::text, 'slitting_packaging'::text, 'rework'::text]));

-- Update existing stages to match the 5 exhaustive manufacturing stages
UPDATE dkegl_workflow_stages SET 
  stage_name = 'Order Punching',
  stage_type = 'punching',
  sequence_order = 1,
  is_active = true
WHERE id = '67479a13-0c88-4d99-acee-80db199196f8';

UPDATE dkegl_workflow_stages SET 
  stage_name = 'Gravure Printing',
  stage_type = 'printing', 
  sequence_order = 2,
  is_active = true
WHERE id = '788ff511-152b-45c0-bbfb-2807ff862d54';

UPDATE dkegl_workflow_stages SET 
  stage_name = 'Lamination Coating',
  stage_type = 'lamination',
  sequence_order = 3,
  is_active = true
WHERE id = '720991c7-b6b7-4b1c-947d-fe741838fe4a';

UPDATE dkegl_workflow_stages SET 
  stage_name = 'Adhesive Coating',
  stage_type = 'coating',
  sequence_order = 4,
  is_active = true
WHERE id = 'e97d1fdb-8c12-4207-ab7c-5931d044f112';

UPDATE dkegl_workflow_stages SET 
  stage_name = 'Slitting Packaging',
  stage_type = 'slitting_packaging',
  sequence_order = 5,
  is_active = true
WHERE id = '940bcff7-97ff-49a9-943d-9c6e5af43a78';

-- Deactivate non-core stages
UPDATE dkegl_workflow_stages SET is_active = false 
WHERE id IN ('6437d309-8a98-4b88-9fd5-9b9c233a8a65', 'ef4f9894-e983-46bf-b0c7-f4d19b8079af', '4752c19e-1f23-4b46-9e70-6eeb2c527b9d', 'aafcd8f9-28aa-4f66-86c4-6cdf71a488de');

-- Add material categories to stage configurations
UPDATE dkegl_workflow_stages SET 
  stage_config = jsonb_set(stage_config, '{material_categories}', '["substrate", "tooling", "consumables"]')
WHERE stage_name = 'Order Punching';

UPDATE dkegl_workflow_stages SET 
  stage_config = jsonb_set(stage_config, '{material_categories}', '["substrate", "inks", "solvents", "plates", "chemicals", "cleaning_agents"]')
WHERE stage_name = 'Gravure Printing';

UPDATE dkegl_workflow_stages SET 
  stage_config = jsonb_set(stage_config, '{material_categories}', '["substrate", "adhesives", "primers", "release_agents", "catalysts"]')
WHERE stage_name = 'Lamination Coating';

UPDATE dkegl_workflow_stages SET 
  stage_config = jsonb_set(stage_config, '{material_categories}', '["substrate", "specialized_adhesives", "activators", "coating_chemicals"]')
WHERE stage_name = 'Adhesive Coating';

UPDATE dkegl_workflow_stages SET 
  stage_config = jsonb_set(stage_config, '{material_categories}', '["substrate", "cores", "stretch_wrap", "packaging_materials", "labels"]')
WHERE stage_name = 'Slitting Packaging';