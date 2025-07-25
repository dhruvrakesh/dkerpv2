-- Keep only one instance of each workflow stage by retaining the one with the lowest ID
-- This avoids foreign key constraint issues

-- Update workflow progress to reference the correct stage IDs
UPDATE dkegl_workflow_progress SET stage_id = '788ff511-152b-45c0-bbfb-2807ff862d54' 
WHERE stage_id = '3969d163-1636-45d1-941c-a581b566b8a5';

UPDATE dkegl_workflow_progress SET stage_id = '720991c7-b6b7-4b1c-947d-fe741838fe4a' 
WHERE stage_id = 'be7ec2f9-6cb2-48be-bbfe-6f6e8c8f7e91';

UPDATE dkegl_workflow_progress SET stage_id = '940bcff7-97ff-49a9-943d-9c6e5af43a78' 
WHERE stage_id = 'a2390cc4-4af7-43d5-919c-68e3eebd640a';

-- Now delete the duplicate stages
DELETE FROM dkegl_workflow_stages WHERE id IN (
  '3969d163-1636-45d1-941c-a581b566b8a5',
  'be7ec2f9-6cb2-48be-bbfe-6f6e8c8f7e91', 
  'a2390cc4-4af7-43d5-919c-68e3eebd640a'
);

-- Disable stages not part of the main workflow
UPDATE dkegl_workflow_stages SET is_active = false 
WHERE stage_name IN ('Artwork Review', 'Cylinder Preparation', 'Quality Assurance', 'Coating')
AND organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL');