-- Create minimal sample data for testing

-- Insert 3 simple orders
INSERT INTO dkegl_orders (organization_id, order_number, uiorn, item_code, item_name, order_quantity, status, delivery_date, priority_level, specifications, created_by)
SELECT 
  org.id,
  'PO-001',
  'UIORN-001',
  'TAPE-001',
  'Premium Tape Roll - 24mm',
  1000,
  'in_production'::dkegl_order_status,
  CURRENT_DATE + INTERVAL '30 days',
  1,
  jsonb_build_object('substrate', 'BOPP', 'thickness', '50 micron'),
  (SELECT user_id FROM dkegl_user_profiles WHERE organization_id = org.id LIMIT 1)
FROM dkegl_organizations org 
WHERE org.code = 'DKEGL'
ON CONFLICT DO NOTHING;

-- Insert quality inspections for existing orders/stages
INSERT INTO dkegl_quality_inspections (organization_id, order_id, stage_id, template_id, overall_result, inspection_date, inspector_id, inspection_results, remarks)
SELECT 
  o.organization_id,
  o.id,
  s.id,
  qt.id,
  'passed',
  NOW() - INTERVAL '1 hour',
  (SELECT user_id FROM dkegl_user_profiles WHERE organization_id = o.organization_id LIMIT 1),
  jsonb_build_object('color_accuracy', '98%', 'thickness', '0.50mm'),
  'Quality inspection completed successfully'
FROM dkegl_orders o, dkegl_workflow_stages s, dkegl_quality_templates qt
WHERE o.organization_id = s.organization_id 
  AND s.organization_id = qt.organization_id
  AND o.status = 'in_production'
LIMIT 5
ON CONFLICT DO NOTHING;