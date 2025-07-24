-- Enhanced GRN validation function with fixed SQL syntax
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
    
    -- Find similar item codes using trigram similarity (fixed subquery alias)
    SELECT array_agg(item_code) INTO similar_items
    FROM (
      SELECT item_code, similarity(item_code, staging_record.item_code) as sim
      FROM dkegl_item_master 
      WHERE organization_id = staging_record.organization_id 
      AND status = 'active'
      AND staging_record.item_code IS NOT NULL
      AND LENGTH(staging_record.item_code) > 0
      ORDER BY similarity(item_code, staging_record.item_code) DESC
      LIMIT 3
    ) AS similar_matches;
    
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
  
  -- Enhanced quality status validation
  IF staging_record.quality_status NOT IN ('pending', 'approved', 'in_review', 'passed', 'failed', 'rework_required') THEN
    errors := array_append(errors, 'Invalid quality status. Must be one of: pending, approved, in_review, passed, failed, rework_required');
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
      'total_checks', 12
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