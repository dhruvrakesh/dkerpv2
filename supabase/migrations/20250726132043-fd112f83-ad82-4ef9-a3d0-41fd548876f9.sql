-- Phase 1: Critical Data Cleanup (Fixed approach)
-- Step 1: Remove material consumption records that reference workflow progress entries we want to delete

-- First, identify orphaned workflow progress entries
CREATE TEMP TABLE orphaned_workflow_progress AS
SELECT id FROM dkegl_workflow_progress WHERE stage_id IS NULL;

-- Remove material consumption records referencing orphaned entries
DELETE FROM dkegl_material_consumption 
WHERE workflow_progress_id IN (SELECT id FROM orphaned_workflow_progress);

-- Remove waste tracking records referencing orphaned entries
DELETE FROM dkegl_waste_tracking 
WHERE workflow_progress_id IN (SELECT id FROM orphaned_workflow_progress);

-- Now remove orphaned workflow progress entries
DELETE FROM dkegl_workflow_progress WHERE stage_id IS NULL;

-- Step 2: Handle duplicates more carefully
-- First, identify duplicate entries and the ones to keep/remove
CREATE TEMP TABLE duplicate_analysis AS
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
SELECT id, row_num FROM duplicate_entries WHERE row_num > 1;

-- Remove material consumption records for duplicate workflow progress entries
DELETE FROM dkegl_material_consumption 
WHERE workflow_progress_id IN (SELECT id FROM duplicate_analysis);

-- Remove waste tracking records for duplicate workflow progress entries
DELETE FROM dkegl_waste_tracking 
WHERE workflow_progress_id IN (SELECT id FROM duplicate_analysis);

-- Now remove duplicate workflow progress entries
DELETE FROM dkegl_workflow_progress 
WHERE id IN (SELECT id FROM duplicate_analysis);

-- Clean up temp tables
DROP TABLE orphaned_workflow_progress;
DROP TABLE duplicate_analysis;