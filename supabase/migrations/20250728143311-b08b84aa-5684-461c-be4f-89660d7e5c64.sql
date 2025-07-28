-- Emergency Fix: Update dkpkl_get_dashboard_metrics and create sample data with correct schema
CREATE OR REPLACE FUNCTION public.dkpkl_get_dashboard_metrics(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  result jsonb := '{}'::jsonb;
  total_batches integer := 0;
  completed_batches integer := 0;
  total_records integer := 0;
  posted_records integer := 0;
  completion_rate numeric := 0;
  posting_rate numeric := 0;
  recent_activity jsonb := '[]'::jsonb;
BEGIN
  -- Get batch statistics from dkpkl_import_batches
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COALESCE(SUM(total_rows), 0)
  INTO total_batches, completed_batches, total_records
  FROM dkpkl_import_batches 
  WHERE organization_id = _org_id;
  
  -- Get posted records count from dkpkl_raw_rows
  SELECT COUNT(*) FILTER (WHERE posted_to_erp = true)
  INTO posted_records
  FROM dkpkl_raw_rows r
  JOIN dkpkl_import_batches b ON r.batch_id = b.id
  WHERE b.organization_id = _org_id;
  
  -- Calculate rates
  IF total_batches > 0 THEN
    completion_rate := (completed_batches::numeric / total_batches::numeric) * 100;
  END IF;
  
  IF total_records > 0 THEN
    posting_rate := (posted_records::numeric / total_records::numeric) * 100;
  END IF;
  
  -- Get recent activity (last 10 batches)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'file_name', b.file_name,
      'import_type', b.import_type,
      'status', b.status,
      'total_rows', b.total_rows,
      'created_at', b.created_at,
      'completion_percentage', CASE 
        WHEN b.total_rows > 0 THEN (b.processed_rows::numeric / b.total_rows::numeric) * 100
        ELSE 0 
      END
    ) ORDER BY b.created_at DESC
  )
  INTO recent_activity
  FROM dkpkl_import_batches b
  WHERE b.organization_id = _org_id
  ORDER BY b.created_at DESC
  LIMIT 10;
  
  -- Handle null recent_activity
  IF recent_activity IS NULL THEN
    recent_activity := '[]'::jsonb;
  END IF;
  
  -- Build result
  result := jsonb_build_object(
    'total_batches', total_batches,
    'completed_batches', completed_batches,
    'completion_rate', completion_rate,
    'total_records', total_records,
    'posted_records', posted_records,
    'posting_rate', posting_rate,
    'recent_activity', recent_activity
  );
  
  RETURN result;
END;
$function$;

-- Create sample data for testing if no data exists
DO $$
DECLARE
  org_id uuid;
  sample_batch_id_1 uuid := gen_random_uuid();
  sample_batch_id_2 uuid := gen_random_uuid();
BEGIN
  -- Get DKEGL organization ID
  SELECT id INTO org_id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1;
  
  -- Only create sample data if no batches exist
  IF NOT EXISTS (SELECT 1 FROM dkpkl_import_batches WHERE organization_id = org_id) THEN
    
    -- Insert sample import batch 1 (completed)
    INSERT INTO dkpkl_import_batches (
      id, organization_id, file_name, import_type, 
      period_start, period_end, status, total_rows, processed_rows,
      error_rows, warning_rows, uploaded_by, started_at, completed_at,
      metadata
    ) VALUES (
      sample_batch_id_1, org_id, 'sample_sales_data.xlsx', 'SALES',
      '2024-01-01', '2024-01-31', 'completed', 150, 150,
      0, 5, auth.uid(), now() - interval '2 hours', now() - interval '1 hour',
      '{"description": "Sample sales data for testing dashboard"}'::jsonb
    );
    
    -- Insert sample raw rows for batch 1
    INSERT INTO dkpkl_raw_rows (
      batch_id, row_number, raw_data, processed_data, 
      validation_status, posted_to_erp, posted_at
    ) 
    SELECT 
      sample_batch_id_1,
      generate_series(1, 150),
      jsonb_build_object(
        'item_name', 'Sample Item ' || generate_series(1, 150),
        'quantity', (random() * 100 + 1)::numeric(10,2),
        'rate', (random() * 1000 + 100)::numeric(10,2),
        'date', '2024-01-' || LPAD((random() * 28 + 1)::integer::text, 2, '0')
      ),
      jsonb_build_object(
        'item_code', 'ITEM-' || LPAD(generate_series(1, 150)::text, 3, '0'),
        'processed', true
      ),
      CASE WHEN generate_series(1, 150) % 15 = 0 THEN 'failed' ELSE 'passed' END,
      generate_series(1, 150) % 3 = 0, -- 1/3 posted to ERP
      CASE WHEN generate_series(1, 150) % 3 = 0 THEN now() - (random() * interval '7 days') ELSE NULL END
    ;
    
    -- Insert sample import batch 2 (processing)
    INSERT INTO dkpkl_import_batches (
      id, organization_id, file_name, import_type, 
      period_start, period_end, status, total_rows, processed_rows,
      error_rows, warning_rows, uploaded_by, started_at,
      metadata
    ) VALUES (
      sample_batch_id_2, org_id, 'sample_purchase_data.xlsx', 'PURCHASE',
      '2024-01-01', '2024-01-31', 'processing', 75, 60,
      2, 3, auth.uid(), now() - interval '30 minutes',
      '{"description": "Sample purchase data - currently processing"}'::jsonb
    );
    
    -- Insert sample raw rows for batch 2 (partial)
    INSERT INTO dkpkl_raw_rows (
      batch_id, row_number, raw_data, processed_data, 
      validation_status, posted_to_erp
    ) 
    SELECT 
      sample_batch_id_2,
      generate_series(1, 60),
      jsonb_build_object(
        'vendor_name', 'Vendor ' || (generate_series(1, 60) % 10 + 1),
        'item_name', 'Purchase Item ' || generate_series(1, 60),
        'quantity', (random() * 50 + 1)::numeric(10,2),
        'rate', (random() * 500 + 50)::numeric(10,2)
      ),
      jsonb_build_object(
        'vendor_code', 'VEN-' || LPAD((generate_series(1, 60) % 10 + 1)::text, 3, '0'),
        'processed', true
      ),
      'passed',
      false -- None posted yet as still processing
    ;
    
  END IF;
END $$;