-- Phase 1: Critical Data Cleanup
-- Step 1: Remove orphaned workflow progress entries (entries with null stage_id)
DELETE FROM dkegl_workflow_progress 
WHERE stage_id IS NULL;

-- Step 2: Remove duplicate workflow progress entries, keeping the most recent one with highest progress
WITH duplicate_entries AS (
  SELECT 
    id,
    order_id,
    stage_id,
    progress_percentage,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY order_id, stage_id 
      ORDER BY progress_percentage DESC, created_at DESC
    ) as row_num
  FROM dkegl_workflow_progress
  WHERE order_id IS NOT NULL AND stage_id IS NOT NULL
)
DELETE FROM dkegl_workflow_progress 
WHERE id IN (
  SELECT id 
  FROM duplicate_entries 
  WHERE row_num > 1
);

-- Step 3: Clean up any remaining inconsistent data
-- Remove entries where stage doesn't belong to the same organization as order
DELETE FROM dkegl_workflow_progress 
WHERE id IN (
  SELECT wp.id
  FROM dkegl_workflow_progress wp
  JOIN dkegl_orders o ON wp.order_id = o.id
  JOIN dkegl_workflow_stages ws ON wp.stage_id = ws.id
  WHERE o.organization_id != ws.organization_id
);

-- Step 4: Ensure proper sequencing for remaining entries
-- Update sequence_order to match stage_order from workflow_stages
UPDATE dkegl_workflow_progress 
SET sequence_order = ws.stage_order
FROM dkegl_workflow_stages ws
WHERE dkegl_workflow_progress.stage_id = ws.id
AND (dkegl_workflow_progress.sequence_order != ws.stage_order OR dkegl_workflow_progress.sequence_order IS NULL);

-- Step 5: Add constraint to prevent future duplicates
ALTER TABLE dkegl_workflow_progress 
ADD CONSTRAINT unique_order_stage_progress 
UNIQUE (order_id, stage_id);

-- Step 6: Update workflow stages sequence to ensure proper ordering
UPDATE dkegl_workflow_stages 
SET stage_order = CASE stage_name
  WHEN 'Artwork Review' THEN 1
  WHEN 'Cylinder Preparation' THEN 2
  WHEN 'Gravure Printing' THEN 3
  WHEN 'Lamination' THEN 4
  WHEN 'Adhesive Coating' THEN 5
  WHEN 'Slitting' THEN 6
  WHEN 'Packaging' THEN 7
  WHEN 'Quality Assurance' THEN 8
  ELSE stage_order
END
WHERE stage_name IN ('Artwork Review', 'Cylinder Preparation', 'Gravure Printing', 'Lamination', 'Adhesive Coating', 'Slitting', 'Packaging', 'Quality Assurance');

-- Step 7: Clean up any test data or incomplete orders that might cause issues
DELETE FROM dkegl_workflow_progress 
WHERE order_id IN (
  SELECT id FROM dkegl_orders 
  WHERE status = 'draft' 
  AND created_at < now() - INTERVAL '7 days'
);