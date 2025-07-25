-- Update all foreign key references to use the correct stage IDs before deletion

-- Update material consumption references
UPDATE dkegl_material_consumption SET stage_id = '788ff511-152b-45c0-bbfb-2807ff862d54' 
WHERE stage_id = '3969d163-1636-45d1-941c-a581b566b8a5';

UPDATE dkegl_material_consumption SET stage_id = '720991c7-b6b7-4b1c-947d-fe741838fe4a' 
WHERE stage_id = 'be7ec2f9-6cb2-48be-bbfe-6f6e8c8f7e91';

UPDATE dkegl_material_consumption SET stage_id = '940bcff7-97ff-49a9-943d-9c6e5af43a78' 
WHERE stage_id = 'a2390cc4-4af7-43d5-919c-68e3eebd640a';

-- Update workflow progress references
UPDATE dkegl_workflow_progress SET stage_id = '788ff511-152b-45c0-bbfb-2807ff862d54' 
WHERE stage_id = '3969d163-1636-45d1-941c-a581b566b8a5';

UPDATE dkegl_workflow_progress SET stage_id = '720991c7-b6b7-4b1c-947d-fe741838fe4a' 
WHERE stage_id = 'be7ec2f9-6cb2-48be-bbfe-6f6e8c8f7e91';

UPDATE dkegl_workflow_progress SET stage_id = '940bcff7-97ff-49a9-943d-9c6e5af43a78' 
WHERE stage_id = 'a2390cc4-4af7-43d5-919c-68e3eebd640a';

-- Update waste tracking references if they exist
UPDATE dkegl_waste_tracking SET stage_id = '788ff511-152b-45c0-bbfb-2807ff862d54' 
WHERE stage_id = '3969d163-1636-45d1-941c-a581b566b8a5';

UPDATE dkegl_waste_tracking SET stage_id = '720991c7-b6b7-4b1c-947d-fe741838fe4a' 
WHERE stage_id = 'be7ec2f9-6cb2-48be-bbfe-6f6e8c8f7e91';

UPDATE dkegl_waste_tracking SET stage_id = '940bcff7-97ff-49a9-943d-9c6e5af43a78' 
WHERE stage_id = 'a2390cc4-4af7-43d5-919c-68e3eebd640a';