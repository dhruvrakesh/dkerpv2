-- First, let's check what duplicate entries we have
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
SELECT order_id, stage_id, status, COUNT(*) as count
FROM duplicates 
WHERE rn > 1
GROUP BY order_id, stage_id, status
ORDER BY count DESC;

-- Instead of deleting, let's just add the constraint to prevent future duplicates
-- and let the application handle filtering duplicates in the frontend

-- Create an index to optimize workflow queries
CREATE INDEX IF NOT EXISTS idx_workflow_progress_lookup 
ON dkegl_workflow_progress (organization_id, order_id, stage_id, status);

-- Update sequence_order for stages to ensure consistent ordering
UPDATE dkegl_workflow_stages 
SET sequence_order = stage_order 
WHERE organization_id = '6f29896c-fd64-417e-86d6-ee8e00a4a072' 
AND (sequence_order != stage_order OR sequence_order IS NULL);