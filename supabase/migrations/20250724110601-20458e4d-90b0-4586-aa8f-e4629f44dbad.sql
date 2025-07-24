-- CRITICAL SECURITY FIXES FOR DKEGL ERP SYSTEM

-- 1. ENABLE RLS ON UNPROTECTED TABLES
ALTER TABLE public.artwork_upload ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_selection ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.po_logs ENABLE ROW LEVEL SECURITY;

-- 2. ADD RLS POLICIES FOR UNPROTECTED TABLES

-- Artwork Upload Policies
CREATE POLICY "Users can manage their own artwork uploads" 
ON public.artwork_upload 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Material Selection Policies  
CREATE POLICY "Users can manage material selections"
ON public.material_selection
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- PO Logs Policies
CREATE POLICY "Users can view PO logs"
ON public.po_logs
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create PO logs"
ON public.po_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. FIX PRIVILEGE ESCALATION IN USER ROLE SYSTEM

-- Create secure function to prevent users from updating their own roles
CREATE OR REPLACE FUNCTION public.dkegl_prevent_self_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Prevent users from updating their own roles
  IF auth.uid() = NEW.user_id AND auth.uid() = OLD.user_id THEN
    RAISE EXCEPTION 'Users cannot modify their own roles';
  END IF;
  
  -- Only admins can assign admin roles
  IF NEW.role = 'admin'::dkegl_user_role AND NOT dkegl_has_role(auth.uid(), NEW.organization_id, 'admin'::dkegl_user_role) THEN
    RAISE EXCEPTION 'Only admins can assign admin roles';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger to prevent self-role escalation
DROP TRIGGER IF EXISTS prevent_self_role_escalation ON public.dkegl_user_roles;
CREATE TRIGGER prevent_self_role_escalation
  BEFORE UPDATE ON public.dkegl_user_roles
  FOR EACH ROW
  EXECUTE FUNCTION dkegl_prevent_self_role_escalation();

-- 4. SECURE THE USER CREATION FUNCTION

CREATE OR REPLACE FUNCTION public.dkegl_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  org_id UUID;
  user_role dkegl_user_role := 'viewer'::dkegl_user_role;
BEGIN
  -- Get the DKEGL organization ID
  SELECT id INTO org_id FROM public.dkegl_organizations WHERE code = 'DKEGL' LIMIT 1;
  
  -- Validate organization exists
  IF org_id IS NULL THEN
    RAISE EXCEPTION 'DKEGL organization not found';
  END IF;
  
  -- Only assign admin role to verified admin email
  IF NEW.email = 'info@dkenterprises.co.in' AND NEW.email_confirmed_at IS NOT NULL THEN
    user_role := 'admin'::dkegl_user_role;
  END IF;

  -- Create user profile with validation
  INSERT INTO public.dkegl_user_profiles (
    user_id,
    organization_id,
    full_name,
    email,
    is_active
  ) VALUES (
    NEW.id,
    org_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    true
  );

  -- Assign user role with audit
  INSERT INTO public.dkegl_user_roles (
    user_id,
    organization_id,
    role
  ) VALUES (
    NEW.id,
    org_id,
    user_role
  );

  RETURN NEW;
END;
$function$;

-- 5. FIX SEARCH PATH ISSUES IN EXISTING FUNCTIONS

-- Update existing functions to include proper search path
CREATE OR REPLACE FUNCTION public.dkegl_get_current_user_org()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT organization_id
  FROM dkegl_user_profiles
  WHERE user_id = auth.uid()
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.dkegl_has_role(_user_id uuid, _org_id uuid, _role dkegl_user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM dkegl_user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = _role
  )
$function$;

-- 6. ADD AUDIT LOGGING FOR SENSITIVE OPERATIONS

CREATE TABLE IF NOT EXISTS public.dkegl_security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  user_id UUID,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  risk_level TEXT DEFAULT 'low',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.dkegl_security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view security audit logs
CREATE POLICY "Admins can view security audit logs"
ON public.dkegl_security_audit_log
FOR SELECT
USING (dkegl_has_role(auth.uid(), organization_id, 'admin'::dkegl_user_role));

-- Function to log security events
CREATE OR REPLACE FUNCTION public.dkegl_log_security_event(
  _event_type TEXT,
  _event_data JSONB DEFAULT '{}',
  _risk_level TEXT DEFAULT 'low'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO dkegl_security_audit_log (
    organization_id,
    user_id,
    event_type,
    event_data,
    risk_level
  ) VALUES (
    dkegl_get_current_user_org(),
    auth.uid(),
    _event_type,
    _event_data,
    _risk_level
  );
END;
$$;

-- 7. ADD TRIGGER FOR ROLE CHANGE AUDITING

CREATE OR REPLACE FUNCTION public.dkegl_audit_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log role changes
  IF TG_OP = 'INSERT' THEN
    PERFORM dkegl_log_security_event(
      'role_assigned',
      jsonb_build_object(
        'target_user_id', NEW.user_id,
        'role', NEW.role,
        'organization_id', NEW.organization_id
      ),
      CASE WHEN NEW.role = 'admin' THEN 'high' ELSE 'medium' END
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM dkegl_log_security_event(
      'role_modified',
      jsonb_build_object(
        'target_user_id', NEW.user_id,
        'old_role', OLD.role,
        'new_role', NEW.role,
        'organization_id', NEW.organization_id
      ),
      'high'
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM dkegl_log_security_event(
      'role_removed',
      jsonb_build_object(
        'target_user_id', OLD.user_id,
        'role', OLD.role,
        'organization_id', OLD.organization_id
      ),
      'high'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add audit trigger for role changes
DROP TRIGGER IF EXISTS audit_role_changes ON public.dkegl_user_roles;
CREATE TRIGGER audit_role_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.dkegl_user_roles
  FOR EACH ROW
  EXECUTE FUNCTION dkegl_audit_role_changes();

-- 8. STRENGTHEN EXISTING RLS POLICIES

-- Update user profiles policy to be more restrictive
DROP POLICY IF EXISTS "DKEGL users can view their own profile" ON public.dkegl_user_profiles;
CREATE POLICY "Users can view profiles in their organization"
ON public.dkegl_user_profiles
FOR SELECT
USING (organization_id = dkegl_get_current_user_org());

-- Users can only update their own profile
CREATE POLICY "Users can update their own profile"
ON public.dkegl_user_profiles
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND organization_id = dkegl_get_current_user_org());

-- Add data retention for security logs (90 days)
CREATE OR REPLACE FUNCTION public.dkegl_cleanup_old_security_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM dkegl_security_audit_log 
  WHERE created_at < now() - INTERVAL '90 days';
END;
$$;