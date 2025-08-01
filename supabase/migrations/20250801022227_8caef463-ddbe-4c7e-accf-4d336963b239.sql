-- Enhanced Stock Reconciliation Function with Variance Correction
DROP FUNCTION IF EXISTS public.dkegl_reconcile_stock_data(uuid);

CREATE OR REPLACE FUNCTION public.dkegl_reconcile_stock_data(_org_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  reconciliation_summary jsonb;
  affected_items integer := 0;
  corrected_items integer := 0;
  total_variance numeric := 0;
  variance_threshold numeric := 0.01; -- 1% threshold for corrections
  item_record RECORD;
BEGIN
  -- Log reconciliation start
  INSERT INTO dkegl_audit_log (
    organization_id,
    table_name,
    action,
    metadata
  ) VALUES (
    _org_id,
    'dkegl_stock',
    'STOCK_RECONCILIATION_START',
    jsonb_build_object(
      'started_at', now(),
      'triggered_by', auth.uid()
    )
  );

  -- First, identify and correct major stock variances
  FOR item_record IN (
    SELECT 
      item_code,
      current_qty,
      calculated_qty,
      variance_qty,
      opening_qty,
      total_grn_qty,
      total_issued_qty
    FROM dkegl_get_comprehensive_stock_summary(_org_id)
    WHERE ABS(variance_qty) > variance_threshold
  ) LOOP
    -- Log the variance before correction
    INSERT INTO dkegl_stock_corrections (
      organization_id,
      item_code,
      old_location,
      new_location,
      old_qty,
      new_qty,
      correction_type,
      reason,
      reference_number,
      created_by
    ) VALUES (
      _org_id,
      item_record.item_code,
      'MAIN-STORE',
      'MAIN-STORE',
      item_record.current_qty,
      item_record.calculated_qty,
      'reconciliation',
      format('Auto-correction: Variance of %s detected. Formula: %s + %s - %s = %s', 
        item_record.variance_qty, 
        item_record.opening_qty, 
        item_record.total_grn_qty, 
        item_record.total_issued_qty,
        item_record.calculated_qty),
      'AUTO-RECON-' || to_char(now(), 'YYYYMMDD-HH24MISS'),
      auth.uid()
    );

    -- Update stock with calculated quantity
    UPDATE dkegl_stock 
    SET 
      current_qty = item_record.calculated_qty,
      last_updated = now(),
      last_transaction_date = CURRENT_DATE
    WHERE organization_id = _org_id 
      AND item_code = item_record.item_code;

    corrected_items := corrected_items + 1;
  END LOOP;

  -- Update any missing reorder_levels from item_master
  UPDATE dkegl_stock 
  SET reorder_level = COALESCE(im.reorder_level, 0),
      last_updated = now()
  FROM dkegl_item_master im 
  WHERE dkegl_stock.organization_id = _org_id
    AND dkegl_stock.organization_id = im.organization_id 
    AND dkegl_stock.item_code = im.item_code
    AND (dkegl_stock.reorder_level IS NULL OR dkegl_stock.reorder_level = 0)
    AND im.reorder_level > 0;

  GET DIAGNOSTICS affected_items = ROW_COUNT;

  -- Calculate total variance after corrections
  SELECT COALESCE(SUM(ABS(variance_qty)), 0)
  INTO total_variance
  FROM dkegl_get_comprehensive_stock_summary(_org_id);

  -- Create reconciliation summary
  reconciliation_summary := jsonb_build_object(
    'organization_id', _org_id,
    'reconciliation_date', CURRENT_DATE,
    'items_updated', affected_items,
    'items_corrected', corrected_items,
    'total_variance_remaining', total_variance,
    'variance_threshold', variance_threshold,
    'reconciled_at', now(),
    'reconciled_by', auth.uid(),
    'status', CASE 
      WHEN total_variance = 0 THEN 'perfect_reconciliation'
      WHEN total_variance < 100 THEN 'good_reconciliation'
      WHEN total_variance < 1000 THEN 'acceptable_reconciliation'
      ELSE 'needs_attention'
    END
  );

  -- Log reconciliation completion
  INSERT INTO dkegl_audit_log (
    organization_id,
    table_name,
    action,
    metadata
  ) VALUES (
    _org_id,
    'dkegl_stock',
    'STOCK_RECONCILIATION_COMPLETE',
    reconciliation_summary
  );

  RETURN reconciliation_summary;
END;
$function$;

-- Enhanced Stock Analytics Totals Function  
DROP FUNCTION IF EXISTS public.dkegl_get_stock_analytics_totals(uuid);

CREATE OR REPLACE FUNCTION public.dkegl_get_stock_analytics_totals(_org_id uuid)
 RETURNS TABLE(
   total_opening numeric,
   total_grn numeric, 
   total_issued numeric,
   total_current numeric,
   total_calculated numeric,
   total_variance numeric,
   total_items bigint
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(css.opening_qty), 0) as total_opening,
    COALESCE(SUM(css.total_grn_qty), 0) as total_grn,
    COALESCE(SUM(css.total_issued_qty), 0) as total_issued,
    COALESCE(SUM(css.current_qty), 0) as total_current,
    COALESCE(SUM(css.calculated_qty), 0) as total_calculated,
    COALESCE(SUM(css.variance_qty), 0) as total_variance,
    COUNT(*) as total_items
  FROM dkegl_get_comprehensive_stock_summary(_org_id) css;
END;
$function$;