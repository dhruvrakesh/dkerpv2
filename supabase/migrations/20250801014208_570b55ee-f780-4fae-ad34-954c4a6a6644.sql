-- Fix the emergency cleanup function parameter type and execute consolidation
CREATE OR REPLACE FUNCTION dkegl_run_emergency_cleanup(_org_code TEXT DEFAULT 'DKEGL')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org_id UUID;
  result JSONB;
BEGIN
  -- Get organization ID
  SELECT id INTO org_id FROM dkegl_organizations WHERE code = _org_code;
  
  IF org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Run consolidation
  SELECT dkegl_consolidate_stock_locations(org_id) INTO result;
  
  RETURN result;
END;
$$;

-- Execute consolidation for DKEGL organization (now with proper string parameter)
SELECT dkegl_run_emergency_cleanup('DKEGL') as consolidation_result;