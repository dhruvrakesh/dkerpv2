-- Phase 1: Fix Database Schema Issues (Final Correction)
-- Add missing check_type column and enum to dkegl_quality_templates

-- Create enum for quality check types
CREATE TYPE IF NOT EXISTS dkegl_quality_check_type AS ENUM (
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

-- Create quality inspection templates for each stage
INSERT INTO dkegl_quality_templates (
  organization_id,
  template_name,
  check_type,
  parameters,
  pass_criteria,
  failure_criteria,
  measurement_method
) VALUES 
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'Gravure Print Quality Check',
  'print_quality',
  '{"color_density": {"min": 1.2, "max": 1.8}, "print_registration": {"tolerance": "±0.1mm"}, "streak_defects": {"max_count": 0}}',
  '{"overall_grade": "A", "color_match": "within_tolerance", "defects": "none"}',
  '{"overall_grade": "C", "color_match": "out_of_tolerance", "defects": "major"}',
  'visual_densitometer'
),
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'Lamination Bond Strength',
  'adhesion',
  '{"bond_strength": {"min": 2.5, "unit": "N/15mm"}, "delamination": {"max": 0}, "bubble_count": {"max": 1}}',
  '{"bond_strength": ">=2.5", "delamination": "none", "appearance": "excellent"}',
  '{"bond_strength": "<2.0", "delamination": "present", "appearance": "poor"}',
  'peel_test'
),
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'Coating Thickness Check',
  'thickness',
  '{"thickness": {"target": 12, "tolerance": "±1", "unit": "microns"}, "uniformity": {"cv": "<5%"}}',
  '{"thickness": "within_tolerance", "uniformity": "excellent", "coverage": "complete"}',
  '{"thickness": "out_of_tolerance", "uniformity": "poor", "coverage": "incomplete"}',
  'micrometer_gauge'
),
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'Slitting Width Accuracy',
  'dimensional',
  '{"width": {"tolerance": "±0.5mm"}, "edge_quality": {"rating": "clean"}, "roll_formation": {"tension": "uniform"}}',
  '{"width": "within_tolerance", "edge_quality": "clean", "roll_formation": "excellent"}',
  '{"width": "out_of_tolerance", "edge_quality": "rough", "roll_formation": "poor"}',
  'digital_caliper'
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

-- Create sample workflow progress for existing orders
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
    ELSE 'not_started'
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

-- Create sample quality inspections
INSERT INTO dkegl_quality_inspections (
  organization_id,
  order_id,
  stage_id,
  template_id,
  status,
  scheduled_date,
  inspection_results,
  measurements,
  defects_found,
  inspector_notes,
  created_by
)
SELECT 
  o.organization_id,
  o.id,
  s.id,
  qt.id,
  CASE s.stage_order 
    WHEN 1 THEN 'in_review'
    ELSE 'pending'
  END,
  CURRENT_DATE + (s.stage_order - 1) * INTERVAL '1 day',
  CASE s.stage_order 
    WHEN 1 THEN '{"overall_grade": "A-", "color_match": "within_tolerance", "defects": "minor_streak"}'
    ELSE '{}'
  END,
  CASE s.stage_order 
    WHEN 1 THEN '{"color_density": 1.45, "registration_accuracy": 0.08}'
    ELSE '{}'
  END,
  CASE s.stage_order 
    WHEN 1 THEN '["Minor streak in cyan channel at 450mm mark"]'
    ELSE '[]'
  END,
  CASE s.stage_order 
    WHEN 1 THEN 'Overall quality is good. Minor streak defect requires cylinder cleaning before next run.'
    ELSE 'Inspection pending'
  END,
  (SELECT auth.uid())
FROM dkegl_orders o
CROSS JOIN dkegl_workflow_stages s
CROSS JOIN dkegl_quality_templates qt
WHERE o.organization_id = s.organization_id 
  AND s.organization_id = qt.organization_id
  AND ((s.stage_name = 'Gravure Printing' AND qt.template_name = 'Gravure Print Quality Check')
    OR (s.stage_name = 'Lamination' AND qt.template_name = 'Lamination Bond Strength')
    OR (s.stage_name = 'Coating' AND qt.template_name = 'Coating Thickness Check')
    OR (s.stage_name = 'Slitting' AND qt.template_name = 'Slitting Width Accuracy'));