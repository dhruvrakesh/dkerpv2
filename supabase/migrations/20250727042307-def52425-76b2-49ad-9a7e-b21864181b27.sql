-- Fix organization context and add enhanced stock management features

-- First, let's check the current data situation
DO $$
DECLARE
    org_count INTEGER;
    user_count INTEGER;
    profile_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO org_count FROM dkegl_organizations;
    SELECT COUNT(*) INTO user_count FROM auth.users;
    SELECT COUNT(*) INTO profile_count FROM dkegl_user_profiles;
    
    RAISE NOTICE 'Organizations: %, Users: %, Profiles: %', org_count, user_count, profile_count;
END $$;

-- Fix the user organization context function
CREATE OR REPLACE FUNCTION dkegl_get_current_user_org()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT organization_id 
     FROM dkegl_user_profiles 
     WHERE user_id = auth.uid() 
     LIMIT 1),
    (SELECT id 
     FROM dkegl_organizations 
     WHERE code = 'DKEGL' 
     LIMIT 1)
  );
$$;

-- Add enhanced stock summary refresh function with configurable opening date
CREATE OR REPLACE FUNCTION dkegl_refresh_stock_summary(
  _org_id uuid DEFAULT NULL,
  _opening_date date DEFAULT '2025-03-31'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_org_id uuid;
  summary_count INTEGER := 0;
  result_summary jsonb;
BEGIN
  -- Get organization ID
  IF _org_id IS NULL THEN
    target_org_id := dkegl_get_current_user_org();
  ELSE
    target_org_id := _org_id;
  END IF;
  
  IF target_org_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization not found'
    );
  END IF;
  
  -- Delete existing summary for this organization
  DELETE FROM dkegl_stock_summary WHERE organization_id = target_org_id;
  
  -- Generate comprehensive stock summary
  INSERT INTO dkegl_stock_summary (
    organization_id,
    item_code,
    item_name,
    category_name,
    opening_qty,
    total_grn_qty,
    total_issued_qty,
    current_qty,
    calculated_qty,
    variance_qty,
    issue_7d,
    issue_30d,
    issue_90d,
    consumption_rate_7d,
    consumption_rate_30d,
    consumption_rate_90d,
    days_of_cover,
    reorder_level,
    reorder_suggested,
    last_transaction_date
  )
  SELECT 
    target_org_id,
    stock_calc.item_code,
    stock_calc.item_name,
    stock_calc.category_name,
    stock_calc.opening_qty,
    stock_calc.total_grn_qty,
    stock_calc.total_issued_qty,
    stock_calc.current_qty,
    stock_calc.calculated_qty,
    stock_calc.variance_qty,
    stock_calc.issue_7d,
    stock_calc.issue_30d,
    stock_calc.issue_90d,
    stock_calc.consumption_rate_7d,
    stock_calc.consumption_rate_30d,
    stock_calc.consumption_rate_90d,
    stock_calc.days_of_cover,
    stock_calc.reorder_level,
    stock_calc.reorder_suggested,
    stock_calc.last_transaction_date
  FROM (
    WITH all_items AS (
      -- Get all unique item codes from stock, GRN, and issues
      SELECT DISTINCT s.item_code
      FROM dkegl_stock s
      WHERE s.organization_id = target_org_id
      
      UNION
      
      SELECT DISTINCT g.item_code
      FROM dkegl_grn_log g
      WHERE g.organization_id = target_org_id
      
      UNION
      
      SELECT DISTINCT i.item_code
      FROM dkegl_issue_log i
      WHERE i.organization_id = target_org_id
    ),
    stock_data AS (
      SELECT 
        ai.item_code,
        im.item_name,
        cat.category_name,
        -- Opening stock (from user-defined opening date)
        COALESCE(s.opening_qty, 0) as opening_qty,
        -- Current physical stock
        COALESCE(s.current_qty, 0) as current_qty,
        -- Reorder levels
        COALESCE(im.reorder_level, 0) as reorder_level,
        -- Last transaction from any source
        GREATEST(
          COALESCE(s.last_transaction_date, _opening_date),
          COALESCE((SELECT MAX(g.date) FROM dkegl_grn_log g WHERE g.organization_id = target_org_id AND g.item_code = ai.item_code), _opening_date),
          COALESCE((SELECT MAX(i.date) FROM dkegl_issue_log i WHERE i.organization_id = target_org_id AND i.item_code = ai.item_code), _opening_date)
        ) as last_transaction_date
      FROM all_items ai
      LEFT JOIN dkegl_item_master im ON ai.item_code = im.item_code AND im.organization_id = target_org_id
      LEFT JOIN dkegl_categories cat ON im.category_id = cat.id
      LEFT JOIN dkegl_stock s ON ai.item_code = s.item_code AND s.organization_id = target_org_id
    ),
    grn_totals AS (
      SELECT 
        item_code,
        COALESCE(SUM(CASE WHEN date >= _opening_date THEN qty_received ELSE 0 END), 0) as total_grn_qty
      FROM dkegl_grn_log
      WHERE organization_id = target_org_id
      GROUP BY item_code
    ),
    issue_totals AS (
      SELECT 
        item_code,
        COALESCE(SUM(CASE WHEN date >= _opening_date THEN qty_issued ELSE 0 END), 0) as total_issued_qty,
        COALESCE(SUM(CASE WHEN date >= CURRENT_DATE - INTERVAL '7 days' THEN qty_issued ELSE 0 END), 0) as issue_7d,
        COALESCE(SUM(CASE WHEN date >= CURRENT_DATE - INTERVAL '30 days' THEN qty_issued ELSE 0 END), 0) as issue_30d,
        COALESCE(SUM(CASE WHEN date >= CURRENT_DATE - INTERVAL '90 days' THEN qty_issued ELSE 0 END), 0) as issue_90d
      FROM dkegl_issue_log
      WHERE organization_id = target_org_id
      GROUP BY item_code
    )
    SELECT 
      sd.item_code,
      sd.item_name,
      sd.category_name,
      sd.opening_qty,
      COALESCE(gt.total_grn_qty, 0) as total_grn_qty,
      COALESCE(it.total_issued_qty, 0) as total_issued_qty,
      sd.current_qty,
      -- Calculated stock = Opening + GRNs - Issues
      (sd.opening_qty + COALESCE(gt.total_grn_qty, 0) - COALESCE(it.total_issued_qty, 0)) as calculated_qty,
      -- Variance = Current - Calculated
      (sd.current_qty - (sd.opening_qty + COALESCE(gt.total_grn_qty, 0) - COALESCE(it.total_issued_qty, 0))) as variance_qty,
      COALESCE(it.issue_7d, 0) as issue_7d,
      COALESCE(it.issue_30d, 0) as issue_30d,
      COALESCE(it.issue_90d, 0) as issue_90d,
      -- Consumption rates (daily)
      CASE WHEN it.issue_7d > 0 THEN it.issue_7d / 7.0 ELSE 0 END as consumption_rate_7d,
      CASE WHEN it.issue_30d > 0 THEN it.issue_30d / 30.0 ELSE 0 END as consumption_rate_30d,
      CASE WHEN it.issue_90d > 0 THEN it.issue_90d / 90.0 ELSE 0 END as consumption_rate_90d,
      -- Days of cover (current stock / daily consumption)
      CASE 
        WHEN it.issue_30d > 0 THEN sd.current_qty / (it.issue_30d / 30.0)
        ELSE 999 
      END as days_of_cover,
      sd.reorder_level,
      (sd.current_qty <= sd.reorder_level) as reorder_suggested,
      sd.last_transaction_date
    FROM stock_data sd
    LEFT JOIN grn_totals gt ON sd.item_code = gt.item_code
    LEFT JOIN issue_totals it ON sd.item_code = it.item_code
  ) stock_calc;
  
  GET DIAGNOSTICS summary_count = ROW_COUNT;
  
  -- Build result summary
  SELECT jsonb_build_object(
    'success', true,
    'organization_id', target_org_id,
    'opening_date', _opening_date,
    'records_processed', summary_count,
    'timestamp', now(),
    'summary', (
      SELECT jsonb_build_object(
        'total_items', COUNT(*),
        'total_opening_qty', COALESCE(SUM(opening_qty), 0),
        'total_grn_qty', COALESCE(SUM(total_grn_qty), 0),
        'total_issued_qty', COALESCE(SUM(total_issued_qty), 0),
        'total_current_qty', COALESCE(SUM(current_qty), 0),
        'total_calculated_qty', COALESCE(SUM(calculated_qty), 0),
        'total_variance_qty', COALESCE(SUM(ABS(variance_qty)), 0),
        'reorder_items', COUNT(*) FILTER (WHERE reorder_suggested = true)
      )
      FROM dkegl_stock_summary 
      WHERE organization_id = target_org_id
    )
  ) INTO result_summary;
  
  RETURN result_summary;
END;
$$;

-- Create function to configure opening stock date
CREATE OR REPLACE FUNCTION dkegl_set_opening_stock_date(
  _org_id uuid,
  _opening_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Update or insert organization setting
  INSERT INTO dkegl_organization_settings (
    organization_id,
    setting_key,
    setting_value,
    description
  ) VALUES (
    _org_id,
    'opening_stock_date',
    to_jsonb(_opening_date),
    'Financial year opening stock date for stock calculations'
  )
  ON CONFLICT (organization_id, setting_key)
  DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = now();
  
  -- Refresh stock summary with new opening date
  SELECT dkegl_refresh_stock_summary(_org_id, _opening_date) INTO result;
  
  RETURN jsonb_build_object(
    'success', true,
    'opening_date_set', _opening_date,
    'refresh_result', result
  );
END;
$$;

-- Create table for organization settings if not exists
CREATE TABLE IF NOT EXISTS dkegl_organization_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  setting_key text NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, setting_key)
);

-- Add RLS for organization settings
ALTER TABLE dkegl_organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DKEGL organization members can access settings"
  ON dkegl_organization_settings
  FOR ALL
  USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Create function to get opening stock date
CREATE OR REPLACE FUNCTION dkegl_get_opening_stock_date(_org_id uuid DEFAULT NULL)
RETURNS date
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT (setting_value->>'opening_stock_date')::date 
     FROM dkegl_organization_settings 
     WHERE organization_id = COALESCE(_org_id, dkegl_get_current_user_org()) 
       AND setting_key = 'opening_stock_date'),
    '2025-03-31'::date
  );
$$;

-- Create daily stock snapshot function for automation
CREATE OR REPLACE FUNCTION dkegl_capture_daily_stock_snapshot(_org_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_org_id uuid;
  snapshot_data jsonb;
  record_count integer;
  opening_date date;
BEGIN
  -- Get organization ID
  IF _org_id IS NULL THEN
    target_org_id := dkegl_get_current_user_org();
  ELSE
    target_org_id := _org_id;
  END IF;
  
  IF target_org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Get opening stock date
  opening_date := dkegl_get_opening_stock_date(target_org_id);
  
  -- Get current stock summary data
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'item_code', item_code,
        'item_name', item_name,
        'category_name', category_name,
        'opening_qty', opening_qty,
        'total_grn_qty', total_grn_qty,
        'total_issued_qty', total_issued_qty,
        'current_qty', current_qty,
        'calculated_qty', calculated_qty,
        'variance_qty', variance_qty,
        'days_of_cover', days_of_cover,
        'reorder_suggested', reorder_suggested
      )
    ),
    COUNT(*)
  INTO snapshot_data, record_count
  FROM dkegl_stock_summary
  WHERE organization_id = target_org_id;

  -- Insert or update today's snapshot
  INSERT INTO dkegl_daily_stock_snapshots (
    organization_id,
    snapshot_date,
    snapshot_data,
    record_count,
    metadata
  ) VALUES (
    target_org_id,
    CURRENT_DATE,
    snapshot_data,
    record_count,
    jsonb_build_object(
      'captured_at', now(),
      'opening_date', opening_date,
      'source', 'automated_capture',
      'version', '2.0'
    )
  )
  ON CONFLICT (organization_id, snapshot_date)
  DO UPDATE SET
    snapshot_data = EXCLUDED.snapshot_data,
    record_count = EXCLUDED.record_count,
    updated_at = now(),
    metadata = EXCLUDED.metadata;

  RETURN jsonb_build_object(
    'success', true,
    'organization_id', target_org_id,
    'date', CURRENT_DATE,
    'record_count', record_count,
    'opening_date', opening_date,
    'message', 'Daily stock snapshot captured successfully'
  );
END;
$$;

-- Add organization_id to daily snapshots table
ALTER TABLE dkegl_daily_stock_snapshots 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Add unique constraint for org + date
DROP INDEX IF EXISTS unique_org_snapshot_date;
CREATE UNIQUE INDEX unique_org_snapshot_date 
ON dkegl_daily_stock_snapshots (organization_id, snapshot_date);

-- Update RLS for daily snapshots
DROP POLICY IF EXISTS "DKEGL organization members can access snapshots" ON dkegl_daily_stock_snapshots;
CREATE POLICY "DKEGL organization members can access snapshots"
  ON dkegl_daily_stock_snapshots
  FOR ALL
  USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Populate current organization with stock summary
DO $$
DECLARE
    target_org_id uuid;
    refresh_result jsonb;
BEGIN
    -- Get the DKEGL organization
    SELECT id INTO target_org_id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1;
    
    IF target_org_id IS NOT NULL THEN
        -- Refresh stock summary for this organization
        SELECT dkegl_refresh_stock_summary(target_org_id) INTO refresh_result;
        
        RAISE NOTICE 'Stock summary refresh result: %', refresh_result;
        
        -- Also capture today's snapshot
        SELECT dkegl_capture_daily_stock_snapshot(target_org_id) INTO refresh_result;
        
        RAISE NOTICE 'Daily snapshot result: %', refresh_result;
    ELSE
        RAISE NOTICE 'DKEGL organization not found';
    END IF;
END $$;