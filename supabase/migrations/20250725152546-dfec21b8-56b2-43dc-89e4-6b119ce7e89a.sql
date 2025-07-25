-- Add sequence_order column to workflow stages table
ALTER TABLE dkegl_workflow_stages 
ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 0;

-- Update existing stages with proper sequence
UPDATE dkegl_workflow_stages 
SET sequence_order = 1 
WHERE stage_name = 'Gravure Printing' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL');

UPDATE dkegl_workflow_stages 
SET sequence_order = 2
WHERE stage_name = 'Lamination' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL');

UPDATE dkegl_workflow_stages 
SET sequence_order = 3
WHERE stage_name = 'Adhesive Coating' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL');

UPDATE dkegl_workflow_stages 
SET sequence_order = 4 
WHERE stage_name = 'Slitting' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL');

UPDATE dkegl_workflow_stages 
SET sequence_order = 5 
WHERE stage_name = 'Packaging' AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL');