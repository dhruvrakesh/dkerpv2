-- Create DKPKL Tally import infrastructure
CREATE TYPE dkpkl_import_type AS ENUM ('SALES', 'PURCHASE', 'VOUCHER', 'STOCK', 'PAYROLL');
CREATE TYPE dkpkl_batch_status AS ENUM ('pending', 'processing', 'processed', 'completed', 'failed');

-- Import batches table
CREATE TABLE IF NOT EXISTS dkpkl_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES dkegl_organizations(id),
  import_type dkpkl_import_type NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_path TEXT,
  status dkpkl_batch_status DEFAULT 'pending',
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  warning_rows INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  error_log TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Staging records table
CREATE TABLE IF NOT EXISTS dkpkl_staging_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES dkpkl_import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  raw_data JSONB NOT NULL,
  validation_status TEXT DEFAULT 'pending',
  validation_errors JSONB DEFAULT '[]',
  validation_warnings JSONB DEFAULT '[]',
  is_duplicate BOOLEAN DEFAULT FALSE,
  posted_to_erp BOOLEAN DEFAULT FALSE,
  erp_reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ERP posting log
CREATE TABLE IF NOT EXISTS dkpkl_erp_posting_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES dkegl_organizations(id),
  batch_id UUID REFERENCES dkpkl_import_batches(id),
  staging_record_id UUID REFERENCES dkpkl_staging_records(id),
  target_table TEXT NOT NULL,
  target_record_id UUID,
  posting_type TEXT NOT NULL, -- 'grn', 'issue', 'journal', 'invoice'
  posted_data JSONB,
  posting_status TEXT DEFAULT 'pending',
  error_message TEXT,
  posted_by UUID REFERENCES auth.users(id),
  posted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reconciliation summary view
CREATE OR REPLACE VIEW dkpkl_reconciliation_summary AS
SELECT 
  b.organization_id,
  b.import_type,
  b.period_start,
  b.period_end,
  COUNT(b.id) as total_batches,
  SUM(b.total_rows) as total_import_rows,
  SUM(b.processed_rows) as total_processed_rows,
  SUM(b.error_rows) as total_error_rows,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_batches,
  COUNT(CASE WHEN b.status = 'failed' THEN 1 END) as failed_batches,
  COUNT(epl.id) as total_erp_postings,
  COUNT(CASE WHEN epl.posting_status = 'success' THEN 1 END) as successful_postings,
  COUNT(CASE WHEN epl.posting_status = 'failed' THEN 1 END) as failed_postings
FROM dkpkl_import_batches b
LEFT JOIN dkpkl_erp_posting_log epl ON b.id = epl.batch_id
GROUP BY b.organization_id, b.import_type, b.period_start, b.period_end;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dkpkl_import_batches_org_type ON dkpkl_import_batches(organization_id, import_type);
CREATE INDEX IF NOT EXISTS idx_dkpkl_staging_records_batch ON dkpkl_staging_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_dkpkl_erp_posting_log_batch ON dkpkl_erp_posting_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_dkpkl_staging_records_duplicate ON dkpkl_staging_records(batch_id, is_duplicate);

-- RLS Policies
ALTER TABLE dkpkl_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkpkl_staging_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkpkl_erp_posting_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "DKEGL org members can access import batches" ON dkpkl_import_batches
  FOR ALL USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "DKEGL org members can access staging records" ON dkpkl_staging_records
  FOR ALL USING (EXISTS (
    SELECT 1 FROM dkpkl_import_batches 
    WHERE id = dkpkl_staging_records.batch_id 
    AND organization_id = dkegl_get_current_user_org()
  ));

CREATE POLICY "DKEGL org members can access posting logs" ON dkpkl_erp_posting_log
  FOR ALL USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Storage bucket for Tally imports
INSERT INTO storage.buckets (id, name, public) 
VALUES ('imports-tally', 'imports-tally', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Authenticated users can upload Tally imports" ON storage.objects;
CREATE POLICY "Authenticated users can upload Tally imports" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'imports-tally' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can view their org's Tally imports" ON storage.objects;
CREATE POLICY "Users can view their org's Tally imports" ON storage.objects
  FOR SELECT USING (bucket_id = 'imports-tally' AND auth.role() = 'authenticated');