-- First update all existing stage types to valid values before changing constraint
UPDATE dkegl_workflow_stages SET stage_type = 'punching' WHERE stage_name = 'Artwork Review';
UPDATE dkegl_workflow_stages SET stage_type = 'printing' WHERE stage_name = 'Cylinder Preparation';  
UPDATE dkegl_workflow_stages SET stage_type = 'printing' WHERE stage_name = 'Gravure Printing';
UPDATE dkegl_workflow_stages SET stage_type = 'coating' WHERE stage_name = 'Coating';
UPDATE dkegl_workflow_stages SET stage_type = 'lamination' WHERE stage_name = 'Lamination';
UPDATE dkegl_workflow_stages SET stage_type = 'coating' WHERE stage_name = 'Adhesive Coating';
UPDATE dkegl_workflow_stages SET stage_type = 'slitting_packaging' WHERE stage_name = 'Slitting';
UPDATE dkegl_workflow_stages SET stage_type = 'slitting_packaging' WHERE stage_name = 'Packaging';
UPDATE dkegl_workflow_stages SET stage_type = 'rework' WHERE stage_name = 'Quality Assurance';

-- Now drop and recreate the constraint
ALTER TABLE dkegl_workflow_stages DROP CONSTRAINT dkegl_workflow_stages_stage_type_check;
ALTER TABLE dkegl_workflow_stages ADD CONSTRAINT dkegl_workflow_stages_stage_type_check 
CHECK (stage_type = ANY (ARRAY['punching'::text, 'printing'::text, 'lamination'::text, 'coating'::text, 'slitting_packaging'::text, 'rework'::text]));

-- Now update to the 5 exhaustive stages
UPDATE dkegl_workflow_stages SET 
  stage_name = 'Order Punching',
  stage_type = 'punching',
  sequence_order = 1,
  is_active = true
WHERE stage_name = 'Artwork Review';

UPDATE dkegl_workflow_stages SET 
  stage_name = 'Gravure Printing',
  sequence_order = 2,
  is_active = true
WHERE stage_name = 'Gravure Printing';

UPDATE dkegl_workflow_stages SET 
  stage_name = 'Lamination Coating',
  sequence_order = 3,
  is_active = true
WHERE stage_name = 'Lamination';

UPDATE dkegl_workflow_stages SET 
  stage_name = 'Adhesive Coating',
  sequence_order = 4,
  is_active = true
WHERE stage_name = 'Adhesive Coating';

UPDATE dkegl_workflow_stages SET 
  stage_name = 'Slitting Packaging',
  sequence_order = 5,
  is_active = true
WHERE stage_name = 'Slitting';