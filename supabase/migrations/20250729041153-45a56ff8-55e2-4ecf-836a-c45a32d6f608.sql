-- Phase 1: Create the missing record tables for enterprise Tally reporting

-- Create sales records table for finalized, validated sales data
CREATE TABLE IF NOT EXISTS dkpkl_sales_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  batch_id UUID NOT NULL REFERENCES dkpkl_import_batches(id),
  voucher_number TEXT NOT NULL,
  voucher_date DATE NOT NULL,
  party_name TEXT NOT NULL,
  amount NUMERIC(15,2) DEFAULT 0,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) NOT NULL,
  item_details JSONB DEFAULT '{}',
  gst_details JSONB DEFAULT '{}',
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid', 'warning')),
  validation_errors JSONB DEFAULT '[]',
  posted_to_erp BOOLEAN DEFAULT FALSE,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create purchase records table for finalized, validated purchase data
CREATE TABLE IF NOT EXISTS dkpkl_purchase_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  batch_id UUID NOT NULL REFERENCES dkpkl_import_batches(id),
  voucher_number TEXT NOT NULL,
  voucher_date DATE NOT NULL,
  vendor_name TEXT NOT NULL,
  amount NUMERIC(15,2) DEFAULT 0,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) NOT NULL,
  item_details JSONB DEFAULT '{}',
  gst_details JSONB DEFAULT '{}',
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid', 'warning')),
  validation_errors JSONB DEFAULT '[]',
  posted_to_erp BOOLEAN DEFAULT FALSE,
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dkpkl_sales_records_org_date ON dkpkl_sales_records(organization_id, voucher_date);
CREATE INDEX IF NOT EXISTS idx_dkpkl_sales_records_batch ON dkpkl_sales_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_dkpkl_sales_records_customer ON dkpkl_sales_records(organization_id, party_name);

CREATE INDEX IF NOT EXISTS idx_dkpkl_purchase_records_org_date ON dkpkl_purchase_records(organization_id, voucher_date);
CREATE INDEX IF NOT EXISTS idx_dkpkl_purchase_records_batch ON dkpkl_purchase_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_dkpkl_purchase_records_vendor ON dkpkl_purchase_records(organization_id, vendor_name);

-- Add RLS policies
ALTER TABLE dkpkl_sales_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkpkl_purchase_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can access sales records" ON dkpkl_sales_records
  FOR ALL USING (organization_id = dkegl_get_current_user_org());

CREATE POLICY "Organization members can access purchase records" ON dkpkl_purchase_records
  FOR ALL USING (organization_id = dkegl_get_current_user_org());

-- Function to migrate staging data to records tables
CREATE OR REPLACE FUNCTION dkpkl_migrate_staging_to_records(_batch_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  batch_info RECORD;
  sales_count INTEGER := 0;
  purchase_count INTEGER := 0;
  result JSON;
BEGIN
  -- Get batch information
  SELECT * INTO batch_info FROM dkpkl_import_batches WHERE id = _batch_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Batch not found');
  END IF;

  -- Migrate based on import type
  IF batch_info.import_type = 'SALES' THEN
    -- Migrate sales staging to sales records
    INSERT INTO dkpkl_sales_records (
      organization_id, batch_id, voucher_number, voucher_date, 
      party_name, amount, tax_amount, total_amount, item_details, 
      gst_details, validation_status
    )
    SELECT 
      batch_info.organization_id,
      _batch_id,
      COALESCE(raw_data->>'voucher_number', 'UNKNOWN'),
      COALESCE((raw_data->>'voucher_date')::DATE, CURRENT_DATE),
      COALESCE(raw_data->>'party_name', 'Unknown Customer'),
      COALESCE((raw_data->>'amount')::NUMERIC, 0),
      COALESCE((raw_data->>'tax_amount')::NUMERIC, 0),
      COALESCE((raw_data->>'total_amount')::NUMERIC, (raw_data->>'amount')::NUMERIC),
      COALESCE(raw_data->'item_details', '{}'),
      COALESCE(raw_data->'gst_details', '{}'),
      CASE 
        WHEN validation_status = 'valid' THEN 'valid'
        WHEN validation_status = 'invalid' THEN 'invalid'
        ELSE 'warning'
      END
    FROM dkpkl_sales_staging 
    WHERE batch_id = _batch_id;
    
    GET DIAGNOSTICS sales_count = ROW_COUNT;
    
  ELSIF batch_info.import_type = 'PURCHASE' THEN
    -- Migrate purchase staging to purchase records
    INSERT INTO dkpkl_purchase_records (
      organization_id, batch_id, voucher_number, voucher_date, 
      vendor_name, amount, tax_amount, total_amount, item_details, 
      gst_details, validation_status
    )
    SELECT 
      batch_info.organization_id,
      _batch_id,
      COALESCE(raw_data->>'voucher_number', 'UNKNOWN'),
      COALESCE((raw_data->>'voucher_date')::DATE, CURRENT_DATE),
      COALESCE(raw_data->>'vendor_name', 'Unknown Vendor'),
      COALESCE((raw_data->>'amount')::NUMERIC, 0),
      COALESCE((raw_data->>'tax_amount')::NUMERIC, 0),
      COALESCE((raw_data->>'total_amount')::NUMERIC, (raw_data->>'amount')::NUMERIC),
      COALESCE(raw_data->'item_details', '{}'),
      COALESCE(raw_data->'gst_details', '{}'),
      CASE 
        WHEN validation_status = 'valid' THEN 'valid'
        WHEN validation_status = 'invalid' THEN 'invalid'
        ELSE 'warning'
      END
    FROM dkpkl_purchase_staging 
    WHERE batch_id = _batch_id;
    
    GET DIAGNOSTICS purchase_count = ROW_COUNT;
  END IF;

  -- Update batch status
  UPDATE dkpkl_import_batches 
  SET 
    status = 'processed',
    processed_rows = COALESCE(sales_count + purchase_count, 0),
    updated_at = NOW()
  WHERE id = _batch_id;

  SELECT json_build_object(
    'success', true,
    'batch_id', _batch_id,
    'import_type', batch_info.import_type,
    'sales_records', sales_count,
    'purchase_records', purchase_count,
    'total_migrated', sales_count + purchase_count
  ) INTO result;

  RETURN result;
END;
$$;