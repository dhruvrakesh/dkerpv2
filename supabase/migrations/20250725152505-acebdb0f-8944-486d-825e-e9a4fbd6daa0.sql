-- Add sequence_order column to workflow stages table
ALTER TABLE dkegl_workflow_stages 
ADD COLUMN IF NOT EXISTS sequence_order INTEGER DEFAULT 0;

-- Clean up duplicate stages first (keep only one of each)
DELETE FROM dkegl_workflow_stages 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY stage_name, organization_id ORDER BY created_at) as rn
    FROM dkegl_workflow_stages
    WHERE organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL')
  ) t WHERE rn > 1
);

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