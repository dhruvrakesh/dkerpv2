-- Phase 1: Core Data Setup (Simplified)
-- Add missing check_type column and enum to dkegl_quality_templates

-- Create enum for quality check types (using DO block for conditional creation)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dkegl_quality_check_type') THEN
        CREATE TYPE dkegl_quality_check_type AS ENUM (
          'dimensional',
          'visual',
          'functional',
          'material',
          'weight',
          'thickness',
          'color_match',
          'print_quality',
          'adhesion',
          'barrier_properties'
        );
    END IF;
END $$;

-- Add check_type column to dkegl_quality_templates if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'dkegl_quality_templates' 
                   AND column_name = 'check_type') THEN
        ALTER TABLE dkegl_quality_templates 
        ADD COLUMN check_type dkegl_quality_check_type DEFAULT 'dimensional';
    END IF;
END $$;

-- Create workflow stages for manufacturing processes (using correct stage_type values)
INSERT INTO dkegl_workflow_stages (
  organization_id,
  stage_name,
  stage_type,
  stage_order,
  stage_config,
  is_active
) VALUES 
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'Gravure Printing',
  'printing',
  1,
  '{"machine_type": "gravure", "cylinder_required": true, "ink_setup": true, "quality_requirements": {"color_matching": true, "print_registration": true, "density_check": true}, "estimated_duration_hours": 4}',
  true
),
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'Lamination',
  'lamination',
  2,
  '{"adhesive_type": "solvent_based", "temperature_control": true, "speed_control": true, "quality_requirements": {"bond_strength": true, "delamination_test": true, "appearance": true}, "estimated_duration_hours": 3}',
  true
),
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'Coating',
  'coating',
  3,
  '{"coating_type": "barrier", "thickness_control": true, "drying_required": true, "quality_requirements": {"thickness_uniformity": true, "adhesion_test": true, "barrier_properties": true}, "estimated_duration_hours": 2}',
  true
),
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'Slitting',
  'slitting',
  4,
  '{"blade_type": "razor", "width_tolerance": 0.5, "edge_quality": "clean", "quality_requirements": {"width_accuracy": true, "edge_quality": true, "roll_formation": true}, "estimated_duration_hours": 1}',
  true
);

-- Create quality inspection templates for each stage (using correct column names)
INSERT INTO dkegl_quality_templates (
  organization_id,
  template_name,
  stage_type,
  check_type,
  quality_parameters,
  acceptance_criteria,
  is_active,
  created_by
) VALUES 
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'Gravure Print Quality Check',
  'printing',
  'print_quality',
  '{"color_density": {"min": 1.2, "max": 1.8}, "print_registration": {"tolerance": "±0.1mm"}, "streak_defects": {"max_count": 0}}',
  '{"pass_criteria": {"overall_grade": "A", "color_match": "within_tolerance", "defects": "none"}, "fail_criteria": {"overall_grade": "C", "color_match": "out_of_tolerance", "defects": "major"}, "measurement_method": "visual_densitometer"}',
  true,
  (SELECT auth.uid())
),
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'Lamination Bond Strength',
  'lamination',
  'adhesion',
  '{"bond_strength": {"min": 2.5, "unit": "N/15mm"}, "delamination": {"max": 0}, "bubble_count": {"max": 1}}',
  '{"pass_criteria": {"bond_strength": ">=2.5", "delamination": "none", "appearance": "excellent"}, "fail_criteria": {"bond_strength": "<2.0", "delamination": "present", "appearance": "poor"}, "measurement_method": "peel_test"}',
  true,
  (SELECT auth.uid())
),
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'Coating Thickness Check',
  'coating',
  'thickness',
  '{"thickness": {"target": 12, "tolerance": "±1", "unit": "microns"}, "uniformity": {"cv": "<5%"}}',
  '{"pass_criteria": {"thickness": "within_tolerance", "uniformity": "excellent", "coverage": "complete"}, "fail_criteria": {"thickness": "out_of_tolerance", "uniformity": "poor", "coverage": "incomplete"}, "measurement_method": "micrometer_gauge"}',
  true,
  (SELECT auth.uid())
),
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'Slitting Width Accuracy',
  'slitting',
  'dimensional',
  '{"width": {"tolerance": "±0.5mm"}, "edge_quality": {"rating": "clean"}, "roll_formation": {"tension": "uniform"}}',
  '{"pass_criteria": {"width": "within_tolerance", "edge_quality": "clean", "roll_formation": "excellent"}, "fail_criteria": {"width": "out_of_tolerance", "edge_quality": "rough", "roll_formation": "poor"}, "measurement_method": "digital_caliper"}',
  true,
  (SELECT auth.uid())
);

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
  tax_id
) VALUES 
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'VND-001',
  'Premium Substrates Ltd',
  'Rajesh Kumar',
  'rajesh@premiumsub.com',
  '+91-9876543210',
  '123 Industrial Area, Mumbai, Maharashtra 400001',
  'Net 30',
  500000,
  'GSTIN1234567890'
),
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'VND-002',
  'Quality Inks & Chemicals',
  'Priya Sharma',
  'priya@qualityinks.com',
  '+91-9876543211',
  '456 Chemical Complex, Pune, Maharashtra 411001',
  'Net 45',
  300000,
  'GSTIN0987654321'
),
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'VND-003',
  'Advanced Adhesives Co',
  'Amit Patel',
  'amit@advancedadh.com',
  '+91-9876543212',
  '789 Industrial Estate, Ahmedabad, Gujarat 380001',
  'Net 15',
  200000,
  'GSTIN1122334455'
);

-- Create sample workflow progress for existing orders (using valid status values)
INSERT INTO dkegl_workflow_progress (
  organization_id,
  order_id,
  stage_id,
  status,
  progress_percentage,
  quality_status,
  stage_data,
  notes
) 
SELECT 
  o.organization_id,
  o.id,
  s.id,
  CASE s.stage_order 
    WHEN 1 THEN 'in_progress'
    WHEN 2 THEN 'pending'
    ELSE 'pending'
  END,
  CASE s.stage_order 
    WHEN 1 THEN 75
    WHEN 2 THEN 0
    ELSE 0
  END,
  CASE s.stage_order 
    WHEN 1 THEN 'in_review'
    ELSE 'pending'
  END,
  '{"operator": "Production Team", "machine_id": "M001", "batch_size": 1000}',
  CASE s.stage_order 
    WHEN 1 THEN 'Print quality looking good, minor adjustment needed on cyan registration'
    WHEN 2 THEN 'Waiting for printing stage completion'
    ELSE 'Pending previous stage'
  END
FROM dkegl_orders o
CROSS JOIN dkegl_workflow_stages s
WHERE o.organization_id = s.organization_id;