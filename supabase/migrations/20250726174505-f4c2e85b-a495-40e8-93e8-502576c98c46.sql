-- Add stage_id column to BOM components for proper stage linkage
ALTER TABLE dkegl_bom_components ADD COLUMN stage_id UUID REFERENCES dkegl_workflow_stages(id);

-- Update existing BOM components to link to proper stage IDs based on stage_name
UPDATE dkegl_bom_components SET stage_id = (
  SELECT id FROM dkegl_workflow_stages 
  WHERE stage_name = dkegl_bom_components.stage_name 
  LIMIT 1
) WHERE stage_name IS NOT NULL;

-- Add index for better performance
CREATE INDEX idx_bom_components_stage_id ON dkegl_bom_components(stage_id);