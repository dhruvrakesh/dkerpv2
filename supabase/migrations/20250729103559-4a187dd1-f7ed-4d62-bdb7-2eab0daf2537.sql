-- Create GST and Invoice tables with corrected naming conventions
-- Use dkegl_* for operational ERP data and dkpkl_* for Tally import data

-- HSN Tax Rates table (ERP operational data)
CREATE TABLE IF NOT EXISTS dkegl_hsn_tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES dkegl_organizations(id) ON DELETE CASCADE,
  hsn_code TEXT NOT NULL,
  commodity_description TEXT,
  cgst_rate NUMERIC(5,2) DEFAULT 0,
  sgst_rate NUMERIC(5,2) DEFAULT 0,
  igst_rate NUMERIC(5,2) DEFAULT 0,
  cess_rate NUMERIC(5,2) DEFAULT 0,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, hsn_code, effective_from)
);

-- Enable RLS
ALTER TABLE dkegl_hsn_tax_rates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Organization members can access HSN tax rates"
ON dkegl_hsn_tax_rates
FOR ALL USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- GST Summary table for invoices
CREATE TABLE IF NOT EXISTS dkegl_gst_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES dkegl_organizations(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'purchase_order', 'grn')),
  document_id UUID NOT NULL,
  total_taxable_amount NUMERIC(15,2) DEFAULT 0,
  total_cgst_amount NUMERIC(15,2) DEFAULT 0,
  total_sgst_amount NUMERIC(15,2) DEFAULT 0,
  total_igst_amount NUMERIC(15,2) DEFAULT 0,
  total_cess_amount NUMERIC(15,2) DEFAULT 0,
  total_tax_amount NUMERIC(15,2) DEFAULT 0,
  round_off_amount NUMERIC(10,2) DEFAULT 0,
  grand_total NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE dkegl_gst_summary ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Organization members can access GST summary"
ON dkegl_gst_summary
FOR ALL USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Invoice Sequences table
CREATE TABLE IF NOT EXISTS dkegl_invoice_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES dkegl_organizations(id) ON DELETE CASCADE,
  sequence_type TEXT NOT NULL CHECK (sequence_type IN ('invoice', 'purchase_order', 'grn')),
  financial_year TEXT NOT NULL,
  prefix TEXT NOT NULL,
  current_number INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, sequence_type, financial_year)
);

-- Enable RLS
ALTER TABLE dkegl_invoice_sequences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Organization members can access invoice sequences"
ON dkegl_invoice_sequences
FOR ALL USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Add GST-related columns to Tally import tables (dkpkl_*)
ALTER TABLE dkpkl_import_batches ADD COLUMN IF NOT EXISTS gst_validation_enabled BOOLEAN DEFAULT false;
ALTER TABLE dkpkl_import_batches ADD COLUMN IF NOT EXISTS gst_summary JSONB DEFAULT '{}';

-- Add GST columns to staging records  
ALTER TABLE dkpkl_staging_records ADD COLUMN IF NOT EXISTS hsn_code TEXT;
ALTER TABLE dkpkl_staging_records ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2);
ALTER TABLE dkpkl_staging_records ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(15,2);
ALTER TABLE dkpkl_staging_records ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(15,2);
ALTER TABLE dkpkl_staging_records ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(15,2);
ALTER TABLE dkpkl_staging_records ADD COLUMN IF NOT EXISTS total_tax_amount NUMERIC(15,2);

-- Add GST columns to ERP item master
ALTER TABLE dkegl_item_master ADD COLUMN IF NOT EXISTS hsn_code TEXT;
ALTER TABLE dkegl_item_master ADD COLUMN IF NOT EXISTS gst_applicable BOOLEAN DEFAULT true;
ALTER TABLE dkegl_item_master ADD COLUMN IF NOT EXISTS exemption_reason TEXT;

-- Insert default HSN tax rates for common items
INSERT INTO dkegl_hsn_tax_rates (organization_id, hsn_code, commodity_description, cgst_rate, sgst_rate, igst_rate) 
VALUES 
  ((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1), '3920', 'Plastic films, sheets', 9.00, 9.00, 18.00),
  ((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1), '3919', 'Adhesive tapes', 9.00, 9.00, 18.00),
  ((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1), '4811', 'Paper and paperboard', 12.00, 12.00, 12.00),
  ((SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1), '3208', 'Paints and varnishes', 14.00, 14.00, 28.00)
ON CONFLICT (organization_id, hsn_code, effective_from) DO NOTHING;

-- Function to get next invoice number
CREATE OR REPLACE FUNCTION dkegl_get_next_invoice_number(
  _org_id UUID,
  _sequence_type TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_fy TEXT;
  invoice_prefix TEXT;
  next_number INTEGER;
  formatted_number TEXT;
BEGIN
  -- Calculate financial year (April to March)
  current_fy := CASE 
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 4 
    THEN EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || (EXTRACT(YEAR FROM CURRENT_DATE) + 1)::TEXT
    ELSE (EXTRACT(YEAR FROM CURRENT_DATE) - 1)::TEXT || '-' || EXTRACT(YEAR FROM CURRENT_DATE)::TEXT
  END;
  
  -- Set prefix based on sequence type
  invoice_prefix := CASE _sequence_type
    WHEN 'invoice' THEN 'INV'
    WHEN 'purchase_order' THEN 'PO'
    WHEN 'grn' THEN 'GRN'
    ELSE 'DOC'
  END;
  
  -- Get or create sequence record
  INSERT INTO dkegl_invoice_sequences (organization_id, sequence_type, financial_year, prefix, current_number)
  VALUES (_org_id, _sequence_type, current_fy, invoice_prefix, 1)
  ON CONFLICT (organization_id, sequence_type, financial_year)
  DO UPDATE SET 
    current_number = dkegl_invoice_sequences.current_number + 1,
    updated_at = NOW()
  RETURNING current_number INTO next_number;
  
  -- Format the invoice number
  formatted_number := invoice_prefix || '/' || current_fy || '/' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN formatted_number;
END;
$$;

-- Function to calculate GST amounts
CREATE OR REPLACE FUNCTION dkegl_calculate_gst(
  _org_id UUID,
  _hsn_code TEXT,
  _taxable_amount NUMERIC,
  _is_interstate BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tax_rates RECORD;
  cgst_amount NUMERIC := 0;
  sgst_amount NUMERIC := 0;
  igst_amount NUMERIC := 0;
  total_tax NUMERIC := 0;
  result JSONB;
BEGIN
  -- Get current tax rates for HSN code
  SELECT * INTO tax_rates
  FROM dkegl_hsn_tax_rates
  WHERE organization_id = _org_id
    AND hsn_code = _hsn_code
    AND is_active = true
    AND effective_from <= CURRENT_DATE
    AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
  ORDER BY effective_from DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    -- Default to 18% GST if HSN code not found
    tax_rates.cgst_rate := 9.00;
    tax_rates.sgst_rate := 9.00;
    tax_rates.igst_rate := 18.00;
  END IF;
  
  -- Calculate tax amounts based on interstate or intrastate
  IF _is_interstate THEN
    igst_amount := (_taxable_amount * tax_rates.igst_rate / 100);
    total_tax := igst_amount;
  ELSE
    cgst_amount := (_taxable_amount * tax_rates.cgst_rate / 100);
    sgst_amount := (_taxable_amount * tax_rates.sgst_rate / 100);
    total_tax := cgst_amount + sgst_amount;
  END IF;
  
  -- Build result JSON
  result := jsonb_build_object(
    'hsn_code', _hsn_code,
    'taxable_amount', _taxable_amount,
    'cgst_rate', tax_rates.cgst_rate,
    'sgst_rate', tax_rates.sgst_rate,
    'igst_rate', tax_rates.igst_rate,
    'cgst_amount', ROUND(cgst_amount, 2),
    'sgst_amount', ROUND(sgst_amount, 2),
    'igst_amount', ROUND(igst_amount, 2),
    'total_tax_amount', ROUND(total_tax, 2),
    'grand_total', ROUND(_taxable_amount + total_tax, 2)
  );
  
  RETURN result;
END;
$$;

-- Function for GST validation during Tally imports
CREATE OR REPLACE FUNCTION dkpkl_process_gst_validation(
  _batch_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  validation_summary JSONB := '{"total_records": 0, "valid_gst": 0, "missing_hsn": 0, "invalid_rates": 0}';
  record_count INTEGER := 0;
  valid_gst_count INTEGER := 0;
  missing_hsn_count INTEGER := 0;
  invalid_rates_count INTEGER := 0;
  staging_record RECORD;
BEGIN
  -- Process each staging record in the batch
  FOR staging_record IN 
    SELECT * FROM dkpkl_staging_records 
    WHERE batch_id = _batch_id AND validation_status != 'failed'
  LOOP
    record_count := record_count + 1;
    
    -- Check if HSN code is provided
    IF staging_record.hsn_code IS NULL OR staging_record.hsn_code = '' THEN
      missing_hsn_count := missing_hsn_count + 1;
      
      -- Update record with warning
      UPDATE dkpkl_staging_records 
      SET validation_issues = COALESCE(validation_issues, '[]'::jsonb) || 
          '["Missing HSN code for GST calculation"]'::jsonb
      WHERE id = staging_record.id;
    ELSE
      -- Validate GST rates and calculate amounts
      IF staging_record.gst_rate IS NOT NULL AND staging_record.gst_rate > 0 THEN
        valid_gst_count := valid_gst_count + 1;
        
        -- Calculate tax amounts if base amount is available
        IF (staging_record.data->>'amount')::NUMERIC > 0 THEN
          UPDATE dkpkl_staging_records 
          SET 
            cgst_amount = (staging_record.data->>'amount')::NUMERIC * (staging_record.gst_rate / 2) / 100,
            sgst_amount = (staging_record.data->>'amount')::NUMERIC * (staging_record.gst_rate / 2) / 100,
            total_tax_amount = (staging_record.data->>'amount')::NUMERIC * staging_record.gst_rate / 100
          WHERE id = staging_record.id;
        END IF;
      ELSE
        invalid_rates_count := invalid_rates_count + 1;
        
        -- Update record with error
        UPDATE dkpkl_staging_records 
        SET validation_issues = COALESCE(validation_issues, '[]'::jsonb) || 
            '["Invalid or missing GST rate"]'::jsonb
        WHERE id = staging_record.id;
      END IF;
    END IF;
  END LOOP;
  
  -- Build validation summary
  validation_summary := jsonb_build_object(
    'total_records', record_count,
    'valid_gst', valid_gst_count,
    'missing_hsn', missing_hsn_count,
    'invalid_rates', invalid_rates_count,
    'gst_compliance_percentage', 
    CASE WHEN record_count > 0 
         THEN ROUND((valid_gst_count::NUMERIC / record_count) * 100, 2)
         ELSE 0 END
  );
  
  -- Update batch with GST summary
  UPDATE dkpkl_import_batches
  SET 
    gst_validation_enabled = true,
    gst_summary = validation_summary,
    updated_at = NOW()
  WHERE id = _batch_id;
  
  RETURN validation_summary;
END;
$$;