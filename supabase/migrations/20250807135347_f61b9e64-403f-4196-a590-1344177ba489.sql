-- Fix GRN audit function to use user_id instead of changed_by
CREATE OR REPLACE FUNCTION public.dkegl_audit_grn_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log GRN changes with correct field names (user_id not changed_by)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO dkegl_grn_audit_log (
      organization_id,
      grn_id,
      action,
      new_values,
      user_id
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      'CREATE',
      to_jsonb(NEW),
      auth.uid()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO dkegl_grn_audit_log (
      organization_id,
      grn_id,
      action,
      old_values,
      new_values,
      user_id
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid()
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO dkegl_grn_audit_log (
      organization_id,
      grn_id,
      action,
      old_values,
      user_id
    ) VALUES (
      OLD.organization_id,
      OLD.id,
      'DELETE',
      to_jsonb(OLD),
      auth.uid()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;