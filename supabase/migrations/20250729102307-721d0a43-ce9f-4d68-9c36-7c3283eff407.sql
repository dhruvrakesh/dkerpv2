-- Phase 1: GST Foundation Database Schema Enhancement

-- HSN Tax Rates Master Table
CREATE TABLE public.dkegl_hsn_tax_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.dkegl_organizations(id),
  hsn_code TEXT NOT NULL,
  hsn_description TEXT,
  cgst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  sgst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  igst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  cess_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  
  UNIQUE(organization_id, hsn_code, effective_from)
);

-- GST Summary for period-wise tax liability
CREATE TABLE public.dkegl_gst_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.dkegl_organizations(id),
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  total_taxable_sales NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_tax_collected NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_taxable_purchases NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_input_tax_credit NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_tax_liability NUMERIC(15,2) NOT NULL DEFAULT 0,
  gstr1_data JSONB DEFAULT '{}',
  gstr3b_data JSONB DEFAULT '{}',
  filing_status TEXT NOT NULL DEFAULT 'pending',
  filed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(organization_id, period_month, period_year)
);

-- Invoice sequence management for GST compliance
CREATE TABLE public.dkegl_invoice_sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.dkegl_organizations(id),
  financial_year TEXT NOT NULL,
  invoice_type TEXT NOT NULL DEFAULT 'tax_invoice',
  prefix TEXT NOT NULL DEFAULT 'INV',
  current_sequence INTEGER NOT NULL DEFAULT 0,
  reset_frequency TEXT NOT NULL DEFAULT 'yearly',
  last_reset_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(organization_id, financial_year, invoice_type, prefix)
);

-- Add GST fields to existing dkegl_import_batches table
ALTER TABLE public.dkegl_import_batches 
ADD COLUMN gst_validation_status TEXT DEFAULT 'pending',
ADD COLUMN gst_compliance_score NUMERIC(5,2) DEFAULT 0,
ADD COLUMN hsn_coverage_percentage NUMERIC(5,2) DEFAULT 0,
ADD COLUMN tax_calculation_errors JSONB DEFAULT '[]';

-- Add GST fields to dkegl_staging_records 
ALTER TABLE public.dkegl_staging_records
ADD COLUMN hsn_code TEXT,
ADD COLUMN gst_rate NUMERIC(5,2),
ADD COLUMN cgst_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN sgst_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN igst_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN cess_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN place_of_supply TEXT,
ADD COLUMN reverse_charge BOOLEAN DEFAULT false,
ADD COLUMN gst_validation_errors JSONB DEFAULT '[]';

-- Add GST fields to dkegl_item_master
ALTER TABLE public.dkegl_item_master
ADD COLUMN hsn_code TEXT,
ADD COLUMN gst_rate NUMERIC(5,2),
ADD COLUMN is_exempt BOOLEAN DEFAULT false;

-- Enable RLS on new tables
ALTER TABLE public.dkegl_hsn_tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkegl_gst_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkegl_invoice_sequences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organization members can access HSN tax rates"
ON public.dkegl_hsn_tax_rates
FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "Organization members can access GST summary"
ON public.dkegl_gst_summary
FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "Organization members can access invoice sequences"
ON public.dkegl_invoice_sequences
FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Insert default HSN tax rates
INSERT INTO public.dkegl_hsn_tax_rates (organization_id, hsn_code, hsn_description, cgst_rate, sgst_rate, igst_rate) 
SELECT 
  id as organization_id,
  '4811' as hsn_code,
  'Paper and paperboard products' as hsn_description,
  9.00 as cgst_rate,
  9.00 as sgst_rate,
  18.00 as igst_rate
FROM public.dkegl_organizations WHERE code = 'DKEGL'
UNION ALL
SELECT 
  id as organization_id,
  '3923' as hsn_code,
  'Plastic film and sheets' as hsn_description,
  9.00 as cgst_rate,
  9.00 as sgst_rate,
  18.00 as igst_rate
FROM public.dkegl_organizations WHERE code = 'DKEGL';

-- Function to get next invoice number
CREATE OR REPLACE FUNCTION public.dkegl_get_next_invoice_number(
  _org_id UUID,
  _invoice_type TEXT DEFAULT 'tax_invoice',
  _prefix TEXT DEFAULT 'INV'
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_fy TEXT;
  next_seq INTEGER;
  invoice_number TEXT;
BEGIN
  -- Get current financial year (Apr-Mar)
  current_fy := CASE 
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) >= 4 
    THEN EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || LPAD((EXTRACT(YEAR FROM CURRENT_DATE) + 1)::TEXT, 2, '0')
    ELSE (EXTRACT(YEAR FROM CURRENT_DATE) - 1)::TEXT || '-' || LPAD(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT, 2, '0')
  END;
  
  -- Get and update sequence
  INSERT INTO dkegl_invoice_sequences (organization_id, financial_year, invoice_type, prefix, current_sequence)
  VALUES (_org_id, current_fy, _invoice_type, _prefix, 1)
  ON CONFLICT (organization_id, financial_year, invoice_type, prefix)
  DO UPDATE SET 
    current_sequence = dkegl_invoice_sequences.current_sequence + 1,
    updated_at = now()
  RETURNING current_sequence INTO next_seq;
  
  -- Format invoice number
  invoice_number := _prefix || '/' || current_fy || '/' || LPAD(next_seq::TEXT, 6, '0');
  
  RETURN invoice_number;
END;
$$;

-- Function to calculate GST based on HSN code
CREATE OR REPLACE FUNCTION public.dkegl_calculate_gst(
  _org_id UUID,
  _hsn_code TEXT,
  _taxable_amount NUMERIC,
  _customer_state_code TEXT,
  _company_state_code TEXT DEFAULT '36'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tax_rates RECORD;
  is_interstate BOOLEAN;
  gst_calculation JSONB;
BEGIN
  -- Get tax rates for HSN code
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
    RETURN jsonb_build_object(
      'error', 'HSN code not found or no active tax rates',
      'cgst_amount', 0,
      'sgst_amount', 0,
      'igst_amount', 0,
      'total_tax', 0
    );
  END IF;
  
  -- Determine if interstate transaction
  is_interstate := (_customer_state_code != _company_state_code);
  
  -- Calculate GST
  IF is_interstate THEN
    gst_calculation := jsonb_build_object(
      'cgst_rate', 0,
      'sgst_rate', 0,
      'igst_rate', tax_rates.igst_rate,
      'cgst_amount', 0,
      'sgst_amount', 0,
      'igst_amount', ROUND((_taxable_amount * tax_rates.igst_rate / 100), 2),
      'total_tax', ROUND((_taxable_amount * tax_rates.igst_rate / 100), 2),
      'is_interstate', true
    );
  ELSE
    gst_calculation := jsonb_build_object(
      'cgst_rate', tax_rates.cgst_rate,
      'sgst_rate', tax_rates.sgst_rate,
      'igst_rate', 0,
      'cgst_amount', ROUND((_taxable_amount * tax_rates.cgst_rate / 100), 2),
      'sgst_amount', ROUND((_taxable_amount * tax_rates.sgst_rate / 100), 2),
      'igst_amount', 0,
      'total_tax', ROUND((_taxable_amount * (tax_rates.cgst_rate + tax_rates.sgst_rate) / 100), 2),
      'is_interstate', false
    );
  END IF;
  
  RETURN gst_calculation;
END;
$$;