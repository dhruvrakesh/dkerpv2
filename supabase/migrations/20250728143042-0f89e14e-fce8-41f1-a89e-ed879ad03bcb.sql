-- Emergency Fix: Update dkpkl_get_dashboard_metrics to work with actual table structure
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
      'completion_percentage', COALESCE(b.completion_percentage, 0)
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
  sample_batch_id uuid := gen_random_uuid();
BEGIN
  -- Get DKEGL organization ID
  SELECT id INTO org_id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1;
  
  -- Only create sample data if no batches exist
  IF NOT EXISTS (SELECT 1 FROM dkpkl_import_batches WHERE organization_id = org_id) THEN
    
    -- Insert sample import batch
    INSERT INTO dkpkl_import_batches (
      id, organization_id, batch_number, file_name, import_type, 
      status, total_rows, processed_rows, completion_percentage,
      file_path, upload_notes
    ) VALUES (
      sample_batch_id, org_id, 'BATCH-SAMPLE-001', 'sample_sales_data.xlsx', 'SALES',
      'completed', 150, 150, 100.0,
      'sample/sales_data.xlsx', 'Sample data for testing dashboard'
    );
    
    -- Insert sample raw rows
    INSERT INTO dkpkl_raw_rows (
      batch_id, row_number, raw_data, processed_data, 
      validation_status, posted_to_erp, posted_at
    ) 
    SELECT 
      sample_batch_id,
      generate_series(1, 150),
      jsonb_build_object(
        'item_name', 'Sample Item ' || generate_series(1, 150),
        'quantity', (random() * 100)::numeric(10,2),
        'rate', (random() * 1000 + 100)::numeric(10,2),
        'date', CURRENT_DATE - (random() * 30)::integer
      ),
      jsonb_build_object(
        'item_code', 'ITEM-' || LPAD(generate_series(1, 150)::text, 3, '0'),
        'processed', true
      ),
      CASE WHEN generate_series(1, 150) % 10 = 0 THEN 'failed' ELSE 'passed' END,
      generate_series(1, 150) % 3 = 0, -- 1/3 posted to ERP
      CASE WHEN generate_series(1, 150) % 3 = 0 THEN now() - (random() * interval '7 days') ELSE NULL END
    ;
    
    -- Insert another sample batch for Purchase
    INSERT INTO dkpkl_import_batches (
      id, organization_id, batch_number, file_name, import_type, 
      status, total_rows, processed_rows, completion_percentage,
      file_path, upload_notes
    ) VALUES (
      gen_random_uuid(), org_id, 'BATCH-SAMPLE-002', 'sample_purchase_data.xlsx', 'PURCHASE',
      'processing', 75, 60, 80.0,
      'sample/purchase_data.xlsx', 'Sample purchase data for testing'
    );
    
  END IF;
END $$;