-- Emergency Fix: Update dkpkl_get_dashboard_metrics function (working version)
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
  SELECT COALESCE(COUNT(*) FILTER (WHERE posted_to_erp = true), 0)
  INTO posted_records
  FROM dkpkl_raw_rows r
  WHERE r.organization_id = _org_id;
  
  -- Calculate rates
  IF total_batches > 0 THEN
    completion_rate := (completed_batches::numeric / total_batches::numeric) * 100;
  END IF;
  
  IF total_records > 0 THEN
    posting_rate := (posted_records::numeric / total_records::numeric) * 100;
  END IF;
  
  -- Get recent activity (last 10 batches)
  SELECT COALESCE(jsonb_agg(
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
  ), '[]'::jsonb)
  INTO recent_activity
  FROM dkpkl_import_batches b
  WHERE b.organization_id = _org_id
  ORDER BY b.created_at DESC
  LIMIT 10;
  
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

-- Create minimal sample data for testing
DO $$
DECLARE
  org_id uuid;
  sample_batch_id uuid := gen_random_uuid();
  current_user_id uuid;
  i integer;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Get DKEGL organization ID
  SELECT id INTO org_id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1;
  
  -- Only create sample data if no batches exist and org exists
  IF NOT EXISTS (SELECT 1 FROM dkpkl_import_batches WHERE organization_id = org_id) AND org_id IS NOT NULL THEN
    
    -- Insert sample import batch
    INSERT INTO dkpkl_import_batches (
      id, organization_id, file_name, import_type, 
      period_start, period_end, status, total_rows, processed_rows,
      error_rows, warning_rows, uploaded_by, started_at, completed_at,
      metadata
    ) VALUES (
      sample_batch_id, org_id, 'sample_sales_data.xlsx', 'SALES',
      '2024-01-01', '2024-01-31', 'completed', 100, 100,
      0, 0, current_user_id, now() - interval '2 hours', now() - interval '1 hour',
      '{"description": "Sample sales data for dashboard testing", "source": "demo"}'::jsonb
    );
    
    -- Insert sample raw rows using a loop
    FOR i IN 1..100 LOOP
      INSERT INTO dkpkl_raw_rows (
        batch_id, organization_id, row_number, row_data, 
        parsed_status, posted_to_erp, posted_at
      ) VALUES (
        sample_batch_id,
        org_id,
        i,
        jsonb_build_object(
          'item_name', 'Sample Item ' || i,
          'quantity', (50 + (i % 100))::numeric,
          'rate', (100 + (i * 10))::numeric,
          'date', '2024-01-15',
          'party_name', 'Customer ' || ((i % 10) + 1)
        ),
        'processed',
        (i % 3 = 0), -- Every 3rd record posted to ERP
        CASE WHEN (i % 3 = 0) THEN now() - interval '1 day' ELSE NULL END
      );
    END LOOP;
    
  END IF;
END $$;