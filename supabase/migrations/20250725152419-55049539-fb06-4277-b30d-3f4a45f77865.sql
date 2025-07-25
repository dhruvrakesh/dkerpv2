-- Add sequence_order column to workflow stages table
ALTER TABLE dkegl_workflow_stages 
ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 0;

-- Update existing stages with proper sequence
UPDATE dkegl_workflow_stages 
SET sequence_order = 1 
WHERE stage_name = 'Gravure Printing' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL');

UPDATE dkegl_workflow_stages 
SET sequence_order = 2
WHERE stage_name IN ('Lamination', 'Lamination & Coating') AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL');

-- Insert Adhesive Coating stage if it doesn't exist
INSERT INTO dkegl_workflow_stages (
  organization_id,
  stage_name,
  stage_description,
  sequence_order,
  is_active,
  estimated_duration_hours,
  stage_type
) 
SELECT 
  id,
  'Adhesive Coating',
  'Apply adhesive coating with precise thickness control and quality monitoring',
  3,
  true,
  8,
  'production'
FROM dkegl_organizations 
WHERE code = 'DKEGL'
AND NOT EXISTS (
  SELECT 1 FROM dkegl_workflow_stages 
  WHERE stage_name = 'Adhesive Coating' 
  AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')
);

UPDATE dkegl_workflow_stages 
SET sequence_order = 4 
WHERE stage_name = 'Slitting' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL');

UPDATE dkegl_workflow_stages 
SET sequence_order = 5 
WHERE stage_name = 'Packaging' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL');