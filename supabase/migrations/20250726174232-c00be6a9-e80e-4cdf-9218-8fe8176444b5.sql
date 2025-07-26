-- Drop constraint entirely first
ALTER TABLE dkegl_workflow_stages DROP CONSTRAINT IF EXISTS dkegl_workflow_stages_stage_type_check;

-- Update all stage types to match our constrained model
UPDATE dkegl_workflow_stages SET stage_type = 'punching' WHERE stage_name = 'Artwork Review';
UPDATE dkegl_workflow_stages SET stage_type = 'printing' WHERE stage_name = 'Cylinder Preparation';  
UPDATE dkegl_workflow_stages SET stage_type = 'printing' WHERE stage_name = 'Gravure Printing';
UPDATE dkegl_workflow_stages SET stage_type = 'coating' WHERE stage_name = 'Coating';
UPDATE dkegl_workflow_stages SET stage_type = 'lamination' WHERE stage_name = 'Lamination';
UPDATE dkegl_workflow_stages SET stage_type = 'coating' WHERE stage_name = 'Adhesive Coating';
UPDATE dkegl_workflow_stages SET stage_type = 'slitting_packaging' WHERE stage_name = 'Slitting';
UPDATE dkegl_workflow_stages SET stage_type = 'slitting_packaging' WHERE stage_name = 'Packaging';
UPDATE dkegl_workflow_stages SET stage_type = 'rework' WHERE stage_name = 'Quality Assurance';

-- Now update stage names to the 5 exhaustive stages
UPDATE dkegl_workflow_stages SET 
  stage_name = 'Order Punching',
  sequence_order = 1,
  is_active = true
WHERE stage_type = 'punching' AND stage_name = 'Artwork Review';

UPDATE dkegl_workflow_stages SET 
  stage_name = 'Gravure Printing',
  sequence_order = 2,
  is_active = true
WHERE stage_type = 'printing' AND stage_name = 'Gravure Printing';

UPDATE dkegl_workflow_stages SET 
  stage_name = 'Lamination Coating',
  sequence_order = 3,
  is_active = true
WHERE stage_type = 'lamination' AND stage_name = 'Lamination';

UPDATE dkegl_workflow_stages SET 
  stage_name = 'Adhesive Coating',
  sequence_order = 4,
  is_active = true
WHERE stage_type = 'coating' AND stage_name = 'Adhesive Coating';

UPDATE dkegl_workflow_stages SET 
  stage_name = 'Slitting Packaging',
  sequence_order = 5,
  is_active = true
WHERE stage_type = 'slitting_packaging' AND stage_name = 'Slitting';

-- Deactivate non-core stages  
UPDATE dkegl_workflow_stages SET is_active = false 
WHERE stage_name IN ('Cylinder Preparation', 'Coating', 'Packaging', 'Quality Assurance');

-- Add back the constraint
ALTER TABLE dkegl_workflow_stages ADD CONSTRAINT dkegl_workflow_stages_stage_type_check 
CHECK (stage_type = ANY (ARRAY['punching'::text, 'printing'::text, 'lamination'::text, 'coating'::text, 'slitting_packaging'::text, 'rework'::text]));

-- Add material categories to stage configurations
UPDATE dkegl_workflow_stages SET 
  stage_config = jsonb_set(COALESCE(stage_config, '{}'), '{material_categories}', '["substrate", "tooling", "consumables"]')
WHERE stage_name = 'Order Punching';

UPDATE dkegl_workflow_stages SET 
  stage_config = jsonb_set(COALESCE(stage_config, '{}'), '{material_categories}', '["substrate", "inks", "solvents", "plates", "chemicals", "cleaning_agents"]')
WHERE stage_name = 'Gravure Printing';

UPDATE dkegl_workflow_stages SET 
  stage_config = jsonb_set(COALESCE(stage_config, '{}'), '{material_categories}', '["substrate", "adhesives", "primers", "release_agents", "catalysts"]')
WHERE stage_name = 'Lamination Coating';

UPDATE dkegl_workflow_stages SET 
  stage_config = jsonb_set(COALESCE(stage_config, '{}'), '{material_categories}', '["substrate", "specialized_adhesives", "activators", "coating_chemicals"]')
WHERE stage_name = 'Adhesive Coating';

UPDATE dkegl_workflow_stages SET 
  stage_config = jsonb_set(COALESCE(stage_config, '{}'), '{material_categories}', '["substrate", "cores", "stretch_wrap", "packaging_materials", "labels"]')
WHERE stage_name = 'Slitting Packaging';