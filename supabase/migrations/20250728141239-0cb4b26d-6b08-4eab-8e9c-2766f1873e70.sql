-- Create ERP Integration Functions for DKPKL Tally Import

-- Function to process Excel batch data
CREATE OR REPLACE FUNCTION dkpkl_process_excel_batch(
  _batch_id UUID,
  _import_type TEXT,
  _excel_data TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _org_id UUID;
  _data_array JSONB;
  _row_data JSONB;
  _row_count INTEGER := 0;
  _valid_count INTEGER := 0;
  _invalid_count INTEGER := 0;
  _warning_count INTEGER := 0;
  _i INTEGER;
BEGIN
  -- Get organization ID from batch
  SELECT organization_id INTO _org_id 
  FROM dkpkl_import_batches 
  WHERE id = _batch_id;
  
  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'Batch not found or invalid organization';
  END IF;
  
  -- Parse Excel data
  _data_array := _excel_data::JSONB;
  _row_count := JSONB_ARRAY_LENGTH(_data_array);
  
  -- Process each row
  FOR _i IN 0.._row_count-1 LOOP
    _row_data := _data_array->_i;
    
    -- Insert staging record
    INSERT INTO dkpkl_staging_records (
      batch_id,
      row_number,
      raw_data,
      validation_status
    ) VALUES (
      _batch_id,
      _i + 1,
      _row_data,
      'valid'
    );
    
    _valid_count := _valid_count + 1;
  END LOOP;
  
  -- Update batch with processing results
  UPDATE dkpkl_import_batches 
  SET 
    status = 'processed',
    total_rows = _row_count,
    processed_rows = _valid_count,
    error_rows = _invalid_count,
    warning_rows = _warning_count,
    updated_at = NOW()
  WHERE id = _batch_id;
  
  RETURN JSONB_BUILD_OBJECT(
    'success', true,
    'total_rows', _row_count,
    'valid_rows', _valid_count,
    'invalid_rows', _invalid_count,
    'warnings_count', _warning_count
  );
END;
$$;

-- Function to post SALES data to GRN log
CREATE OR REPLACE FUNCTION dkpkl_post_sales_to_grn(
  _batch_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _org_id UUID;
  _staging_record RECORD;
  _grn_id UUID;
  _posted_count INTEGER := 0;
  _failed_count INTEGER := 0;
  _error_message TEXT;
BEGIN
  -- Get organization from batch
  SELECT organization_id INTO _org_id
  FROM dkpkl_import_batches 
  WHERE id = _batch_id;
  
  -- Process each staging record
  FOR _staging_record IN 
    SELECT * FROM dkpkl_staging_records 
    WHERE batch_id = _batch_id 
    AND validation_status = 'valid'
    AND posted_to_erp = FALSE
  LOOP
    BEGIN
      -- Extract data from raw_data JSONB
      INSERT INTO dkegl_grn_log (
        organization_id,
        grn_number,
        date,
        item_code,
        qty_received,
        uom,
        supplier_name,
        total_amount,
        created_by
      ) VALUES (
        _org_id,
        COALESCE(_staging_record.raw_data->>'Voucher No', 'GRN-' || _staging_record.id),
        COALESCE((_staging_record.raw_data->>'Date')::DATE, CURRENT_DATE),
        COALESCE(_staging_record.raw_data->>'Item Name', 'UNKNOWN'),
        COALESCE((_staging_record.raw_data->>'Quantity')::NUMERIC, 1),
        COALESCE(_staging_record.raw_data->>'UOM', 'PCS'),
        COALESCE(_staging_record.raw_data->>'Party Name', 'TALLY_IMPORT'),
        COALESCE((_staging_record.raw_data->>'Amount')::NUMERIC, 0),
        auth.uid()
      ) RETURNING id INTO _grn_id;
      
      -- Log the posting
      INSERT INTO dkpkl_erp_posting_log (
        organization_id,
        batch_id,
        staging_record_id,
        target_table,
        target_record_id,
        posting_type,
        posted_data,
        posting_status,
        posted_by
      ) VALUES (
        _org_id,
        _batch_id,
        _staging_record.id,
        'dkegl_grn_log',
        _grn_id,
        'grn',
        _staging_record.raw_data,
        'success',
        auth.uid()
      );
      
      -- Mark as posted
      UPDATE dkpkl_staging_records 
      SET posted_to_erp = TRUE, erp_reference_id = _grn_id
      WHERE id = _staging_record.id;
      
      _posted_count := _posted_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      _error_message := SQLERRM;
      _failed_count := _failed_count + 1;
      
      -- Log the error
      INSERT INTO dkpkl_erp_posting_log (
        organization_id,
        batch_id,
        staging_record_id,
        target_table,
        posting_type,
        posting_status,
        error_message,
        posted_by
      ) VALUES (
        _org_id,
        _batch_id,
        _staging_record.id,
        'dkegl_grn_log',
        'grn',
        'failed',
        _error_message,
        auth.uid()
      );
    END;
  END LOOP;
  
  RETURN JSONB_BUILD_OBJECT(
    'success', true,
    'posted_count', _posted_count,
    'failed_count', _failed_count
  );
END;
$$;

-- Function to post PURCHASE data to Issue log
CREATE OR REPLACE FUNCTION dkpkl_post_purchase_to_issue(
  _batch_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _org_id UUID;
  _staging_record RECORD;
  _issue_id UUID;
  _posted_count INTEGER := 0;
  _failed_count INTEGER := 0;
  _error_message TEXT;
BEGIN
  -- Get organization from batch
  SELECT organization_id INTO _org_id
  FROM dkpkl_import_batches 
  WHERE id = _batch_id;
  
  -- Process each staging record
  FOR _staging_record IN 
    SELECT * FROM dkpkl_staging_records 
    WHERE batch_id = _batch_id 
    AND validation_status = 'valid'
    AND posted_to_erp = FALSE
  LOOP
    BEGIN
      -- Extract data from raw_data JSONB
      INSERT INTO dkegl_issue_log (
        organization_id,
        date,
        item_code,
        qty_issued,
        uom,
        purpose,
        issued_to,
        created_by
      ) VALUES (
        _org_id,
        COALESCE((_staging_record.raw_data->>'Date')::DATE, CURRENT_DATE),
        COALESCE(_staging_record.raw_data->>'Item Name', 'UNKNOWN'),
        COALESCE((_staging_record.raw_data->>'Quantity')::NUMERIC, 1),
        COALESCE(_staging_record.raw_data->>'UOM', 'PCS'),
        COALESCE(_staging_record.raw_data->>'Purpose', 'Tally Import - Purchase'),
        COALESCE(_staging_record.raw_data->>'Vendor Name', 'TALLY_IMPORT'),
        auth.uid()
      ) RETURNING id INTO _issue_id;
      
      -- Log the posting
      INSERT INTO dkpkl_erp_posting_log (
        organization_id,
        batch_id,
        staging_record_id,
        target_table,
        target_record_id,
        posting_type,
        posted_data,
        posting_status,
        posted_by
      ) VALUES (
        _org_id,
        _batch_id,
        _staging_record.id,
        'dkegl_issue_log',
        _issue_id,
        'issue',
        _staging_record.raw_data,
        'success',
        auth.uid()
      );
      
      -- Mark as posted
      UPDATE dkpkl_staging_records 
      SET posted_to_erp = TRUE, erp_reference_id = _issue_id
      WHERE id = _staging_record.id;
      
      _posted_count := _posted_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      _error_message := SQLERRM;
      _failed_count := _failed_count + 1;
      
      -- Log the error
      INSERT INTO dkpkl_erp_posting_log (
        organization_id,
        batch_id,
        staging_record_id,
        target_table,
        posting_type,
        posting_status,
        error_message,
        posted_by
      ) VALUES (
        _org_id,
        _batch_id,
        _staging_record.id,
        'dkegl_issue_log',
        'issue',
        'failed',
        _error_message,
        auth.uid()
      );
    END;
  END LOOP;
  
  RETURN JSONB_BUILD_OBJECT(
    'success', true,
    'posted_count', _posted_count,
    'failed_count', _failed_count
  );
END;
$$;

-- Function to get Tally dashboard metrics
CREATE OR REPLACE FUNCTION dkpkl_get_dashboard_metrics(
  _org_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _total_batches INTEGER;
  _pending_batches INTEGER;
  _completed_batches INTEGER;
  _failed_batches INTEGER;
  _total_records INTEGER;
  _posted_records INTEGER;
  _error_records INTEGER;
  _recent_activity JSONB;
BEGIN
  -- Get batch statistics
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'failed')
  INTO _total_batches, _pending_batches, _completed_batches, _failed_batches
  FROM dkpkl_import_batches
  WHERE organization_id = _org_id;
  
  -- Get record statistics
  SELECT 
    COALESCE(SUM(b.total_rows), 0),
    COUNT(*) FILTER (WHERE sr.posted_to_erp = TRUE),
    COALESCE(SUM(b.error_rows), 0)
  INTO _total_records, _posted_records, _error_records
  FROM dkpkl_import_batches b
  LEFT JOIN dkpkl_staging_records sr ON b.id = sr.batch_id
  WHERE b.organization_id = _org_id;
  
  -- Get recent activity
  SELECT JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'id', id,
      'import_type', import_type,
      'file_name', file_name,
      'status', status,
      'total_rows', total_rows,
      'created_at', created_at
    ) ORDER BY created_at DESC
  )
  INTO _recent_activity
  FROM (
    SELECT * FROM dkpkl_import_batches 
    WHERE organization_id = _org_id
    ORDER BY created_at DESC 
    LIMIT 10
  ) recent;
  
  RETURN JSONB_BUILD_OBJECT(
    'total_batches', _total_batches,
    'pending_batches', _pending_batches,
    'completed_batches', _completed_batches,
    'failed_batches', _failed_batches,
    'total_records', _total_records,
    'posted_records', _posted_records,
    'error_records', _error_records,
    'recent_activity', COALESCE(_recent_activity, '[]'::JSONB)
  );
END;
$$;