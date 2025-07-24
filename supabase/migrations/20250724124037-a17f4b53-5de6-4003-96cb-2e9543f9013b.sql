-- Enterprise-grade GRN validation and processing functions

-- Enhanced GRN staging record validation with better date handling
CREATE OR REPLACE FUNCTION public.dkegl_validate_grn_staging_record_enhanced(_staging_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  staging_record RECORD;
  validation_result JSONB := '{"valid": true, "errors": [], "warnings": []}';
  errors TEXT[] := '{}';
  warnings TEXT[] := '{}';
  item_exists BOOLEAN := false;
  duplicate_exists BOOLEAN := false;
  pricing_data RECORD;
  similar_items TEXT[] := '{}';
BEGIN
  -- Get staging record
  SELECT * INTO staging_record FROM dkegl_grn_staging WHERE id = _staging_id;
  
  IF NOT FOUND THEN
    RETURN '{"valid": false, "errors": ["Staging record not found"]}';
  END IF;
  
  -- Enhanced validation checks
  
  -- Check required fields with specific messages
  IF staging_record.grn_number IS NULL OR staging_record.grn_number = '' THEN
    errors := array_append(errors, 'GRN Number is required and cannot be empty');
  ELSIF LENGTH(staging_record.grn_number) < 3 THEN
    errors := array_append(errors, 'GRN Number is too short (minimum 3 characters)');
  END IF;
  
  IF staging_record.item_code IS NULL OR staging_record.item_code = '' THEN
    errors := array_append(errors, 'Item Code is required and cannot be empty');
  END IF;
  
  IF staging_record.qty_received IS NULL OR staging_record.qty_received <= 0 THEN
    errors := array_append(errors, 'Quantity Received must be greater than 0');
  ELSIF staging_record.qty_received > 1000000 THEN
    warnings := array_append(warnings, 'Quantity seems unusually high (>1M units)');
  END IF;
  
  -- Enhanced item validation with fuzzy matching
  SELECT EXISTS(
    SELECT 1 FROM dkegl_item_master 
    WHERE organization_id = staging_record.organization_id 
    AND item_code = staging_record.item_code 
    AND status = 'active'
  ) INTO item_exists;
  
  IF NOT item_exists THEN
    errors := array_append(errors, 'Item Code does not exist or is inactive');
    
    -- Find similar item codes using trigram similarity
    SELECT array_agg(item_code) INTO similar_items
    FROM (
      SELECT item_code, similarity(item_code, staging_record.item_code) as sim
      FROM dkegl_item_master 
      WHERE organization_id = staging_record.organization_id 
      AND status = 'active'
      AND similarity(item_code, staging_record.item_code) > 0.3
      ORDER BY sim DESC
      LIMIT 3
    ) similar;
    
    IF array_length(similar_items, 1) > 0 THEN
      warnings := array_append(warnings, 
        FORMAT('Similar items found: %s', array_to_string(similar_items, ', '))
      );
    END IF;
  END IF;
  
  -- Enhanced duplicate detection (composite key: GRN Number + Item Code + Organization)
  SELECT EXISTS(
    SELECT 1 FROM dkegl_grn_log 
    WHERE organization_id = staging_record.organization_id 
    AND grn_number = staging_record.grn_number 
    AND item_code = staging_record.item_code
  ) INTO duplicate_exists;
  
  IF duplicate_exists THEN
    errors := array_append(errors, 'Duplicate: GRN Number + Item Code combination already exists in main records');
    -- Update staging record to mark as duplicate
    UPDATE dkegl_grn_staging 
    SET is_duplicate = true, 
        duplicate_reason = 'GRN Number + Item Code combination already exists in main records'
    WHERE id = _staging_id;
  ELSE
    -- Check within staging table for duplicates
    IF EXISTS(
      SELECT 1 FROM dkegl_grn_staging 
      WHERE upload_session_id = staging_record.upload_session_id 
      AND grn_number = staging_record.grn_number 
      AND item_code = staging_record.item_code 
      AND id != _staging_id
    ) THEN
      errors := array_append(errors, 'Duplicate within upload: Same GRN Number + Item Code found in this file');
      UPDATE dkegl_grn_staging 
      SET is_duplicate = true, 
          duplicate_reason = 'Duplicate within upload file'
      WHERE id = _staging_id;
    END IF;
  END IF;
  
  -- Enhanced date validation
  IF staging_record.date IS NULL THEN
    errors := array_append(errors, 'GRN Date is required');
  ELSE
    IF staging_record.date > CURRENT_DATE THEN
      warnings := array_append(warnings, 'GRN date is in the future');
    END IF;
    
    IF staging_record.date < CURRENT_DATE - INTERVAL '2 years' THEN
      warnings := array_append(warnings, 'GRN date is more than 2 years old');
    ELSIF staging_record.date < CURRENT_DATE - INTERVAL '1 year' THEN
      warnings := array_append(warnings, 'GRN date is more than 1 year old');
    END IF;
  END IF;
  
  -- Enhanced price variance check
  IF item_exists AND staging_record.unit_rate > 0 THEN
    SELECT * INTO pricing_data 
    FROM dkegl_get_current_item_pricing(staging_record.organization_id, staging_record.item_code);
    
    IF pricing_data.standard_cost IS NOT NULL AND pricing_data.standard_cost > 0 THEN
      DECLARE
        variance_pct NUMERIC;
        tolerance NUMERIC := COALESCE(pricing_data.price_tolerance, 10);
      BEGIN
        variance_pct := ABS((staging_record.unit_rate - pricing_data.standard_cost) / pricing_data.standard_cost * 100);
        
        IF variance_pct > tolerance * 2 THEN
          errors := array_append(errors, 
            FORMAT('Price variance of %.2f%% is critically high (tolerance: %.2f%%)', variance_pct, tolerance)
          );
        ELSIF variance_pct > tolerance THEN
          warnings := array_append(warnings, 
            FORMAT('Price variance of %.2f%% exceeds tolerance of %.2f%%', variance_pct, tolerance)
          );
        END IF;
      END;
    END IF;
  END IF;
  
  -- Validate supplier name
  IF staging_record.supplier_name IS NOT NULL AND LENGTH(staging_record.supplier_name) < 2 THEN
    warnings := array_append(warnings, 'Supplier name is very short');
  END IF;
  
  -- Validate invoice details
  IF staging_record.invoice_number IS NOT NULL AND staging_record.invoice_number != '' THEN
    IF staging_record.invoice_date IS NULL THEN
      warnings := array_append(warnings, 'Invoice number provided but invoice date is missing');
    END IF;
  END IF;
  
  -- Enhanced quality status validation
  IF staging_record.quality_status NOT IN ('pending', 'approved', 'in_review', 'passed', 'failed', 'rework_required') THEN
    errors := array_append(errors, 'Invalid quality status. Must be one of: pending, approved, in_review, passed, failed, rework_required');
  END IF;
  
  -- Business logic validations
  IF staging_record.total_amount > 0 AND staging_record.unit_rate > 0 AND staging_record.qty_received > 0 THEN
    DECLARE
      calculated_total NUMERIC := staging_record.qty_received * staging_record.unit_rate;
      variance NUMERIC := ABS(staging_record.total_amount - calculated_total);
    BEGIN
      IF variance > 0.01 THEN -- Allow for rounding differences
        warnings := array_append(warnings, 
          FORMAT('Total amount (%.2f) does not match calculated amount (%.2f)', 
                 staging_record.total_amount, calculated_total)
        );
      END IF;
    END;
  END IF;
  
  -- Build comprehensive validation result
  validation_result := jsonb_build_object(
    'valid', array_length(errors, 1) IS NULL,
    'errors', to_jsonb(errors),
    'warnings', to_jsonb(warnings),
    'is_duplicate', duplicate_exists OR EXISTS(
      SELECT 1 FROM dkegl_grn_staging 
      WHERE upload_session_id = staging_record.upload_session_id 
      AND grn_number = staging_record.grn_number 
      AND item_code = staging_record.item_code 
      AND id != _staging_id
    ),
    'item_exists', item_exists,
    'similar_items', COALESCE(to_jsonb(similar_items), '[]'::jsonb),
    'validation_metadata', jsonb_build_object(
      'validated_at', now(),
      'validator_version', '2.0',
      'total_checks', 15
    )
  );
  
  -- Update staging record with enhanced validation results
  UPDATE dkegl_grn_staging 
  SET 
    validation_status = CASE WHEN array_length(errors, 1) IS NULL THEN 'valid' ELSE 'invalid' END,
    validation_errors = to_jsonb(errors),
    validation_warnings = to_jsonb(warnings),
    updated_at = now()
  WHERE id = _staging_id;
  
  RETURN validation_result;
END;
$$;

-- Enhanced batch validation function for better performance
CREATE OR REPLACE FUNCTION public.dkegl_batch_validate_staging_records(_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  total_records INTEGER;
  processed_records INTEGER := 0;
  validation_summary JSONB;
BEGIN
  -- Get total records for this session
  SELECT COUNT(*) INTO total_records 
  FROM dkegl_grn_staging 
  WHERE upload_session_id = _session_id;
  
  -- Validate records in batches of 100
  FOR staging_record IN 
    SELECT id FROM dkegl_grn_staging 
    WHERE upload_session_id = _session_id 
    ORDER BY source_row_number
  LOOP
    PERFORM dkegl_validate_grn_staging_record_enhanced(staging_record.id);
    processed_records := processed_records + 1;
    
    -- Update progress every 50 records
    IF processed_records % 50 = 0 THEN
      UPDATE dkegl_upload_sessions 
      SET validation_summary = jsonb_build_object(
        'progress', ROUND((processed_records::NUMERIC / total_records::NUMERIC) * 100, 2),
        'processed', processed_records,
        'total', total_records
      )
      WHERE id = _session_id;
    END IF;
  END LOOP;
  
  -- Calculate final validation summary
  WITH validation_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE validation_status = 'valid') as valid,
      COUNT(*) FILTER (WHERE validation_status = 'invalid') as invalid,
      COUNT(*) FILTER (WHERE is_duplicate = true) as duplicates,
      COUNT(*) FILTER (WHERE jsonb_array_length(COALESCE(validation_warnings, '[]'::jsonb)) > 0) as warnings
    FROM dkegl_grn_staging 
    WHERE upload_session_id = _session_id
  )
  SELECT jsonb_build_object(
    'total_records', total,
    'valid_records', valid,
    'invalid_records', invalid,
    'duplicate_records', duplicates,
    'records_with_warnings', warnings,
    'validation_completed_at', now(),
    'processing_ready', valid > 0 AND invalid = 0
  ) INTO validation_summary
  FROM validation_stats;
  
  -- Update session with final summary
  UPDATE dkegl_upload_sessions 
  SET 
    validation_summary = validation_summary,
    status = CASE 
      WHEN (validation_summary->>'invalid_records')::INTEGER = 0 THEN 'staged'
      ELSE 'validation_failed'
    END,
    updated_at = now()
  WHERE id = _session_id;
  
  RETURN validation_summary;
END;
$$;

-- Create composite unique constraint on GRN log to prevent duplicates
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'dkegl_grn_log_unique_composite'
  ) THEN
    ALTER TABLE dkegl_grn_log 
    ADD CONSTRAINT dkegl_grn_log_unique_composite 
    UNIQUE (organization_id, grn_number, item_code);
  END IF;
END $$;

-- Enhanced trigger for GRN log to detect pricing variances
CREATE OR REPLACE FUNCTION public.dkegl_enhanced_grn_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  unit_price NUMERIC := 0;
BEGIN
  -- Calculate unit price if total amount provided
  IF NEW.total_amount > 0 AND NEW.qty_received > 0 THEN
    unit_price := NEW.total_amount / NEW.qty_received;
  ELSIF NEW.unit_rate > 0 THEN
    unit_price := NEW.unit_rate;
    NEW.total_amount := NEW.qty_received * NEW.unit_rate;
  END IF;

  -- Update stock with better conflict resolution
  INSERT INTO dkegl_stock (organization_id, item_code, current_qty, unit_cost, last_transaction_date, last_updated)
  VALUES (NEW.organization_id, NEW.item_code, NEW.qty_received, unit_price, NEW.date, now())
  ON CONFLICT (organization_id, item_code, location)
  DO UPDATE SET 
    current_qty = dkegl_stock.current_qty + NEW.qty_received,
    unit_cost = CASE 
      WHEN unit_price > 0 THEN unit_price 
      ELSE dkegl_stock.unit_cost 
    END,
    last_transaction_date = GREATEST(dkegl_stock.last_transaction_date, NEW.date),
    last_updated = now();
  
  -- Enhanced pricing variance detection
  IF unit_price > 0 THEN
    PERFORM dkegl_detect_pricing_variance(
      NEW.organization_id, 
      NEW.item_code, 
      unit_price, 
      NEW.grn_number
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Replace existing trigger with enhanced version
DROP TRIGGER IF EXISTS dkegl_update_stock_on_grn_trigger ON dkegl_grn_log;
CREATE TRIGGER dkegl_enhanced_grn_trigger
  AFTER INSERT OR UPDATE ON dkegl_grn_log
  FOR EACH ROW
  EXECUTE FUNCTION dkegl_enhanced_grn_trigger();

-- Add performance indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dkegl_grn_staging_session_validation 
ON dkegl_grn_staging(upload_session_id, validation_status);

CREATE INDEX IF NOT EXISTS idx_dkegl_grn_staging_duplicate_check 
ON dkegl_grn_staging(organization_id, grn_number, item_code);

CREATE INDEX IF NOT EXISTS idx_dkegl_grn_log_composite_unique 
ON dkegl_grn_log(organization_id, grn_number, item_code);

-- Create materialized view for frequently accessed item data
CREATE MATERIALIZED VIEW IF NOT EXISTS dkegl_active_items_mv AS
SELECT 
  organization_id,
  item_code,
  item_name,
  uom,
  category_id,
  status,
  pricing_info,
  specifications
FROM dkegl_item_master 
WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS idx_dkegl_active_items_mv_org_code 
ON dkegl_active_items_mv(organization_id, item_code);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION public.dkegl_refresh_active_items_cache()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY dkegl_active_items_mv;
$$;