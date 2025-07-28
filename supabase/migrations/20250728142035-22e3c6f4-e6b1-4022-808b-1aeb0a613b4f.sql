-- Step 1: Fix Schema Alignment - Add missing columns to dkpkl_raw_rows to match expected staging_records structure
ALTER TABLE dkpkl_raw_rows 
ADD COLUMN IF NOT EXISTS posted_to_erp BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS posted_by UUID REFERENCES auth.users(id);

-- Step 2: Create proper dashboard metrics function
CREATE OR REPLACE FUNCTION dkpkl_get_dashboard_metrics(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_batches INTEGER := 0;
  completed_batches INTEGER := 0;
  total_records INTEGER := 0;
  posted_records INTEGER := 0;
  recent_activity JSONB;
BEGIN
  -- Get batch metrics
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_batches, completed_batches
  FROM dkpkl_import_batches 
  WHERE organization_id = _org_id;

  -- Get record metrics
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE posted_to_erp = true)
  INTO total_records, posted_records
  FROM dkpkl_raw_rows 
  WHERE organization_id = _org_id;

  -- Get recent activity (last 10 batches)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'file_name', file_name,
      'import_type', import_type,
      'record_count', record_count,
      'status', status,
      'created_at', created_at,
      'completed_at', completed_at
    ) ORDER BY created_at DESC
  )
  INTO recent_activity
  FROM dkpkl_import_batches 
  WHERE organization_id = _org_id
  ORDER BY created_at DESC
  LIMIT 10;

  RETURN jsonb_build_object(
    'total_batches', total_batches,
    'completed_batches', completed_batches,
    'completion_rate', CASE WHEN total_batches > 0 THEN (completed_batches::DECIMAL / total_batches * 100) ELSE 0 END,
    'total_records', total_records,
    'posted_records', posted_records,
    'posting_rate', CASE WHEN total_records > 0 THEN (posted_records::DECIMAL / total_records * 100) ELSE 0 END,
    'recent_activity', COALESCE(recent_activity, '[]'::jsonb)
  );
END;
$$;

-- Step 3: Create ERP posting functions
CREATE OR REPLACE FUNCTION dkpkl_post_sales_to_grn(_batch_id uuid, _org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  posted_count INTEGER := 0;
  error_count INTEGER := 0;
  results JSONB;
BEGIN
  -- Post sales records to GRN log
  WITH posted_sales AS (
    INSERT INTO dkegl_grn_log (
      organization_id,
      grn_number,
      date,
      item_code,
      qty_received,
      uom,
      unit_rate,
      total_amount,
      supplier_name,
      invoice_number,
      invoice_date,
      quality_status,
      created_by
    )
    SELECT 
      _org_id,
      'TALLY-' || raw_data->>'voucher_number',
      (raw_data->>'date')::DATE,
      raw_data->>'item_name',
      (raw_data->>'quantity')::NUMERIC,
      COALESCE(raw_data->>'uom', 'PCS'),
      (raw_data->>'rate')::NUMERIC,
      (raw_data->>'amount')::NUMERIC,
      raw_data->>'party_name',
      raw_data->>'voucher_number',
      (raw_data->>'date')::DATE,
      'pending'::dkegl_quality_status,
      auth.uid()
    FROM dkpkl_raw_rows
    WHERE batch_id = _batch_id 
      AND organization_id = _org_id
      AND posted_to_erp = false
      AND validation_status = 'valid'
    RETURNING 1
  )
  SELECT COUNT(*) INTO posted_count FROM posted_sales;

  -- Mark records as posted
  UPDATE dkpkl_raw_rows 
  SET 
    posted_to_erp = true,
    posted_at = now(),
    posted_by = auth.uid()
  WHERE batch_id = _batch_id 
    AND organization_id = _org_id
    AND posted_to_erp = false
    AND validation_status = 'valid';

  -- Update batch status
  UPDATE dkpkl_import_batches
  SET 
    status = 'posted',
    completed_at = now()
  WHERE id = _batch_id AND organization_id = _org_id;

  RETURN jsonb_build_object(
    'success', true,
    'posted_count', posted_count,
    'error_count', error_count,
    'message', 'Successfully posted ' || posted_count || ' records to GRN log'
  );
END;
$$;

CREATE OR REPLACE FUNCTION dkpkl_post_purchase_to_issue(_batch_id uuid, _org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  posted_count INTEGER := 0;
  error_count INTEGER := 0;
  results JSONB;
BEGIN
  -- Post purchase records to issue log
  WITH posted_purchases AS (
    INSERT INTO dkegl_issue_log (
      organization_id,
      date,
      item_code,
      qty_issued,
      purpose,
      issued_to,
      uom,
      created_by
    )
    SELECT 
      _org_id,
      (raw_data->>'date')::DATE,
      raw_data->>'item_name',
      (raw_data->>'quantity')::NUMERIC,
      'Tally Import - ' || raw_data->>'voucher_type',
      raw_data->>'party_name',
      COALESCE(raw_data->>'uom', 'PCS'),
      auth.uid()
    FROM dkpkl_raw_rows
    WHERE batch_id = _batch_id 
      AND organization_id = _org_id
      AND posted_to_erp = false
      AND validation_status = 'valid'
    RETURNING 1
  )
  SELECT COUNT(*) INTO posted_count FROM posted_purchases;

  -- Mark records as posted
  UPDATE dkpkl_raw_rows 
  SET 
    posted_to_erp = true,
    posted_at = now(),
    posted_by = auth.uid()
  WHERE batch_id = _batch_id 
    AND organization_id = _org_id
    AND posted_to_erp = false
    AND validation_status = 'valid';

  -- Update batch status
  UPDATE dkpkl_import_batches
  SET 
    status = 'posted',
    completed_at = now()
  WHERE id = _batch_id AND organization_id = _org_id;

  RETURN jsonb_build_object(
    'success', true,
    'posted_count', posted_count,
    'error_count', error_count,
    'message', 'Successfully posted ' || posted_count || ' records to issue log'
  );
END;
$$;