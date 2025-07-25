-- Phase 1: Fix Database Schema Issues
-- Add missing check_type column and enum to dkegl_quality_templates

-- Create enum for quality check types
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

-- Add check_type column to dkegl_quality_templates
ALTER TABLE dkegl_quality_templates 
ADD COLUMN check_type dkegl_quality_check_type DEFAULT 'dimensional';

-- Create workflow stages for manufacturing processes
INSERT INTO dkegl_workflow_stages (
  organization_id,
  stage_name,
  stage_type,
  sequence_order,
  stage_config,
  quality_requirements,
  estimated_duration_hours
) VALUES 
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'Gravure Printing',
  'printing',
  1,
  '{"machine_type": "gravure", "cylinder_required": true, "ink_setup": true}',
  '{"color_matching": true, "print_registration": true, "density_check": true}',
  4
),
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'Lamination',
  'coating',
  2,
  '{"adhesive_type": "solvent_based", "temperature_control": true, "speed_control": true}',
  '{"bond_strength": true, "delamination_test": true, "appearance": true}',
  3
),
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'Coating',
  'coating',
  3,
  '{"coating_type": "barrier", "thickness_control": true, "drying_required": true}',
  '{"thickness_uniformity": true, "adhesion_test": true, "barrier_properties": true}',
  2
),
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'Slitting',
  'finishing',
  4,
  '{"blade_type": "razor", "width_tolerance": 0.5, "edge_quality": "clean"}',
  '{"width_accuracy": true, "edge_quality": true, "roll_formation": true}',
  1
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