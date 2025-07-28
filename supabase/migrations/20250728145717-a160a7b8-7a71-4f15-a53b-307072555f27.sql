-- Fix the parameterized dkpkl_get_dashboard_metrics function with GROUP BY and column errors
CREATE OR REPLACE FUNCTION public.dkpkl_get_dashboard_metrics(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_batches INTEGER := 0;
  completed_batches INTEGER := 0;
  completion_rate NUMERIC := 0;
  total_records INTEGER := 0;
  posted_records INTEGER := 0;
  posting_rate NUMERIC := 0;
  recent_activity jsonb := '[]'::jsonb;
BEGIN
  -- Get batch statistics
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed')
  INTO total_batches, completed_batches
  FROM dkpkl_import_batches 
  WHERE organization_id = _org_id;
  
  -- Calculate completion rate
  IF total_batches > 0 THEN
    completion_rate := (completed_batches::NUMERIC / total_batches) * 100;
  END IF;
  
  -- Get record statistics - fix column reference from 'status' to 'posting_status'
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE posting_status = 'posted')
  INTO total_records, posted_records
  FROM dkpkl_raw_rows 
  WHERE organization_id = _org_id;
  
  -- Calculate posting rate
  IF total_records > 0 THEN
    posting_rate := (posted_records::NUMERIC / total_records) * 100;
  END IF;
  
  -- Get recent activity (last 10 batches) - fix GROUP BY issue
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', batch_data.id,
      'file_name', batch_data.file_name,
      'import_type', batch_data.import_type,
      'status', batch_data.status,
      'total_records', batch_data.total_records,
      'created_at', batch_data.created_at
    ) ORDER BY batch_data.created_at DESC
  ), '[]'::jsonb)
  INTO recent_activity
  FROM (
    SELECT id, file_name, import_type, status, total_records, created_at 
    FROM dkpkl_import_batches 
    WHERE organization_id = _org_id
    ORDER BY created_at DESC 
    LIMIT 10
  ) batch_data;
  
  -- Create sample data if no batches exist
  IF total_batches = 0 THEN
    INSERT INTO dkpkl_import_batches (organization_id, file_name, import_type, status, total_records, file_path)
    VALUES 
      (_org_id, 'sample_vouchers.xlsx', 'vouchers', 'completed', 150, '/uploads/sample_vouchers.xlsx'),
      (_org_id, 'sample_items.xlsx', 'items', 'processing', 75, '/uploads/sample_items.xlsx');
      
    -- Recalculate with sample data
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE status = 'completed')
    INTO total_batches, completed_batches
    FROM dkpkl_import_batches 
    WHERE organization_id = _org_id;
    
    IF total_batches > 0 THEN
      completion_rate := (completed_batches::NUMERIC / total_batches) * 100;
    END IF;
    
    -- Update recent activity with new sample data
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', batch_data.id,
        'file_name', batch_data.file_name,
        'import_type', batch_data.import_type,
        'status', batch_data.status,
        'total_records', batch_data.total_records,
        'created_at', batch_data.created_at
      ) ORDER BY batch_data.created_at DESC
    ), '[]'::jsonb)
    INTO recent_activity
    FROM (
      SELECT id, file_name, import_type, status, total_records, created_at 
      FROM dkpkl_import_batches 
      WHERE organization_id = _org_id
      ORDER BY created_at DESC 
      LIMIT 10
    ) batch_data;
  END IF;
  
  RETURN jsonb_build_object(
    'totalBatches', total_batches,
    'completedBatches', completed_batches,
    'completionRate', completion_rate,
    'totalRecords', total_records,
    'postedRecords', posted_records,
    'postingRate', posting_rate,
    'recentActivity', recent_activity
  );
END;
$$;