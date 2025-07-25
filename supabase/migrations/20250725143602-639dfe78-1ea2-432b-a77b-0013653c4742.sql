-- Clean up duplicate workflow stages
DELETE FROM dkegl_workflow_stages 
WHERE id NOT IN (
  SELECT DISTINCT ON (stage_name, organization_id) id 
  FROM dkegl_workflow_stages 
  ORDER BY stage_name, organization_id, created_at ASC
);

-- Update workflow progress records that might reference deleted stages
-- First, get the remaining stage IDs for each stage name
WITH remaining_stages AS (
  SELECT DISTINCT ON (stage_name, organization_id) 
    id, stage_name, organization_id
  FROM dkegl_workflow_stages 
  ORDER BY stage_name, organization_id, created_at ASC
)
UPDATE dkegl_workflow_progress 
SET stage_id = rs.id
FROM remaining_stages rs, dkegl_workflow_stages ws
WHERE dkegl_workflow_progress.stage_id = ws.id 
  AND ws.stage_name = rs.stage_name 
  AND ws.organization_id = rs.organization_id 
  AND dkegl_workflow_progress.stage_id != rs.id;