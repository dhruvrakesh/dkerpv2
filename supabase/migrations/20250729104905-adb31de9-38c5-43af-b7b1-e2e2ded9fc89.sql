-- GST Integration with Correct Table Structure
-- Phase 3: Create proper GST database schema using dkegl_* prefix

-- Create HSN Tax Rates table
CREATE TABLE IF NOT EXISTS public.dkegl_hsn_tax_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.dkegl_organizations(id) ON DELETE CASCADE,
  hsn_code TEXT NOT NULL,
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
  cgst_rate NUMERIC(5,2) GENERATED ALWAYS AS (gst_rate / 2) STORED,
  sgst_rate NUMERIC(5,2) GENERATED ALWAYS AS (gst_rate / 2) STORED,
  igst_rate NUMERIC(5,2) GENERATED ALWAYS AS (gst_rate) STORED,
  description TEXT,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, hsn_code, effective_from)
);

-- Create GST Summary table for documents
CREATE TABLE IF NOT EXISTS public.dkegl_gst_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.dkegl_organizations(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'purchase_order', 'invoice', 'bill'
  document_id UUID NOT NULL,
  subtotal_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_cgst_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_sgst_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_igst_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_cess_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  grand_total_amount NUMERIC(15,2) GENERATED ALWAYS AS (
    subtotal_amount + total_cgst_amount + total_sgst_amount + total_igst_amount + total_cess_amount
  ) STORED,
  line_item_count INTEGER DEFAULT 0,
  gst_summary_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, document_type, document_id)
);

-- Add GST columns to purchase order tables
ALTER TABLE public.dkegl_purchase_orders 
ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cgst_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_sgst_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_igst_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS grand_total_amount NUMERIC(15,2) DEFAULT 0;

-- Add GST columns to PO items
ALTER TABLE public.dkegl_po_items
ADD COLUMN IF NOT EXISTS hsn_code TEXT,
ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) DEFAULT 18.00,
ADD COLUMN IF NOT EXISTS cgst_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS igst_amount NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_with_tax NUMERIC(15,2) DEFAULT 0;

-- Add HSN code to item master
ALTER TABLE public.dkegl_item_master
ADD COLUMN IF NOT EXISTS hsn_code TEXT;

-- Create function to calculate GST amounts
CREATE OR REPLACE FUNCTION public.dkegl_calculate_gst(
  _taxable_amount NUMERIC,
  _gst_rate NUMERIC DEFAULT 18.00,
  _is_inter_state BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  cgst_amount NUMERIC := 0;
  sgst_amount NUMERIC := 0;
  igst_amount NUMERIC := 0;
  total_tax NUMERIC := 0;
BEGIN
  IF _is_inter_state THEN
    -- Inter-state: IGST only
    igst_amount := ROUND((_taxable_amount * _gst_rate / 100), 2);
  ELSE
    -- Intra-state: CGST + SGST
    cgst_amount := ROUND((_taxable_amount * _gst_rate / 200), 2);
    sgst_amount := ROUND((_taxable_amount * _gst_rate / 200), 2);
  END IF;
  
  total_tax := cgst_amount + sgst_amount + igst_amount;
  
  RETURN jsonb_build_object(
    'taxable_amount', _taxable_amount,
    'gst_rate', _gst_rate,
    'cgst_amount', cgst_amount,
    'sgst_amount', sgst_amount,
    'igst_amount', igst_amount,
    'total_tax', total_tax,
    'total_with_tax', _taxable_amount + total_tax
  );
END;
$$;

-- Create function to create GST summary for documents
CREATE OR REPLACE FUNCTION public.dkegl_create_gst_summary(
  _org_id UUID,
  _document_type TEXT,
  _document_id UUID,
  _line_items JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  summary_id UUID;
  total_taxable NUMERIC := 0;
  total_cgst NUMERIC := 0;
  total_sgst NUMERIC := 0;
  total_igst NUMERIC := 0;
  total_cess NUMERIC := 0;
  item_count INTEGER := 0;
BEGIN
  -- Calculate totals from line items
  SELECT 
    COALESCE(SUM((item->>'taxable_amount')::NUMERIC), 0),
    COALESCE(SUM((item->>'cgst_amount')::NUMERIC), 0),
    COALESCE(SUM((item->>'sgst_amount')::NUMERIC), 0),
    COALESCE(SUM((item->>'igst_amount')::NUMERIC), 0),
    COALESCE(SUM((item->>'cess_amount')::NUMERIC), 0),
    jsonb_array_length(_line_items)
  INTO total_taxable, total_cgst, total_sgst, total_igst, total_cess, item_count
  FROM jsonb_array_elements(_line_items) AS item;
  
  -- Insert or update GST summary
  INSERT INTO dkegl_gst_summary (
    organization_id,
    document_type,
    document_id,
    subtotal_amount,
    total_cgst_amount,
    total_sgst_amount,
    total_igst_amount,
    total_cess_amount,
    line_item_count,
    gst_summary_data
  ) VALUES (
    _org_id,
    _document_type,
    _document_id,
    total_taxable,
    total_cgst,
    total_sgst,
    total_igst,
    total_cess,
    item_count,
    jsonb_build_object(
      'line_items', _line_items,
      'created_at', now(),
      'calculation_method', 'standard'
    )
  )
  ON CONFLICT (organization_id, document_type, document_id)
  DO UPDATE SET
    subtotal_amount = EXCLUDED.subtotal_amount,
    total_cgst_amount = EXCLUDED.total_cgst_amount,
    total_sgst_amount = EXCLUDED.total_sgst_amount,
    total_igst_amount = EXCLUDED.total_igst_amount,
    total_cess_amount = EXCLUDED.total_cess_amount,
    line_item_count = EXCLUDED.line_item_count,
    gst_summary_data = EXCLUDED.gst_summary_data,
    updated_at = now()
  RETURNING id INTO summary_id;
  
  RETURN summary_id;
END;
$$;

-- Insert default HSN tax rates for common items
INSERT INTO public.dkegl_hsn_tax_rates (organization_id, hsn_code, gst_rate, description)
SELECT 
  o.id,
  '48' || LPAD((row_number() OVER())::text, 6, '0'),
  CASE 
    WHEN row_number() OVER() % 4 = 1 THEN 5.00
    WHEN row_number() OVER() % 4 = 2 THEN 12.00
    WHEN row_number() OVER() % 4 = 3 THEN 18.00
    ELSE 28.00
  END,
  'Paper and packaging materials - Rate ' || (row_number() OVER() % 4 + 1)
FROM dkegl_organizations o
CROSS JOIN generate_series(1, 10) AS s(i)
ON CONFLICT (organization_id, hsn_code, effective_from) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.dkegl_hsn_tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkegl_gst_summary ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dkegl_hsn_tax_rates_org_hsn ON public.dkegl_hsn_tax_rates(organization_id, hsn_code);
CREATE INDEX IF NOT EXISTS idx_dkegl_gst_summary_org_doc ON public.dkegl_gst_summary(organization_id, document_type, document_id);

COMMENT ON TABLE public.dkegl_hsn_tax_rates IS 'HSN code to GST rate mapping for tax calculations';
COMMENT ON TABLE public.dkegl_gst_summary IS 'GST summary for purchase orders, invoices, and other documents';
COMMENT ON FUNCTION public.dkegl_calculate_gst IS 'Calculate CGST, SGST, or IGST based on taxable amount and rate';
COMMENT ON FUNCTION public.dkegl_create_gst_summary IS 'Create or update GST summary for a document with line items';