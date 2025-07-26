-- Update existing BOM components to link to proper stage IDs based on stage_name
UPDATE dkegl_bom_components SET stage_id = (
  SELECT id FROM dkegl_workflow_stages 
  WHERE stage_name = dkegl_bom_components.stage_name 
  AND is_active = true
  LIMIT 1
) WHERE stage_name IS NOT NULL AND stage_id IS NULL;