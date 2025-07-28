-- DKPKL (Tally Integration) Schema Foundation
-- Phase 1: Create all foundational tables and structures

-- Create enum for import types
CREATE TYPE dkpkl_import_type AS ENUM ('SALES', 'PURCHASE', 'VOUCHER', 'STOCK', 'PAYROLL');

-- Create import batches table (main tracking table)
CREATE TABLE public.dkpkl_import_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL DEFAULT dkegl_get_current_user_org(),
  file_name TEXT NOT NULL,
  import_type dkpkl_import_type NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded',
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  warning_rows INTEGER DEFAULT 0,
  file_size INTEGER,
  file_hash TEXT,
  uploaded_by UUID DEFAULT auth.uid(),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_log TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create raw rows table (stores unparsed Excel data)
CREATE TABLE public.dkpkl_raw_rows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.dkpkl_import_batches(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL DEFAULT dkegl_get_current_user_org(),
  row_number INTEGER NOT NULL,
  row_data JSONB NOT NULL,
  parsed_status TEXT DEFAULT 'pending',
  validation_errors JSONB DEFAULT '[]',
  validation_warnings JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales staging table (for parsed sales vouchers)
CREATE TABLE public.dkpkl_sales_staging (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.dkpkl_import_batches(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL DEFAULT dkegl_get_current_user_org(),
  raw_row_id UUID REFERENCES public.dkpkl_raw_rows(id),
  voucher_number TEXT,
  voucher_date DATE,
  party_name TEXT,
  item_name TEXT,
  item_code TEXT,
  quantity NUMERIC,
  unit_rate NUMERIC,
  total_amount NUMERIC,
  tax_amount NUMERIC,
  cgst_amount NUMERIC DEFAULT 0,
  sgst_amount NUMERIC DEFAULT 0,
  igst_amount NUMERIC DEFAULT 0,
  gst_rate NUMERIC,
  hsn_code TEXT,
  invoice_number TEXT,
  eway_bill_number TEXT,
  einvoice_number TEXT,
  validation_status TEXT DEFAULT 'pending',
  validation_errors JSONB DEFAULT '[]',
  posting_status TEXT DEFAULT 'pending',
  posted_to_erp_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase staging table (for parsed purchase vouchers)
CREATE TABLE public.dkpkl_purchase_staging (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.dkpkl_import_batches(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL DEFAULT dkegl_get_current_user_org(),
  raw_row_id UUID REFERENCES public.dkpkl_raw_rows(id),
  voucher_number TEXT,
  voucher_date DATE,
  supplier_name TEXT,
  item_name TEXT,
  item_code TEXT,
  quantity NUMERIC,
  unit_rate NUMERIC,
  total_amount NUMERIC,
  tax_amount NUMERIC,
  cgst_amount NUMERIC DEFAULT 0,
  sgst_amount NUMERIC DEFAULT 0,
  igst_amount NUMERIC DEFAULT 0,
  gst_rate NUMERIC,
  hsn_code TEXT,
  invoice_number TEXT,
  invoice_date DATE,
  validation_status TEXT DEFAULT 'pending',
  validation_errors JSONB DEFAULT '[]',
  posting_status TEXT DEFAULT 'pending',
  posted_to_erp_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ledger staging table (for journal entries)
CREATE TABLE public.dkpkl_ledger_staging (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.dkpkl_import_batches(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL DEFAULT dkegl_get_current_user_org(),
  raw_row_id UUID REFERENCES public.dkpkl_raw_rows(id),
  voucher_number TEXT,
  voucher_date DATE,
  ledger_name TEXT,
  account_code TEXT,
  debit_amount NUMERIC DEFAULT 0,
  credit_amount NUMERIC DEFAULT 0,
  narration TEXT,
  reference_number TEXT,
  validation_status TEXT DEFAULT 'pending',
  validation_errors JSONB DEFAULT '[]',
  posting_status TEXT DEFAULT 'pending',
  posted_to_erp_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock staging table (for stock journal entries)
CREATE TABLE public.dkpkl_stock_staging (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.dkpkl_import_batches(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL DEFAULT dkegl_get_current_user_org(),
  raw_row_id UUID REFERENCES public.dkpkl_raw_rows(id),
  voucher_number TEXT,
  voucher_date DATE,
  item_name TEXT,
  item_code TEXT,
  godown_name TEXT,
  quantity_in NUMERIC DEFAULT 0,
  quantity_out NUMERIC DEFAULT 0,
  unit_rate NUMERIC,
  total_value NUMERIC,
  batch_number TEXT,
  validation_status TEXT DEFAULT 'pending',
  validation_errors JSONB DEFAULT '[]',
  posting_status TEXT DEFAULT 'pending',
  posted_to_erp_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reconciliation log table
CREATE TABLE public.dkpkl_reconciliation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL DEFAULT dkegl_get_current_user_org(),
  batch_id UUID REFERENCES public.dkpkl_import_batches(id),
  reconciliation_type TEXT NOT NULL, -- 'duplicate_check', 'account_mapping', 'gst_validation'
  source_table TEXT, -- which staging table
  source_record_id UUID,
  target_table TEXT, -- which ERP table
  target_record_id UUID,
  status TEXT DEFAULT 'pending', -- 'matched', 'duplicate', 'missing', 'error'
  confidence_score NUMERIC DEFAULT 0,
  reconciliation_data JSONB DEFAULT '{}',
  notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create account mapping table (Tally accounts to DKEGL accounts)
CREATE TABLE public.dkpkl_account_mapping (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL DEFAULT dkegl_get_current_user_org(),
  tally_account_name TEXT NOT NULL,
  tally_account_code TEXT,
  dkegl_account_code TEXT,
  dkegl_ledger_type TEXT, -- 'asset', 'liability', 'income', 'expense'
  mapping_confidence NUMERIC DEFAULT 100,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  mapping_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, tally_account_name)
);

-- Enable RLS on all tables
ALTER TABLE public.dkpkl_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkpkl_raw_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkpkl_sales_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkpkl_purchase_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkpkl_ledger_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkpkl_stock_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkpkl_reconciliation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkpkl_account_mapping ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for organization access
CREATE POLICY "Organization members can access import batches" 
ON public.dkpkl_import_batches 
FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "Organization members can access raw rows" 
ON public.dkpkl_raw_rows 
FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "Organization members can access sales staging" 
ON public.dkpkl_sales_staging 
FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "Organization members can access purchase staging" 
ON public.dkpkl_purchase_staging 
FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "Organization members can access ledger staging" 
ON public.dkpkl_ledger_staging 
FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "Organization members can access stock staging" 
ON public.dkpkl_stock_staging 
FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "Organization members can access reconciliation log" 
ON public.dkpkl_reconciliation_log 
FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "Organization members can access account mapping" 
ON public.dkpkl_account_mapping 
FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Create indexes for performance
CREATE INDEX idx_dkpkl_import_batches_org_type ON public.dkpkl_import_batches(organization_id, import_type);
CREATE INDEX idx_dkpkl_raw_rows_batch ON public.dkpkl_raw_rows(batch_id);
CREATE INDEX idx_dkpkl_sales_staging_batch ON public.dkpkl_sales_staging(batch_id);
CREATE INDEX idx_dkpkl_purchase_staging_batch ON public.dkpkl_purchase_staging(batch_id);
CREATE INDEX idx_dkpkl_ledger_staging_batch ON public.dkpkl_ledger_staging(batch_id);
CREATE INDEX idx_dkpkl_stock_staging_batch ON public.dkpkl_stock_staging(batch_id);
CREATE INDEX idx_dkpkl_reconciliation_batch ON public.dkpkl_reconciliation_log(batch_id);

-- Create storage bucket for Tally imports
INSERT INTO storage.buckets (id, name, public) VALUES ('imports-tally', 'imports-tally', false);

-- Create storage policies for Tally imports
CREATE POLICY "Authenticated users can upload Tally files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'imports-tally' AND auth.uid() IS NOT NULL);

CREATE POLICY "Organization members can view their Tally files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'imports-tally' AND auth.uid() IS NOT NULL);

CREATE POLICY "Organization members can update their Tally files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'imports-tally' AND auth.uid() IS NOT NULL);

CREATE POLICY "Organization members can delete their Tally files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'imports-tally' AND auth.uid() IS NOT NULL);

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.dkpkl_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dkpkl_import_batches_timestamp
  BEFORE UPDATE ON public.dkpkl_import_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.dkpkl_update_timestamp();

CREATE TRIGGER update_dkpkl_account_mapping_timestamp
  BEFORE UPDATE ON public.dkpkl_account_mapping
  FOR EACH ROW
  EXECUTE FUNCTION public.dkpkl_update_timestamp();