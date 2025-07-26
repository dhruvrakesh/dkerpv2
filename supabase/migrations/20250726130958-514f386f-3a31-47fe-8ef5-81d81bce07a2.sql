-- First, let's clean up duplicate workflow progress entries
-- Keep only the latest entry for each order-stage combination with the same status

WITH duplicates AS (
  SELECT 
    id,
    order_id,
    stage_id,
    status,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY order_id, stage_id, status 
      ORDER BY created_at DESC
    ) as rn
  FROM dkegl_workflow_progress
  WHERE organization_id = '6f29896c-fd64-417e-86d6-ee8e00a4a072'
)
DELETE FROM dkegl_workflow_progress 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add a unique constraint to prevent future duplicates for the same order-stage-status combination
ALTER TABLE dkegl_workflow_progress 
ADD CONSTRAINT unique_order_stage_status 
UNIQUE (organization_id, order_id, stage_id, status);

-- Create an index to optimize workflow queries
CREATE INDEX IF NOT EXISTS idx_workflow_progress_lookup 
ON dkegl_workflow_progress (organization_id, order_id, stage_id, status);

-- Update sequence_order for stages to ensure consistent ordering
UPDATE dkegl_workflow_stages 
SET sequence_order = stage_order 
WHERE organization_id = '6f29896c-fd64-417e-86d6-ee8e00a4a072' 
AND sequence_order != stage_order;