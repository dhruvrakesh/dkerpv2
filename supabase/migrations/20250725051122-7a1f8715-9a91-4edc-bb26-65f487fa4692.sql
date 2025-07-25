-- Create sample data for testing the system

-- Insert sample orders for testing
INSERT INTO dkegl_orders (organization_id, order_number, uiorn, item_code, item_name, order_quantity, status, delivery_date, priority_level, specifications, created_by)
SELECT 
  org.id,
  'PO-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
  'UIORN-' || LPAD((ROW_NUMBER() OVER())::text, 4, '0'),
  'TAPE-' || LPAD((ROW_NUMBER() OVER())::text, 3, '0'),
  CASE 
    WHEN ROW_NUMBER() OVER() % 3 = 1 THEN 'Premium Tape Roll - 24mm'
    WHEN ROW_NUMBER() OVER() % 3 = 2 THEN 'Standard Label Set - 50x25mm'
    ELSE 'Custom Packaging Film - 200mic'
  END,
  1000 + (ROW_NUMBER() OVER()) * 100,
  CASE 
    WHEN ROW_NUMBER() OVER() % 4 = 1 THEN 'draft'::dkegl_order_status
    WHEN ROW_NUMBER() OVER() % 4 = 2 THEN 'approved'::dkegl_order_status
    WHEN ROW_NUMBER() OVER() % 4 = 3 THEN 'in_production'::dkegl_order_status
    ELSE 'completed'::dkegl_order_status
  END,
  CURRENT_DATE + INTERVAL '30 days',
  CASE WHEN ROW_NUMBER() OVER() % 3 = 1 THEN 1 ELSE 3 END,
  jsonb_build_object(
    'substrate', 'BOPP',
    'thickness', '50 micron',
    'width', '24mm',
    'colors', 4
  ),
  (SELECT user_id FROM dkegl_user_profiles WHERE organization_id = org.id LIMIT 1)
FROM dkegl_organizations org 
WHERE org.code = 'DKEGL'
CROSS JOIN generate_series(1, 10) as series
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
FROM dkegl_orders orders
CROSS JOIN dkegl_workflow_stages stages
WHERE orders.organization_id = stages.organization_id
  AND orders.status IN ('in_production', 'completed')
ON CONFLICT DO NOTHING;

-- Insert quality inspections
INSERT INTO dkegl_quality_inspections (organization_id, order_id, stage_id, template_id, status, inspection_date, inspector_id, inspection_data, remarks)
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
    'check_type', CASE 
      WHEN qt.template_name ILIKE '%dimensional%' THEN 'dimensional'
      WHEN qt.template_name ILIKE '%visual%' THEN 'visual'
      WHEN qt.template_name ILIKE '%material%' THEN 'material'
      ELSE 'functional'
    END,
    'measurements', jsonb_build_object(
      'thickness', (0.45 + RANDOM() * 0.15)::numeric(4,2) || 'mm',
      'width', (23.8 + RANDOM() * 0.4)::numeric(4,1) || 'mm',
      'color_accuracy', (95 + RANDOM() * 5)::integer || '%'
    ),
    'defects', CASE 
      WHEN RANDOM() > 0.7 THEN jsonb_build_array('Minor color variation', 'Edge roughness')
      ELSE jsonb_build_array()
    END
  ),
  CASE 
    WHEN RANDOM() > 0.5 THEN 'Quality check completed as per standard procedure'
    ELSE 'Minor variations noted, within acceptable tolerance'
  END
FROM dkegl_workflow_progress wp
LEFT JOIN dkegl_quality_templates qt ON qt.organization_id = wp.organization_id
WHERE wp.status IN ('completed', 'in_progress')
  AND qt.id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Insert production metrics
INSERT INTO dkegl_production_metrics (organization_id, stage_id, metric_date, orders_processed, total_production_time, efficiency_percentage, waste_percentage, quality_pass_rate, cost_per_unit)
SELECT 
  org.id,
  stages.id,
  CURRENT_DATE - generate_series(0, 29),
  (3 + FLOOR(RANDOM() * 8))::integer,
  (6.0 + RANDOM() * 4.0)::numeric(5,2),
  (80.0 + RANDOM() * 15.0)::numeric(5,2),
  (2.0 + RANDOM() * 6.0)::numeric(4,2),
  (90.0 + RANDOM() * 8.0)::numeric(5,2),
  (150.0 + RANDOM() * 100.0)::numeric(8,2)
FROM dkegl_organizations org
CROSS JOIN dkegl_workflow_stages stages
WHERE org.code = 'DKEGL' 
  AND stages.organization_id = org.id
ON CONFLICT DO NOTHING;

-- Insert stage performance data
INSERT INTO dkegl_stage_performance (organization_id, stage_id, performance_date, orders_processed, avg_processing_time_hours, avg_efficiency_percentage, total_waste_percentage, quality_pass_rate, bottleneck_score, resource_utilization)
SELECT 
  org.id,
  stages.id,
  CURRENT_DATE - generate_series(0, 30),
  (2 + FLOOR(RANDOM() * 6))::integer,
  (4.0 + RANDOM() * 8.0)::numeric(5,2),
  (75.0 + RANDOM() * 20.0)::numeric(5,2),
  (1.0 + RANDOM() * 8.0)::numeric(4,2),
  (85.0 + RANDOM() * 12.0)::numeric(5,2),
  (20.0 + RANDOM() * 60.0)::numeric(5,2),
  (60.0 + RANDOM() * 35.0)::numeric(5,2)
FROM dkegl_organizations org
CROSS JOIN dkegl_workflow_stages stages
WHERE org.code = 'DKEGL' 
  AND stages.organization_id = org.id
ON CONFLICT DO NOTHING;