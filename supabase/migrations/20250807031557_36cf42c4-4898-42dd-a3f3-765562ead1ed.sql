-- Check if details column exists in dkegl_audit_log and add it if missing
DO $$
BEGIN
    -- Check if details column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dkegl_audit_log' 
        AND column_name = 'details'
    ) THEN
        -- Add details column if it doesn't exist
        ALTER TABLE public.dkegl_audit_log 
        ADD COLUMN details JSONB DEFAULT '{}';
        
        RAISE NOTICE 'Added details column to dkegl_audit_log table';
    ELSE
        RAISE NOTICE 'Details column already exists in dkegl_audit_log table';
    END IF;
END $$;