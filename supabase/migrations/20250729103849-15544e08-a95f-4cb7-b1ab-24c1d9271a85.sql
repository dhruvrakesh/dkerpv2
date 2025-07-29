-- GST Integration Migration with Correct Table References
-- This migration adds GST functionality to the existing DKEGL ERP system

-- Create HSN Tax Rates table for managing GST rates
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

-- Enable RLS for HSN Tax Rates
ALTER TABLE dkegl_hsn_tax_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can access HSN tax rates"
ON dkegl_hsn_tax_rates
FOR ALL USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Create GST Summary table for tracking tax calculations
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

-- Enable RLS for GST Summary
ALTER TABLE dkegl_gst_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can access GST summary"
ON dkegl_gst_summary
FOR ALL USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Create Invoice Sequences table for financial year numbering
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

-- Enable RLS for Invoice Sequences
ALTER TABLE dkegl_invoice_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can access invoice sequences"
ON dkegl_invoice_sequences
FOR ALL USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Add GST-related columns to existing tables
-- Add HSN code to item master for GST classification
ALTER TABLE dkegl_item_master 
  ADD COLUMN IF NOT EXISTS hsn_code TEXT,
  ADD COLUMN IF NOT EXISTS gst_applicable BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS exemption_reason TEXT;

-- Add GST columns to purchase orders
ALTER TABLE dkegl_purchase_orders 
  ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_cgst_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sgst_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_igst_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS grand_total_amount NUMERIC(15,2) DEFAULT 0;

-- Add GST columns to PO items
ALTER TABLE dkegl_po_items 
  ADD COLUMN IF NOT EXISTS hsn_code TEXT,
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) DEFAULT 18.00,
  ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_with_tax NUMERIC(15,2) DEFAULT 0;

-- Add GST tracking to Tally import batches
ALTER TABLE dkpkl_import_batches 
  ADD COLUMN IF NOT EXISTS gst_validation_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS gst_summary JSONB DEFAULT '{}';

-- Insert default HSN tax rates for common manufacturing items
INSERT INTO dkegl_hsn_tax_rates (organization_id, hsn_code, commodity_description, cgst_rate, sgst_rate, igst_rate) 
SELECT 
  org.id, 
  hsn_data.hsn_code, 
  hsn_data.description, 
  hsn_data.cgst_rate, 
  hsn_data.sgst_rate, 
  hsn_data.igst_rate
FROM dkegl_organizations org
CROSS JOIN (
  VALUES 
    ('3920', 'Plastic films, sheets and strips', 9.00, 9.00, 18.00),
    ('3919', 'Self-adhesive plates, sheets, tapes', 9.00, 9.00, 18.00),
    ('4811', 'Paper and paperboard', 6.00, 6.00, 12.00),
    ('3208', 'Paints and varnishes', 14.00, 14.00, 28.00),
    ('8422', 'Packaging machinery', 9.00, 9.00, 18.00),
    ('3926', 'Other articles of plastics', 9.00, 9.00, 18.00)
) AS hsn_data(hsn_code, description, cgst_rate, sgst_rate, igst_rate)
WHERE org.code = 'DKEGL'
ON CONFLICT (organization_id, hsn_code, effective_from) DO NOTHING;

-- Function to get next financial year invoice number
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
  org_code TEXT;
  invoice_prefix TEXT;
  next_number INTEGER;
  formatted_number TEXT;
BEGIN
  -- Get organization code
  SELECT code INTO org_code FROM dkegl_organizations WHERE id = _org_id;
  
  -- Calculate financial year (April to March)
  current_fy := CASE 
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 4 
    THEN EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || RIGHT((EXTRACT(YEAR FROM CURRENT_DATE) + 1)::TEXT, 2)
    ELSE (EXTRACT(YEAR FROM CURRENT_DATE) - 1)::TEXT || '-' || RIGHT(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT, 2)
  END;
  
  -- Set prefix based on sequence type and organization
  invoice_prefix := COALESCE(org_code, 'ORG') || '-' || CASE _sequence_type
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

-- Function to calculate GST amounts for any transaction
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
    tax_rates.cess_rate := 0.00;
  END IF;
  
  -- Calculate tax amounts based on interstate or intrastate
  IF _is_interstate THEN
    igst_amount := ROUND((_taxable_amount * tax_rates.igst_rate / 100), 2);
    total_tax := igst_amount;
  ELSE
    cgst_amount := ROUND((_taxable_amount * tax_rates.cgst_rate / 100), 2);
    sgst_amount := ROUND((_taxable_amount * tax_rates.sgst_rate / 100), 2);
    total_tax := cgst_amount + sgst_amount;
  END IF;
  
  -- Build result JSON with all GST details
  result := jsonb_build_object(
    'hsn_code', _hsn_code,
    'taxable_amount', _taxable_amount,
    'cgst_rate', tax_rates.cgst_rate,
    'sgst_rate', tax_rates.sgst_rate,
    'igst_rate', tax_rates.igst_rate,
    'cess_rate', COALESCE(tax_rates.cess_rate, 0),
    'cgst_amount', cgst_amount,
    'sgst_amount', sgst_amount,
    'igst_amount', igst_amount,
    'cess_amount', 0,
    'total_tax_amount', total_tax,
    'grand_total', _taxable_amount + total_tax,
    'is_interstate', _is_interstate
  );
  
  RETURN result;
END;
$$;

-- Function to create/update GST summary for documents
CREATE OR REPLACE FUNCTION dkegl_create_gst_summary(
  _org_id UUID,
  _document_type TEXT,
  _document_id UUID,
  _line_items JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  summary_id UUID;
  total_taxable NUMERIC := 0;
  total_cgst NUMERIC := 0;
  total_sgst NUMERIC := 0;
  total_igst NUMERIC := 0;
  total_cess NUMERIC := 0;
  total_tax NUMERIC := 0;
  grand_total NUMERIC := 0;
  line_item JSONB;
BEGIN
  -- Calculate totals from line items
  FOR line_item IN SELECT * FROM jsonb_array_elements(_line_items)
  LOOP
    total_taxable := total_taxable + COALESCE((line_item->>'taxable_amount')::NUMERIC, 0);
    total_cgst := total_cgst + COALESCE((line_item->>'cgst_amount')::NUMERIC, 0);
    total_sgst := total_sgst + COALESCE((line_item->>'sgst_amount')::NUMERIC, 0);
    total_igst := total_igst + COALESCE((line_item->>'igst_amount')::NUMERIC, 0);
    total_cess := total_cess + COALESCE((line_item->>'cess_amount')::NUMERIC, 0);
  END LOOP;
  
  total_tax := total_cgst + total_sgst + total_igst + total_cess;
  grand_total := total_taxable + total_tax;
  
  -- Insert or update GST summary
  INSERT INTO dkegl_gst_summary (
    organization_id, document_type, document_id,
    total_taxable_amount, total_cgst_amount, total_sgst_amount, 
    total_igst_amount, total_cess_amount, total_tax_amount, grand_total
  ) VALUES (
    _org_id, _document_type, _document_id,
    total_taxable, total_cgst, total_sgst,
    total_igst, total_cess, total_tax, grand_total
  )
  ON CONFLICT (organization_id, document_type, document_id) 
  DO UPDATE SET
    total_taxable_amount = EXCLUDED.total_taxable_amount,
    total_cgst_amount = EXCLUDED.total_cgst_amount,
    total_sgst_amount = EXCLUDED.total_sgst_amount,
    total_igst_amount = EXCLUDED.total_igst_amount,
    total_cess_amount = EXCLUDED.total_cess_amount,
    total_tax_amount = EXCLUDED.total_tax_amount,
    grand_total = EXCLUDED.grand_total,
    updated_at = NOW()
  RETURNING id INTO summary_id;
  
  RETURN summary_id;
END;
$$;

-- Create unique constraint on GST summary to prevent duplicates
ALTER TABLE dkegl_gst_summary 
  ADD CONSTRAINT unique_gst_summary_document 
  UNIQUE (organization_id, document_type, document_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dkegl_hsn_tax_rates_lookup 
  ON dkegl_hsn_tax_rates(organization_id, hsn_code, is_active, effective_from);

CREATE INDEX IF NOT EXISTS idx_dkegl_gst_summary_document 
  ON dkegl_gst_summary(organization_id, document_type, document_id);

CREATE INDEX IF NOT EXISTS idx_dkegl_invoice_sequences_lookup 
  ON dkegl_invoice_sequences(organization_id, sequence_type, financial_year);