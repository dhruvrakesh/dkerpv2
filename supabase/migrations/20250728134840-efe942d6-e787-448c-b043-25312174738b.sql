-- Phase 2: DKPKL Parser Engine Integration Functions

-- Function to parse sales voucher data from staging
CREATE OR REPLACE FUNCTION public.dkpkl_parse_sales_voucher(_staging_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  staging_record RECORD;
  validation_result JSONB := '{"valid": true, "errors": [], "warnings": []}';
  errors TEXT[] := '{}';
  warnings TEXT[] := '{}';
  party_exists BOOLEAN := false;
BEGIN
  -- Get staging record
  SELECT * INTO staging_record 
  FROM dkpkl_sales_staging 
  WHERE id = _staging_id;
  
  IF NOT FOUND THEN
    RETURN '{"valid": false, "errors": ["Staging record not found"]}';
  END IF;
  
  -- Validate required fields
  IF staging_record.voucher_number IS NULL OR staging_record.voucher_number = '' THEN
    errors := array_append(errors, 'Voucher number is required');
  END IF;
  
  IF staging_record.party_name IS NULL OR staging_record.party_name = '' THEN
    errors := array_append(errors, 'Party name is required');
  END IF;
  
  IF staging_record.voucher_date IS NULL THEN
    errors := array_append(errors, 'Voucher date is required');
  END IF;
  
  IF staging_record.amount IS NULL OR staging_record.amount <= 0 THEN
    errors := array_append(errors, 'Valid amount is required');
  END IF;
  
  -- Validate GST details if present
  IF staging_record.gst_rate IS NOT NULL AND (staging_record.gst_rate < 0 OR staging_record.gst_rate > 28) THEN
    warnings := array_append(warnings, 'GST rate seems unusual (should be 0-28%)');
  END IF;
  
  -- Check if party exists in vendors
  SELECT EXISTS (
    SELECT 1 FROM dkegl_vendors 
    WHERE organization_id = staging_record.organization_id 
    AND vendor_name ILIKE '%' || staging_record.party_name || '%'
  ) INTO party_exists;
  
  IF NOT party_exists THEN
    warnings := array_append(warnings, 'Party not found in vendor master - will need mapping');
  END IF;
  
  -- Update validation result
  validation_result := jsonb_set(validation_result, '{valid}', to_jsonb(array_length(errors, 1) IS NULL));
  validation_result := jsonb_set(validation_result, '{errors}', to_jsonb(errors));
  validation_result := jsonb_set(validation_result, '{warnings}', to_jsonb(warnings));
  
  -- Update staging record with validation
  UPDATE dkpkl_sales_staging 
  SET 
    validation_status = CASE WHEN array_length(errors, 1) IS NULL THEN 'valid' ELSE 'invalid' END,
    validation_errors = to_jsonb(errors),
    validation_warnings = to_jsonb(warnings),
    updated_at = now()
  WHERE id = _staging_id;
  
  RETURN validation_result;
END;
$function$;

-- Function to parse purchase voucher data from staging
CREATE OR REPLACE FUNCTION public.dkpkl_parse_purchase_voucher(_staging_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  staging_record RECORD;
  validation_result JSONB := '{"valid": true, "errors": [], "warnings": []}';
  errors TEXT[] := '{}';
  warnings TEXT[] := '{}';
  vendor_exists BOOLEAN := false;
BEGIN
  -- Get staging record
  SELECT * INTO staging_record 
  FROM dkpkl_purchase_staging 
  WHERE id = _staging_id;
  
  IF NOT FOUND THEN
    RETURN '{"valid": false, "errors": ["Staging record not found"]}';
  END IF;
  
  -- Validate required fields
  IF staging_record.voucher_number IS NULL OR staging_record.voucher_number = '' THEN
    errors := array_append(errors, 'Voucher number is required');
  END IF;
  
  IF staging_record.vendor_name IS NULL OR staging_record.vendor_name = '' THEN
    errors := array_append(errors, 'Vendor name is required');
  END IF;
  
  IF staging_record.voucher_date IS NULL THEN
    errors := array_append(errors, 'Voucher date is required');
  END IF;
  
  IF staging_record.amount IS NULL OR staging_record.amount <= 0 THEN
    errors := array_append(errors, 'Valid amount is required');
  END IF;
  
  -- Check vendor exists
  SELECT EXISTS (
    SELECT 1 FROM dkegl_vendors 
    WHERE organization_id = staging_record.organization_id 
    AND vendor_name ILIKE '%' || staging_record.vendor_name || '%'
  ) INTO vendor_exists;
  
  IF NOT vendor_exists THEN
    warnings := array_append(warnings, 'Vendor not found in master - will need mapping');
  END IF;
  
  -- Validate invoice details
  IF staging_record.invoice_number IS NOT NULL AND staging_record.invoice_date IS NULL THEN
    warnings := array_append(warnings, 'Invoice number provided but no invoice date');
  END IF;
  
  -- Update validation result
  validation_result := jsonb_set(validation_result, '{valid}', to_jsonb(array_length(errors, 1) IS NULL));
  validation_result := jsonb_set(validation_result, '{errors}', to_jsonb(errors));
  validation_result := jsonb_set(validation_result, '{warnings}', to_jsonb(warnings));
  
  -- Update staging record
  UPDATE dkpkl_purchase_staging 
  SET 
    validation_status = CASE WHEN array_length(errors, 1) IS NULL THEN 'valid' ELSE 'invalid' END,
    validation_errors = to_jsonb(errors),
    validation_warnings = to_jsonb(warnings),
    updated_at = now()
  WHERE id = _staging_id;
  
  RETURN validation_result;
END;
$function$;

-- Function to parse ledger entries from staging
CREATE OR REPLACE FUNCTION public.dkpkl_parse_ledger_entries(_staging_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  staging_record RECORD;
  validation_result JSONB := '{"valid": true, "errors": [], "warnings": []}';
  errors TEXT[] := '{}';
  warnings TEXT[] := '{}';
BEGIN
  -- Get staging record
  SELECT * INTO staging_record 
  FROM dkpkl_voucher_staging 
  WHERE id = _staging_id;
  
  IF NOT FOUND THEN
    RETURN '{"valid": false, "errors": ["Staging record not found"]}';
  END IF;
  
  -- Validate required fields
  IF staging_record.voucher_number IS NULL OR staging_record.voucher_number = '' THEN
    errors := array_append(errors, 'Voucher number is required');
  END IF;
  
  IF staging_record.account_name IS NULL OR staging_record.account_name = '' THEN
    errors := array_append(errors, 'Account name is required');
  END IF;
  
  IF staging_record.voucher_date IS NULL THEN
    errors := array_append(errors, 'Voucher date is required');
  END IF;
  
  -- Validate debit/credit amounts
  IF staging_record.debit_amount IS NULL AND staging_record.credit_amount IS NULL THEN
    errors := array_append(errors, 'Either debit or credit amount is required');
  END IF;
  
  IF staging_record.debit_amount IS NOT NULL AND staging_record.credit_amount IS NOT NULL THEN
    errors := array_append(errors, 'Cannot have both debit and credit amounts in same entry');
  END IF;
  
  -- Validate amount values
  IF staging_record.debit_amount IS NOT NULL AND staging_record.debit_amount <= 0 THEN
    errors := array_append(errors, 'Debit amount must be positive');
  END IF;
  
  IF staging_record.credit_amount IS NOT NULL AND staging_record.credit_amount <= 0 THEN
    errors := array_append(errors, 'Credit amount must be positive');
  END IF;
  
  -- Update validation result
  validation_result := jsonb_set(validation_result, '{valid}', to_jsonb(array_length(errors, 1) IS NULL));
  validation_result := jsonb_set(validation_result, '{errors}', to_jsonb(errors));
  validation_result := jsonb_set(validation_result, '{warnings}', to_jsonb(warnings));
  
  -- Update staging record
  UPDATE dkpkl_voucher_staging 
  SET 
    validation_status = CASE WHEN array_length(errors, 1) IS NULL THEN 'valid' ELSE 'invalid' END,
    validation_errors = to_jsonb(errors),
    validation_warnings = to_jsonb(warnings),
    updated_at = now()
  WHERE id = _staging_id;
  
  RETURN validation_result;
END;
$function$;

-- Function to parse stock journal entries
CREATE OR REPLACE FUNCTION public.dkpkl_parse_stock_journal(_staging_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  staging_record RECORD;
  validation_result JSONB := '{"valid": true, "errors": [], "warnings": []}';
  errors TEXT[] := '{}';
  warnings TEXT[] := '{}';
  item_exists BOOLEAN := false;
BEGIN
  -- Get staging record
  SELECT * INTO staging_record 
  FROM dkpkl_stock_staging 
  WHERE id = _staging_id;
  
  IF NOT FOUND THEN
    RETURN '{"valid": false, "errors": ["Staging record not found"]}';
  END IF;
  
  -- Validate required fields
  IF staging_record.voucher_number IS NULL OR staging_record.voucher_number = '' THEN
    errors := array_append(errors, 'Voucher number is required');
  END IF;
  
  IF staging_record.item_name IS NULL OR staging_record.item_name = '' THEN
    errors := array_append(errors, 'Item name is required');
  END IF;
  
  IF staging_record.voucher_date IS NULL THEN
    errors := array_append(errors, 'Voucher date is required');
  END IF;
  
  -- Validate quantity
  IF staging_record.quantity IS NULL OR staging_record.quantity = 0 THEN
    errors := array_append(errors, 'Valid quantity is required');
  END IF;
  
  -- Check if item exists in master
  SELECT EXISTS (
    SELECT 1 FROM dkegl_item_master 
    WHERE organization_id = staging_record.organization_id 
    AND item_name ILIKE '%' || staging_record.item_name || '%'
  ) INTO item_exists;
  
  IF NOT item_exists THEN
    warnings := array_append(warnings, 'Item not found in master - will need mapping or creation');
  END IF;
  
  -- Validate rate if provided
  IF staging_record.rate IS NOT NULL AND staging_record.rate <= 0 THEN
    warnings := array_append(warnings, 'Rate should be positive');
  END IF;
  
  -- Update validation result
  validation_result := jsonb_set(validation_result, '{valid}', to_jsonb(array_length(errors, 1) IS NULL));
  validation_result := jsonb_set(validation_result, '{errors}', to_jsonb(errors));
  validation_result := jsonb_set(validation_result, '{warnings}', to_jsonb(warnings));
  
  -- Update staging record
  UPDATE dkpkl_stock_staging 
  SET 
    validation_status = CASE WHEN array_length(errors, 1) IS NULL THEN 'valid' ELSE 'invalid' END,
    validation_errors = to_jsonb(errors),
    validation_warnings = to_jsonb(warnings),
    updated_at = now()
  WHERE id = _staging_id;
  
  RETURN validation_result;
END;
$function$;

-- Main validation function that routes to appropriate parser based on import type
CREATE OR REPLACE FUNCTION public.dkpkl_validate_staging_record(_staging_id uuid, _import_type dkpkl_import_type)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  CASE _import_type
    WHEN 'SALES' THEN
      RETURN dkpkl_parse_sales_voucher(_staging_id);
    WHEN 'PURCHASE' THEN
      RETURN dkpkl_parse_purchase_voucher(_staging_id);
    WHEN 'VOUCHER' THEN
      RETURN dkpkl_parse_ledger_entries(_staging_id);
    WHEN 'STOCK' THEN
      RETURN dkpkl_parse_stock_journal(_staging_id);
    WHEN 'PAYROLL' THEN
      -- Placeholder for payroll parsing
      RETURN '{"valid": true, "errors": [], "warnings": ["Payroll parsing not yet implemented"]}';
    ELSE
      RETURN '{"valid": false, "errors": ["Unknown import type"]}';
  END CASE;
END;
$function$;

-- Function to process Tally Excel file and populate staging tables
CREATE OR REPLACE FUNCTION public.dkpkl_process_excel_batch(_batch_id uuid, _import_type dkpkl_import_type, _excel_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  batch_record RECORD;
  row_data JSONB;
  staging_id UUID;
  validation_result JSONB;
  total_rows INTEGER := 0;
  valid_rows INTEGER := 0;
  invalid_rows INTEGER := 0;
  warnings_count INTEGER := 0;
BEGIN
  -- Get batch record
  SELECT * INTO batch_record 
  FROM dkpkl_import_batches 
  WHERE id = _batch_id;
  
  IF NOT FOUND THEN
    RETURN '{"success": false, "error": "Batch not found"}';
  END IF;
  
  -- Process each row of Excel data
  FOR row_data IN SELECT * FROM jsonb_array_elements(_excel_data)
  LOOP
    total_rows := total_rows + 1;
    
    -- Insert into appropriate staging table based on import type
    CASE _import_type
      WHEN 'SALES' THEN
        INSERT INTO dkpkl_sales_staging (
          organization_id, batch_id, voucher_number, voucher_date, party_name, 
          amount, gst_rate, remarks, raw_data
        ) VALUES (
          batch_record.organization_id,
          _batch_id,
          row_data->>'voucher_number',
          (row_data->>'voucher_date')::DATE,
          row_data->>'party_name',
          (row_data->>'amount')::NUMERIC,
          (row_data->>'gst_rate')::NUMERIC,
          row_data->>'remarks',
          row_data
        ) RETURNING id INTO staging_id;
        
      WHEN 'PURCHASE' THEN
        INSERT INTO dkpkl_purchase_staging (
          organization_id, batch_id, voucher_number, voucher_date, vendor_name, 
          amount, invoice_number, invoice_date, raw_data
        ) VALUES (
          batch_record.organization_id,
          _batch_id,
          row_data->>'voucher_number',
          (row_data->>'voucher_date')::DATE,
          row_data->>'vendor_name',
          (row_data->>'amount')::NUMERIC,
          row_data->>'invoice_number',
          (row_data->>'invoice_date')::DATE,
          row_data
        ) RETURNING id INTO staging_id;
        
      WHEN 'VOUCHER' THEN
        INSERT INTO dkpkl_voucher_staging (
          organization_id, batch_id, voucher_number, voucher_date, account_name, 
          debit_amount, credit_amount, narration, raw_data
        ) VALUES (
          batch_record.organization_id,
          _batch_id,
          row_data->>'voucher_number',
          (row_data->>'voucher_date')::DATE,
          row_data->>'account_name',
          (row_data->>'debit_amount')::NUMERIC,
          (row_data->>'credit_amount')::NUMERIC,
          row_data->>'narration',
          row_data
        ) RETURNING id INTO staging_id;
        
      WHEN 'STOCK' THEN
        INSERT INTO dkpkl_stock_staging (
          organization_id, batch_id, voucher_number, voucher_date, item_name, 
          quantity, rate, amount, godown_name, raw_data
        ) VALUES (
          batch_record.organization_id,
          _batch_id,
          row_data->>'voucher_number',
          (row_data->>'voucher_date')::DATE,
          row_data->>'item_name',
          (row_data->>'quantity')::NUMERIC,
          (row_data->>'rate')::NUMERIC,
          (row_data->>'amount')::NUMERIC,
          row_data->>'godown_name',
          row_data
        ) RETURNING id INTO staging_id;
    END CASE;
    
    -- Validate the staging record
    validation_result := dkpkl_validate_staging_record(staging_id, _import_type);
    
    -- Count results
    IF (validation_result->>'valid')::BOOLEAN THEN
      valid_rows := valid_rows + 1;
    ELSE
      invalid_rows := invalid_rows + 1;
    END IF;
    
    IF jsonb_array_length(validation_result->'warnings') > 0 THEN
      warnings_count := warnings_count + 1;
    END IF;
  END LOOP;
  
  -- Update batch status
  UPDATE dkpkl_import_batches 
  SET 
    status = 'processed',
    total_records = total_rows,
    valid_records = valid_rows,
    invalid_records = invalid_rows,
    processing_completed_at = now(),
    updated_at = now()
  WHERE id = _batch_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'total_rows', total_rows,
    'valid_rows', valid_rows,
    'invalid_rows', invalid_rows,
    'warnings_count', warnings_count
  );
END;
$function$;