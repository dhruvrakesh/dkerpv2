-- Create sample data for testing the system (fixed syntax)

-- Insert sample orders for testing
INSERT INTO dkegl_orders (organization_id, order_number, uiorn, item_code, item_name, order_quantity, status, delivery_date, priority_level, specifications, created_by)
SELECT 
  org.id,
  'PO-' || LPAD(series::text, 4, '0'),
  'UIORN-' || LPAD(series::text, 4, '0'),
  'TAPE-' || LPAD(series::text, 3, '0'),
  CASE 
    WHEN series % 3 = 1 THEN 'Premium Tape Roll - 24mm'
    WHEN series % 3 = 2 THEN 'Standard Label Set - 50x25mm'
    ELSE 'Custom Packaging Film - 200mic'
  END,
  1000 + series * 100,
  CASE 
    WHEN series % 4 = 1 THEN 'draft'::dkegl_order_status
    WHEN series % 4 = 2 THEN 'approved'::dkegl_order_status
    WHEN series % 4 = 3 THEN 'in_production'::dkegl_order_status
    ELSE 'completed'::dkegl_order_status
  END,
  CURRENT_DATE + INTERVAL '30 days',
  CASE WHEN series % 3 = 1 THEN 1 ELSE 3 END,
  jsonb_build_object(
    'substrate', 'BOPP',
    'thickness', '50 micron',
    'width', '24mm',
    'colors', 4
  ),
  (SELECT user_id FROM dkegl_user_profiles WHERE organization_id = org.id LIMIT 1)
FROM dkegl_organizations org, generate_series(1, 10) as series
WHERE org.code = 'DKEGL'
ON CONFLICT DO NOTHING;

-- Insert workflow progress for orders
INSERT INTO dkegl_workflow_progress (organization_id, order_id, stage_id, status, progress_percentage, started_at, stage_data)
SELECT 
  orders.organization_id,
  orders.id,
  stages.id,
  CASE 
    WHEN stages.stage_order <= 2 THEN 'completed'
    WHEN stages.stage_order = 3 THEN 'in_progress'
    ELSE 'pending'
  END,
  CASE 
    WHEN stages.stage_order <= 2 THEN 100
    WHEN stages.stage_order = 3 THEN 65
    ELSE 0
  END,
  CASE 
    WHEN stages.stage_order <= 3 THEN NOW() - INTERVAL '1 day' * (4 - stages.stage_order)
    ELSE NULL
  END,
  jsonb_build_object(
    'operator', 'John Smith',
    'machine_id', 'MC-' || stages.stage_order,
    'batch_number', 'B' || EXTRACT(DOY FROM NOW())::text || '-' || orders.id::text
  )
FROM dkegl_orders orders, dkegl_workflow_stages stages
WHERE orders.organization_id = stages.organization_id
  AND orders.status IN ('in_production', 'completed')
ON CONFLICT DO NOTHING;

-- Insert quality inspections
INSERT INTO dkegl_quality_inspections (organization_id, order_id, stage_id, template_id, overall_result, inspection_date, inspector_id, inspection_results, remarks)
SELECT 
  wp.organization_id,
  wp.order_id,
  wp.stage_id,
  qt.id,
  CASE 
    WHEN RANDOM() > 0.8 THEN 'failed'
    WHEN RANDOM() > 0.6 THEN 'in_review'
    ELSE 'passed'
  END,
  wp.started_at + INTERVAL '2 hours',
  (SELECT user_id FROM dkegl_user_profiles WHERE organization_id = wp.organization_id LIMIT 1),
  jsonb_build_object(
    'thickness', (0.45 + RANDOM() * 0.15)::numeric(4,2) || 'mm',
    'width', (23.8 + RANDOM() * 0.4)::numeric(4,1) || 'mm',
    'color_accuracy', (95 + RANDOM() * 5)::integer || '%'
  ),
  CASE 
    WHEN RANDOM() > 0.5 THEN 'Quality check completed as per standard procedure'
    ELSE 'Minor variations noted, within acceptable tolerance'
  END
FROM dkegl_workflow_progress wp, dkegl_quality_templates qt
WHERE wp.organization_id = qt.organization_id
  AND wp.status IN ('completed', 'in_progress')
ON CONFLICT DO NOTHING;