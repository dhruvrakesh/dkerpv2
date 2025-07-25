-- Create sample orders and workflow progress for testing
INSERT INTO dkegl_orders (
  organization_id,
  order_number,
  uiorn,
  item_code,
  item_name,
  customer_info,
  order_quantity,
  specifications,
  substrate_details,
  printing_details,
  delivery_date,
  priority_level,
  status,
  created_by
) VALUES 
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'ORD-2025-001',
  'UIORN-001-2025',
  'ITM-PACK-001',
  'Premium Packaging Material',
  '{"customer_name": "ABC Industries", "contact_person": "John Smith", "email": "john@abc.com", "phone": "+91-9876543210"}',
  5000,
  '{"width_mm": 300, "length_mm": 400, "thickness_micron": 25, "finish": "matte"}',
  '{"material": "BOPP", "gsm": 20, "color": "transparent", "barrier_properties": "medium"}',
  '{"colors": ["Cyan", "Magenta", "Yellow", "Black"], "print_method": "gravure", "resolution": "175 LPI"}',
  '2025-02-15',
  2,
  'in_production',
  (SELECT auth.uid())
),
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'ORD-2025-002',
  'UIORN-002-2025',
  'ITM-PACK-002',
  'Food Grade Packaging',
  '{"customer_name": "FoodCorp Ltd", "contact_person": "Sarah Wilson", "email": "sarah@foodcorp.com", "phone": "+91-9876543211"}',
  8000,
  '{"width_mm": 250, "length_mm": 350, "thickness_micron": 30, "finish": "glossy"}',
  '{"material": "PET", "gsm": 25, "color": "clear", "barrier_properties": "high"}',
  '{"colors": ["Red", "Blue", "White"], "print_method": "flexo", "resolution": "150 LPI"}',
  '2025-02-20',
  1,
  'pending',
  (SELECT auth.uid())
);

-- Create workflow stages for these orders
WITH order_ids AS (
  SELECT id, uiorn FROM dkegl_orders WHERE order_number IN ('ORD-2025-001', 'ORD-2025-002')
),
stages AS (
  SELECT 
    o.id as order_id,
    o.uiorn,
    generate_series(1, 5) as stage_num,
    ARRAY['Material Preparation', 'Gravure Printing', 'Lamination & Coating', 'Slitting & Packaging', 'Quality Control'] as stage_names,
    ARRAY['pending', 'in_progress', 'pending', 'pending', 'pending'] as stage_statuses
  FROM order_ids o
)
INSERT INTO dkegl_workflow_progress (
  organization_id,
  order_id,
  stage_id,
  status,
  progress_percentage,
  stage_data,
  notes
)
SELECT 
  (SELECT id FROM dkegl_organizations LIMIT 1),
  s.order_id,
  gen_random_uuid(),
  CASE 
    WHEN s.stage_num = 1 THEN 'completed'
    WHEN s.stage_num = 2 THEN 'in_progress' 
    ELSE 'pending' 
  END,
  CASE 
    WHEN s.stage_num = 1 THEN 100
    WHEN s.stage_num = 2 THEN 65
    ELSE 0 
  END,
  json_build_object(
    'stage_name', (stage_names)[stage_num],
    'stage_number', stage_num,
    'uiorn', s.uiorn,
    'estimated_hours', 8 + (stage_num * 2),
    'machine_allocation', 'Machine-' || stage_num
  ),
  CASE 
    WHEN s.stage_num = 1 THEN 'Material preparation completed successfully'
    WHEN s.stage_num = 2 THEN 'Gravure printing in progress - 65% complete'
    ELSE 'Awaiting previous stage completion'
  END
FROM stages s;

-- Create sample vendors
INSERT INTO dkegl_vendors (
  organization_id,
  vendor_code,
  vendor_name,
  contact_person,
  email,
  phone,
  address,
  payment_terms,
  credit_limit,
  is_active
) VALUES 
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'VEN-001',
  'Premium Materials Pvt Ltd',
  'Rajesh Kumar',
  'rajesh@premiummaterials.com',
  '+91-9876543210',
  '123 Industrial Area, Mumbai, Maharashtra 400001',
  'Net 30',
  1000000,
  true
),
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'VEN-002',
  'Quality Inks & Chemicals',
  'Priya Sharma',
  'priya@qualityinks.com',
  '+91-9876543211',
  '456 Chemical Park, Pune, Maharashtra 411001',
  'Net 45',
  750000,
  true
),
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'VEN-003',
  'Industrial Equipment Solutions',
  'Amit Patel',
  'amit@iesequipment.com',
  '+91-9876543212',
  '789 Tech Hub, Bangalore, Karnataka 560001',
  'Net 60',
  2000000,
  true
);

-- Create sample production metrics
INSERT INTO dkegl_production_metrics (
  organization_id,
  metric_date,
  total_orders_processed,
  avg_cycle_time_hours,
  overall_efficiency_percentage,
  quality_pass_rate,
  waste_percentage,
  downtime_hours,
  throughput_units_per_hour,
  cost_per_unit,
  stage_metrics
) VALUES 
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  CURRENT_DATE - INTERVAL '1 day',
  12,
  24.5,
  87.3,
  94.8,
  3.2,
  2.5,
  450,
  15.75,
  json_build_object(
    'gravure_printing', json_build_object('efficiency', 89.2, 'defect_rate', 2.1),
    'lamination', json_build_object('efficiency', 91.5, 'defect_rate', 1.8),
    'slitting', json_build_object('efficiency', 85.7, 'defect_rate', 4.2)
  )
),
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  CURRENT_DATE,
  8,
  22.1,
  91.2,
  96.1,
  2.8,
  1.2,
  520,
  14.25,
  json_build_object(
    'gravure_printing', json_build_object('efficiency', 92.8, 'defect_rate', 1.9),
    'lamination', json_build_object('efficiency', 94.2, 'defect_rate', 1.5),
    'slitting', json_build_object('efficiency', 88.9, 'defect_rate', 3.1)
  )
);