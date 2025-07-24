-- Create enterprise-grade GRN bulk upload system

-- 1. Add composite unique constraint for GRN Number + Item Code
ALTER TABLE dkegl_grn_log ADD CONSTRAINT unique_grn_item_combo 
UNIQUE (organization_id, grn_number, item_code);

-- 2. Create GRN staging table for uploads
CREATE TABLE dkegl_grn_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES dkegl_organizations(id),
  upload_session_id UUID NOT NULL,
  grn_number TEXT NOT NULL,
  item_code TEXT NOT NULL,
  supplier_name TEXT,
  date DATE NOT NULL,
  qty_received NUMERIC NOT NULL,
  unit_rate NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  invoice_number TEXT,
  invoice_date DATE,
  quality_status TEXT DEFAULT 'pending',
  remarks TEXT,
  uom TEXT DEFAULT 'PCS',
  
  -- Validation results
  validation_status TEXT DEFAULT 'pending', -- pending, valid, invalid, warning
  validation_errors JSONB DEFAULT '[]'::jsonb,
  validation_warnings JSONB DEFAULT '[]'::jsonb,
  
  -- Duplicate detection
  is_duplicate BOOLEAN DEFAULT false,
  duplicate_reason TEXT,
  existing_record_id UUID,
  
  -- Processing status
  processing_status TEXT DEFAULT 'staged', -- staged, approved, rejected, processed
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- File information
  source_file_name TEXT,
  source_row_number INTEGER
);

-- 3. Create upload sessions table
CREATE TABLE dkegl_upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES dkegl_organizations(id),
  session_type TEXT DEFAULT 'grn_bulk_upload',
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_hash TEXT,
  total_rows INTEGER DEFAULT 0,
  valid_rows INTEGER DEFAULT 0,
  invalid_rows INTEGER DEFAULT 0,
  duplicate_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  
  -- Session status
  status TEXT DEFAULT 'uploading', -- uploading, validating, staged, approved, processing, completed, failed
  
  -- Validation summary
  validation_summary JSONB DEFAULT '{}'::jsonb,
  error_summary JSONB DEFAULT '{}'::jsonb,
  
  -- Approval workflow
  requires_approval BOOLEAN DEFAULT true,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  
  -- Processing information
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  processing_errors JSONB DEFAULT '[]'::jsonb,
  
  -- Audit fields
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Performance metrics
  upload_duration_ms INTEGER,
  validation_duration_ms INTEGER,
  processing_duration_ms INTEGER
);

-- 4. Create comprehensive audit log for GRN operations
CREATE TABLE dkegl_grn_operations_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES dkegl_organizations(id),
  operation_type TEXT NOT NULL, -- bulk_upload, single_create, update, delete, approve, reject
  operation_id UUID, -- session_id for bulk operations, grn_id for single operations
  
  -- User and session information
  user_id UUID NOT NULL,
  session_id UUID,
  ip_address INET,
  user_agent TEXT,
  
  -- Operation details
  affected_records INTEGER DEFAULT 0,
  operation_data JSONB DEFAULT '{}'::jsonb,
  before_values JSONB,
  after_values JSONB,
  
  -- Results
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  warning_count INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  warnings JSONB DEFAULT '[]'::jsonb,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  
  -- Risk assessment
  risk_level TEXT DEFAULT 'low', -- low, medium, high, critical
  risk_factors JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Create data quality metrics table
CREATE TABLE dkegl_data_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES dkegl_organizations(id),
  upload_session_id UUID REFERENCES dkegl_upload_sessions(id),
  
  -- Quality scores (0-100)
  overall_quality_score NUMERIC(5,2) DEFAULT 0,
  completeness_score NUMERIC(5,2) DEFAULT 0,
  accuracy_score NUMERIC(5,2) DEFAULT 0,
  consistency_score NUMERIC(5,2) DEFAULT 0,
  validity_score NUMERIC(5,2) DEFAULT 0,
  
  -- Detailed metrics
  total_fields INTEGER DEFAULT 0,
  empty_fields INTEGER DEFAULT 0,
  invalid_formats INTEGER DEFAULT 0,
  outliers_detected INTEGER DEFAULT 0,
  duplicate_values INTEGER DEFAULT 0,
  
  -- Recommendations
  recommendations JSONB DEFAULT '[]'::jsonb,
  quality_issues JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Add indexes for performance
CREATE INDEX idx_grn_staging_session ON dkegl_grn_staging(upload_session_id);
CREATE INDEX idx_grn_staging_status ON dkegl_grn_staging(processing_status);
CREATE INDEX idx_grn_staging_validation ON dkegl_grn_staging(validation_status);
CREATE INDEX idx_grn_staging_duplicates ON dkegl_grn_staging(is_duplicate);
CREATE INDEX idx_grn_staging_grn_item ON dkegl_grn_staging(organization_id, grn_number, item_code);

CREATE INDEX idx_upload_sessions_status ON dkegl_upload_sessions(status);
CREATE INDEX idx_upload_sessions_user ON dkegl_upload_sessions(uploaded_by);
CREATE INDEX idx_upload_sessions_date ON dkegl_upload_sessions(created_at);

CREATE INDEX idx_grn_audit_operation ON dkegl_grn_operations_audit(operation_type);
CREATE INDEX idx_grn_audit_user ON dkegl_grn_operations_audit(user_id);
CREATE INDEX idx_grn_audit_date ON dkegl_grn_operations_audit(created_at);

-- 7. Enable RLS on new tables
ALTER TABLE dkegl_grn_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_grn_operations_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_data_quality_metrics ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
CREATE POLICY "Organization members can access staging data" ON dkegl_grn_staging
FOR ALL USING (organization_id = dkegl_get_current_user_org());

CREATE POLICY "Organization members can access upload sessions" ON dkegl_upload_sessions
FOR ALL USING (organization_id = dkegl_get_current_user_org());

CREATE POLICY "Organization members can view audit logs" ON dkegl_grn_operations_audit
FOR SELECT USING (organization_id = dkegl_get_current_user_org());

CREATE POLICY "System can create audit logs" ON dkegl_grn_operations_audit
FOR INSERT WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "Organization members can access quality metrics" ON dkegl_data_quality_metrics
FOR ALL USING (organization_id = dkegl_get_current_user_org());

-- 9. Create trigger for automatic timestamp updates
CREATE TRIGGER update_grn_staging_timestamp
  BEFORE UPDATE ON dkegl_grn_staging
  FOR EACH ROW EXECUTE FUNCTION dkegl_update_timestamp();

CREATE TRIGGER update_upload_sessions_timestamp
  BEFORE UPDATE ON dkegl_upload_sessions
  FOR EACH ROW EXECUTE FUNCTION dkegl_update_timestamp();

-- 10. Create function to validate GRN staging data
CREATE OR REPLACE FUNCTION dkegl_validate_grn_staging_record(_staging_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  staging_record RECORD;
  validation_result JSONB := '{"valid": true, "errors": [], "warnings": []}';
  errors TEXT[] := '{}';
  warnings TEXT[] := '{}';
  item_exists BOOLEAN := false;
  duplicate_exists BOOLEAN := false;
  pricing_data RECORD;
BEGIN
  -- Get staging record
  SELECT * INTO staging_record FROM dkegl_grn_staging WHERE id = _staging_id;
  
  IF NOT FOUND THEN
    RETURN '{"valid": false, "errors": ["Staging record not found"]}';
  END IF;
  
  -- Check required fields
  IF staging_record.grn_number IS NULL OR staging_record.grn_number = '' THEN
    errors := array_append(errors, 'GRN Number is required');
  END IF;
  
  IF staging_record.item_code IS NULL OR staging_record.item_code = '' THEN
    errors := array_append(errors, 'Item Code is required');
  END IF;
  
  IF staging_record.qty_received IS NULL OR staging_record.qty_received <= 0 THEN
    errors := array_append(errors, 'Quantity Received must be greater than 0');
  END IF;
  
  -- Validate item exists
  SELECT EXISTS(
    SELECT 1 FROM dkegl_item_master 
    WHERE organization_id = staging_record.organization_id 
    AND item_code = staging_record.item_code 
    AND status = 'active'
  ) INTO item_exists;
  
  IF NOT item_exists THEN
    errors := array_append(errors, 'Item Code does not exist or is inactive');
  END IF;
  
  -- Check for duplicates (GRN Number + Item Code combination)
  SELECT EXISTS(
    SELECT 1 FROM dkegl_grn_log 
    WHERE organization_id = staging_record.organization_id 
    AND grn_number = staging_record.grn_number 
    AND item_code = staging_record.item_code
  ) INTO duplicate_exists;
  
  IF duplicate_exists THEN
    errors := array_append(errors, 'Duplicate GRN Number + Item Code combination exists');
    -- Update staging record to mark as duplicate
    UPDATE dkegl_grn_staging 
    SET is_duplicate = true, 
        duplicate_reason = 'GRN Number + Item Code combination already exists'
    WHERE id = _staging_id;
  END IF;
  
  -- Check within staging table for duplicates
  IF EXISTS(
    SELECT 1 FROM dkegl_grn_staging 
    WHERE upload_session_id = staging_record.upload_session_id 
    AND grn_number = staging_record.grn_number 
    AND item_code = staging_record.item_code 
    AND id != _staging_id
  ) THEN
    errors := array_append(errors, 'Duplicate within upload file');
  END IF;
  
  -- Validate date ranges
  IF staging_record.date > CURRENT_DATE THEN
    warnings := array_append(warnings, 'GRN date is in the future');
  END IF;
  
  IF staging_record.date < CURRENT_DATE - INTERVAL '365 days' THEN
    warnings := array_append(warnings, 'GRN date is more than 1 year old');
  END IF;
  
  -- Price variance check if item exists and pricing master data available
  IF item_exists AND staging_record.unit_rate > 0 THEN
    SELECT * INTO pricing_data 
    FROM dkegl_get_current_item_pricing(staging_record.organization_id, staging_record.item_code);
    
    IF pricing_data.standard_cost IS NOT NULL AND pricing_data.standard_cost > 0 THEN
      DECLARE
        variance_pct NUMERIC;
        tolerance NUMERIC := COALESCE(pricing_data.price_tolerance, 10);
      BEGIN
        variance_pct := ABS((staging_record.unit_rate - pricing_data.standard_cost) / pricing_data.standard_cost * 100);
        
        IF variance_pct > tolerance THEN
          warnings := array_append(warnings, 
            FORMAT('Price variance of %.2f%% exceeds tolerance of %.2f%%', variance_pct, tolerance)
          );
        END IF;
      END;
    END IF;
  END IF;
  
  -- Validate quality status
  IF staging_record.quality_status NOT IN ('pending', 'approved', 'in_review', 'passed', 'failed', 'rework_required') THEN
    errors := array_append(errors, 'Invalid quality status');
  END IF;
  
  -- Build validation result
  validation_result := jsonb_build_object(
    'valid', array_length(errors, 1) IS NULL,
    'errors', to_jsonb(errors),
    'warnings', to_jsonb(warnings),
    'is_duplicate', duplicate_exists,
    'item_exists', item_exists
  );
  
  -- Update staging record with validation results
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