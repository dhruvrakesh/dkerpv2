-- Create automated daily stock reconciliation job
CREATE OR REPLACE FUNCTION dkegl_schedule_daily_reconciliation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- This function will be called by a scheduled job to maintain data consistency
  -- For now, we'll create the framework and it can be triggered manually or via cron
  
  -- Log the reconciliation start
  INSERT INTO dkegl_audit_log (
    organization_id,
    table_name,
    action,
    metadata
  ) VALUES (
    dkegl_get_current_user_org(),
    'dkegl_stock',
    'DAILY_RECONCILIATION_START',
    jsonb_build_object(
      'scheduled_at', now(),
      'type', 'automated_daily_reconciliation'
    )
  );
  
  -- Call the reconciliation function for all organizations
  -- In a multi-org environment, this would loop through organizations
  PERFORM dkegl_reconcile_stock_data(dkegl_get_current_user_org());
  
  -- Log completion
  INSERT INTO dkegl_audit_log (
    organization_id,
    table_name,
    action,
    metadata
  ) VALUES (
    dkegl_get_current_user_org(),
    'dkegl_stock',
    'DAILY_RECONCILIATION_COMPLETE',
    jsonb_build_object(
      'completed_at', now(),
      'type', 'automated_daily_reconciliation'
    )
  );
END;
$$;

-- Create a function to get comprehensive stock metrics with validation
CREATE OR REPLACE FUNCTION dkegl_get_stock_health_metrics(_org_id uuid)
RETURNS TABLE(
  total_items bigint,
  items_with_opening_stock bigint,
  items_with_transactions bigint,
  items_with_variances bigint,
  total_variance_value numeric,
  data_quality_score numeric,
  last_reconciliation_date timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_items,
    COUNT(*) FILTER (WHERE opening_qty > 0) as items_with_opening_stock,
    COUNT(*) FILTER (WHERE last_transaction_date IS NOT NULL) as items_with_transactions,
    COUNT(*) FILTER (WHERE ABS(variance_qty) > 0.01) as items_with_variances,
    COALESCE(SUM(ABS(variance_qty) * unit_cost), 0) as total_variance_value,
    CASE 
      WHEN COUNT(*) = 0 THEN 0
      ELSE (
        COUNT(*) FILTER (WHERE opening_qty >= 0 AND current_qty >= 0 AND ABS(variance_qty) <= 0.01)::numeric 
        / COUNT(*)::numeric * 100
      )
    END as data_quality_score,
    (
      SELECT MAX(created_at) 
      FROM dkegl_audit_log 
      WHERE organization_id = _org_id 
        AND action = 'STOCK_RECONCILIATION_COMPLETE'
    ) as last_reconciliation_date
  FROM (
    SELECT 
      s.item_code,
      s.opening_qty,
      s.current_qty,
      s.unit_cost,
      s.last_transaction_date,
      -- Calculate variance: current - (opening + grn - issues)
      s.current_qty - (
        s.opening_qty + 
        COALESCE(g.total_grn_qty, 0) - 
        COALESCE(i.total_issued_qty, 0)
      ) as variance_qty
    FROM (
      SELECT 
        item_code,
        SUM(opening_qty) as opening_qty,
        SUM(current_qty) as current_qty,
        AVG(unit_cost) as unit_cost,
        MAX(last_transaction_date) as last_transaction_date
      FROM dkegl_stock 
      WHERE organization_id = _org_id
      GROUP BY item_code
    ) s
    LEFT JOIN (
      SELECT 
        item_code,
        SUM(qty_received) as total_grn_qty
      FROM dkegl_grn_log 
      WHERE organization_id = _org_id
      GROUP BY item_code
    ) g ON s.item_code = g.item_code
    LEFT JOIN (
      SELECT 
        item_code,
        SUM(qty_issued) as total_issued_qty
      FROM dkegl_issue_log 
      WHERE organization_id = _org_id
      GROUP BY item_code
    ) i ON s.item_code = i.item_code
  ) stock_analysis;
END;
$$;