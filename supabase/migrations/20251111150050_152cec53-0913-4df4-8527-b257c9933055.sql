-- ============================================================================
-- PHASE 1: SECURITY HARDENING MIGRATION
-- Fix all SECURITY DEFINER functions and add search_path protection
-- ============================================================================

-- Drop and recreate all SECURITY DEFINER functions with proper security
-- Each function will:
-- 1. Remove SECURITY DEFINER (use SECURITY INVOKER by default)
-- 2. Add SET search_path = public, pg_temp
-- 3. Maintain all existing functionality

-- ============================================================================
-- CONSUMPTION ANALYSIS FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dkegl_analyze_consumption_patterns(
  _org_id uuid, 
  _item_code text DEFAULT NULL::text
)
RETURNS TABLE(
  item_code text, 
  item_name text, 
  avg_monthly_consumption numeric, 
  consumption_trend text, 
  seasonality_factor numeric, 
  recommended_reorder_level numeric, 
  recommended_reorder_quantity numeric, 
  next_reorder_date date
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  WITH monthly_consumption AS (
    SELECT 
      i.item_code,
      im.item_name,
      DATE_TRUNC('month', i.date) as month,
      SUM(i.qty_issued) as monthly_qty
    FROM dkegl_issue_log i
    LEFT JOIN dkegl_item_master im ON i.organization_id = im.organization_id AND i.item_code = im.item_code
    WHERE i.organization_id = _org_id
      AND (_item_code IS NULL OR i.item_code = _item_code)
      AND i.date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY i.item_code, im.item_name, DATE_TRUNC('month', i.date)
  ),
  consumption_stats AS (
    SELECT 
      mc.item_code,
      mc.item_name,
      AVG(mc.monthly_qty) as avg_monthly,
      STDDEV(mc.monthly_qty) as stddev_monthly,
      COUNT(*) as months_data,
      CASE 
        WHEN AVG(CASE WHEN mc.month >= CURRENT_DATE - INTERVAL '3 months' THEN mc.monthly_qty END) >
             AVG(CASE WHEN mc.month < CURRENT_DATE - INTERVAL '3 months' 
                           AND mc.month >= CURRENT_DATE - INTERVAL '6 months' 
                      THEN mc.monthly_qty END) * 1.1 
        THEN 'Increasing'
        WHEN AVG(CASE WHEN mc.month >= CURRENT_DATE - INTERVAL '3 months' THEN mc.monthly_qty END) <
             AVG(CASE WHEN mc.month < CURRENT_DATE - INTERVAL '3 months' 
                           AND mc.month >= CURRENT_DATE - INTERVAL '6 months' 
                      THEN mc.monthly_qty END) * 0.9
        THEN 'Decreasing'
        ELSE 'Stable'
      END as trend
    FROM monthly_consumption mc
    GROUP BY mc.item_code, mc.item_name
  )
  SELECT 
    cs.item_code,
    cs.item_name,
    COALESCE(cs.avg_monthly, 0) as avg_monthly_consumption,
    cs.trend as consumption_trend,
    CASE WHEN cs.stddev_monthly > 0 AND cs.avg_monthly > 0
         THEN cs.stddev_monthly / cs.avg_monthly 
         ELSE 0 END as seasonality_factor,
    COALESCE(cs.avg_monthly, 0) * 1.5 as recommended_reorder_level,
    COALESCE(cs.avg_monthly, 0) * 2 as recommended_reorder_quantity,
    CURRENT_DATE + INTERVAL '30 days' as next_reorder_date
  FROM consumption_stats cs
  WHERE cs.avg_monthly > 0
  ORDER BY cs.avg_monthly DESC;
END;
$function$;

-- ============================================================================
-- AUDIT TRIGGERS (Keep SECURITY DEFINER but add search_path)
-- These need SECURITY DEFINER to insert into audit tables
-- ============================================================================
CREATE OR REPLACE FUNCTION public.dkegl_audit_grn_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO dkegl_grn_audit_log (
      organization_id, grn_id, action, new_values, user_id
    ) VALUES (
      NEW.organization_id, NEW.id, 'CREATE', to_jsonb(NEW), auth.uid()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO dkegl_grn_audit_log (
      organization_id, grn_id, action, old_values, new_values, user_id
    ) VALUES (
      NEW.organization_id, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid()
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO dkegl_grn_audit_log (
      organization_id, grn_id, action, old_values, user_id
    ) VALUES (
      OLD.organization_id, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid()
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.dkegl_audit_issue_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO dkegl_issue_audit_log (
      organization_id, issue_id, action, new_values, user_id
    ) VALUES (
      NEW.organization_id, NEW.id, 'CREATE', to_jsonb(NEW), auth.uid()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO dkegl_issue_audit_log (
      organization_id, issue_id, action, old_values, new_values, user_id
    ) VALUES (
      NEW.organization_id, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid()
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO dkegl_issue_audit_log (
      organization_id, issue_id, action, old_values, user_id
    ) VALUES (
      OLD.organization_id, OLD.id, 'DELETE', to_jsonb(OLD), auth.uid()
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ============================================================================
-- GRANT NECESSARY PERMISSIONS
-- Since we removed SECURITY DEFINER, ensure users can access these functions
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.dkegl_analyze_consumption_patterns(uuid, text) TO authenticated;

-- Document security changes
COMMENT ON FUNCTION public.dkegl_analyze_consumption_patterns IS 
'Analyzes consumption patterns with SECURITY INVOKER - uses caller permissions with safe search_path';

COMMENT ON FUNCTION public.dkegl_audit_grn_log IS 
'GRN audit trigger with SECURITY DEFINER for audit write access - protected with search_path';

COMMENT ON FUNCTION public.dkegl_audit_issue_log IS 
'Issue audit trigger with SECURITY DEFINER for audit write access - protected with search_path';