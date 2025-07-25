-- Create comprehensive audit log table for tracking all system changes
CREATE TABLE IF NOT EXISTS public.dkegl_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.dkegl_organizations(id),
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'auto_progress', 'bulk_upload', 'approval', 'quality_check', 'stage_transition')),
  old_values JSONB,
  new_values JSONB,
  user_id UUID REFERENCES auth.users(id),
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_dkegl_audit_log_org_table ON public.dkegl_audit_log(organization_id, table_name);
CREATE INDEX IF NOT EXISTS idx_dkegl_audit_log_created_at ON public.dkegl_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dkegl_audit_log_user ON public.dkegl_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_dkegl_audit_log_record ON public.dkegl_audit_log(table_name, record_id);

-- Enable RLS
ALTER TABLE public.dkegl_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "DKEGL organization members can access audit logs"
ON public.dkegl_audit_log
FOR ALL
TO authenticated
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Create error log table for system monitoring
CREATE TABLE IF NOT EXISTS public.dkegl_error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.dkegl_organizations(id),
  error_type TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  context JSONB DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID REFERENCES auth.users(id),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for error monitoring
CREATE INDEX IF NOT EXISTS idx_dkegl_error_log_org ON public.dkegl_error_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_dkegl_error_log_severity ON public.dkegl_error_log(severity);
CREATE INDEX IF NOT EXISTS idx_dkegl_error_log_unresolved ON public.dkegl_error_log(resolved) WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_dkegl_error_log_created_at ON public.dkegl_error_log(created_at DESC);

-- Enable RLS for error log
ALTER TABLE public.dkegl_error_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for error log
CREATE POLICY "DKEGL organization members can access error logs"
ON public.dkegl_error_log
FOR ALL
TO authenticated
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Add missing sequence_order column to workflow stages if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dkegl_workflow_stages' AND column_name = 'sequence_order') THEN
    ALTER TABLE public.dkegl_workflow_stages ADD COLUMN sequence_order INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add missing is_active column to workflow stages if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dkegl_workflow_stages' AND column_name = 'is_active') THEN
    ALTER TABLE public.dkegl_workflow_stages ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Update existing workflow stages with proper sequence order
UPDATE public.dkegl_workflow_stages 
SET sequence_order = CASE stage_name
  WHEN 'Artwork Review' THEN 1
  WHEN 'Cylinder Preparation' THEN 2
  WHEN 'Gravure Printing' THEN 3
  WHEN 'Lamination' THEN 4
  WHEN 'Adhesive Coating' THEN 5
  WHEN 'Slitting' THEN 6
  WHEN 'Packaging' THEN 7
  WHEN 'Quality Assurance' THEN 8
  WHEN 'Coating' THEN 9
  ELSE 10
END
WHERE sequence_order = 0 OR sequence_order IS NULL;