-- Now delete the duplicate stages after updating all references
DELETE FROM dkegl_workflow_stages WHERE id IN (
  '3969d163-1636-45d1-941c-a581b566b8a5',
  'be7ec2f9-6cb2-48be-bbfe-6f6e8c8f7e91', 
  'a2390cc4-4af7-43d5-919c-68e3eebd640a'
);

-- Disable stages not part of the main workflow
UPDATE dkegl_workflow_stages SET is_active = false 
WHERE stage_name IN ('Artwork Review', 'Cylinder Preparation', 'Quality Assurance', 'Coating')
AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL');