-- Create sample workflow progress entries for testing
INSERT INTO dkegl_workflow_progress (
  organization_id,
  order_id,
  stage_id,
  status,
  progress_percentage,
  stage_data,
  quality_status,
  notes
) VALUES (
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  (SELECT id FROM dkegl_orders LIMIT 1),
  (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing' LIMIT 1),
  'in_progress',
  65,
  '{"setup_parameters": {"cylinder_pressure": "45", "ink_viscosity": "18", "printing_speed": "120"}, "started_by": "system", "start_time": "2025-01-25T10:00:00Z"}',
  'pending',
  'Sample printing job in progress'
);

-- Insert more workflow progress entries for different stages
INSERT INTO dkegl_workflow_progress (
  organization_id,
  order_id,
  stage_id,
  status,
  progress_percentage,
  stage_data,
  quality_status,
  notes
) VALUES 
(
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  (SELECT id FROM dkegl_orders LIMIT 1),
  (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Slitting & Packaging' LIMIT 1),
  'pending',
  0,
  '{}',
  'pending',
  'Awaiting completion of printing stage'
),
(
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  (SELECT id FROM dkegl_orders LIMIT 1),
  (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Lamination & Coating' LIMIT 1),
  'completed',
  100,
  '{"lamination_type": "BOPP", "coating_applied": true, "completed_by": "system", "completion_time": "2025-01-24T15:30:00Z"}',
  'passed',
  'Lamination completed successfully'
);

-- Create sample quality inspections
INSERT INTO dkegl_quality_inspections (
  organization_id,
  order_id,
  stage_id,
  template_id,
  inspector_id,
  inspection_date,
  overall_result,
  inspection_results,
  defects_found,
  corrective_actions,
  remarks
) VALUES 
(
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  (SELECT id FROM dkegl_orders LIMIT 1),
  (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing' LIMIT 1),
  (SELECT id FROM dkegl_quality_templates WHERE template_name = 'Printing Quality Check' LIMIT 1),
  (SELECT id FROM dkegl_user_profiles WHERE organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1) LIMIT 1),
  CURRENT_DATE,
  'passed',
  '{"print_quality": "excellent", "color_accuracy": "95%", "registration": "within_tolerance", "density": "optimal"}',
  '[]',
  '[]',
  'All parameters within acceptable range'
),
(
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  (SELECT id FROM dkegl_orders LIMIT 1),
  (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Lamination & Coating' LIMIT 1),
  (SELECT id FROM dkegl_quality_templates WHERE template_name = 'Lamination Quality Check' LIMIT 1),
  (SELECT id FROM dkegl_user_profiles WHERE organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1) LIMIT 1),
  CURRENT_DATE - INTERVAL '1 day',
  'failed',
  '{"adhesion_strength": "poor", "coating_thickness": "uneven", "surface_defects": "bubbling_detected"}',
  '["Surface bubbling in coating", "Uneven adhesion at edges"]',
  '["Recoat affected areas", "Adjust temperature settings"]',
  'Coating defects require rework'
);

-- Create sample production metrics
INSERT INTO dkegl_production_metrics (
  organization_id,
  stage_id,
  metric_date,
  metric_type,
  metric_value,
  target_value,
  unit_of_measure,
  additional_data
) VALUES 
(
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Gravure Printing' LIMIT 1),
  CURRENT_DATE,
  'efficiency',
  85.5,
  90.0,
  'percentage',
  '{"downtime_minutes": 45, "production_rate": "120_mpm", "quality_rate": "98.2%"}'
),
(
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Slitting & Packaging' LIMIT 1),
  CURRENT_DATE,
  'throughput',
  2400.0,
  2500.0,
  'meters_per_hour',
  '{"setup_time": "25_minutes", "changeover_time": "15_minutes", "waste_percentage": "2.1%"}'
),
(
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  (SELECT id FROM dkegl_workflow_stages WHERE stage_name = 'Lamination & Coating' LIMIT 1),
  CURRENT_DATE - INTERVAL '1 day',
  'quality_rate',
  96.8,
  98.0,
  'percentage',
  '{"defect_rate": "3.2%", "rework_rate": "1.5%", "first_pass_yield": "95.3%"}'
);

-- Update existing order with current timestamp for better analytics
UPDATE dkegl_orders 
SET updated_at = CURRENT_TIMESTAMP
WHERE id = (SELECT id FROM dkegl_orders LIMIT 1);