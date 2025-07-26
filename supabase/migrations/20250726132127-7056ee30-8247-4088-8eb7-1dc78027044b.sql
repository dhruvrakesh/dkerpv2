-- Complete the remaining data cleanup steps
-- Step 3: Ensure proper sequencing for remaining entries
UPDATE dkegl_workflow_progress 
SET sequence_order = ws.stage_order
FROM dkegl_workflow_stages ws
WHERE dkegl_workflow_progress.stage_id = ws.id
AND (dkegl_workflow_progress.sequence_order != ws.stage_order OR dkegl_workflow_progress.sequence_order IS NULL);

-- Step 4: Add constraint to prevent future duplicates (ignore if exists)
DO $$ 
BEGIN
    ALTER TABLE dkegl_workflow_progress 
    ADD CONSTRAINT unique_order_stage_progress 
    UNIQUE (order_id, stage_id);
EXCEPTION
    WHEN duplicate_table THEN
        -- Constraint already exists, continue
        NULL;
END $$;

-- Step 5: Update workflow stages sequence to ensure proper ordering
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