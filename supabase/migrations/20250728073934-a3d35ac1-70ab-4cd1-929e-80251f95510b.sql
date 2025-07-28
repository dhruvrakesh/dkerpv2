-- Fix GRN duplicate constraints to allow same GRN number for multiple items
-- but prevent duplicate GRN+Item combinations

-- Remove the problematic constraint that prevents same GRN number entirely
ALTER TABLE dkegl_grn_log DROP CONSTRAINT IF EXISTS dkegl_grn_log_organization_id_grn_number_key;

-- Remove the duplicate constraint for cleaner schema
ALTER TABLE dkegl_grn_log DROP CONSTRAINT IF EXISTS unique_grn_item_combo;

-- Ensure the correct composite constraint exists (GRN + Item uniqueness)
-- This should already exist but add it if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'dkegl_grn_log_unique_composite' 
        AND table_name = 'dkegl_grn_log'
    ) THEN
        ALTER TABLE dkegl_grn_log 
        ADD CONSTRAINT dkegl_grn_log_unique_composite 
        UNIQUE (organization_id, grn_number, item_code);
    END IF;
END $$;