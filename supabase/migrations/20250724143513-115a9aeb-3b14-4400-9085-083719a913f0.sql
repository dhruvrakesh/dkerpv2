-- Phase 1: Manufacturing Workflow Enhancement - Database Schema Extension (Modified)

-- Create workflow stages tracking table
CREATE TABLE public.dkegl_workflow_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.dkegl_organizations(id),
  stage_name TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  stage_type TEXT NOT NULL CHECK (stage_type IN ('artwork', 'cylinder', 'printing', 'lamination', 'coating', 'slitting', 'packaging', 'quality')),
  stage_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workflow progress tracking table
CREATE TABLE public.dkegl_workflow_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.dkegl_organizations(id),
  order_id UUID REFERENCES public.dkegl_orders(id),
  stage_id UUID REFERENCES public.dkegl_workflow_stages(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'on_hold', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_to UUID,
  stage_data JSONB DEFAULT '{}',
  quality_status TEXT DEFAULT 'pending' CHECK (quality_status IN ('pending', 'passed', 'failed', 'in_review')),
  progress_percentage NUMERIC DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create artwork management table (enhanced version of existing artwork_upload)
CREATE TABLE public.dkegl_artwork (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.dkegl_organizations(id),
  order_id UUID REFERENCES public.dkegl_orders(id),
  artwork_name TEXT NOT NULL,
  artwork_type TEXT NOT NULL CHECK (artwork_type IN ('label', 'packaging', 'flexible', 'rigid')),
  file_path TEXT,
  file_size INTEGER,
  mime_type TEXT,
  version_number INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'rejected', 'archived')),
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, order_id, artwork_name, version_number)
);

-- Create artwork versions table for version control
CREATE TABLE public.dkegl_artwork_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artwork_id UUID REFERENCES public.dkegl_artwork(id),
  version_number INTEGER NOT NULL,
  file_path TEXT,
  changes_summary TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cylinder management table
CREATE TABLE public.dkegl_cylinders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.dkegl_organizations(id),
  cylinder_code TEXT NOT NULL,
  cylinder_type TEXT NOT NULL CHECK (cylinder_type IN ('gravure', 'flexo', 'offset')),
  diameter NUMERIC,
  length NUMERIC,
  number_of_colors INTEGER DEFAULT 1,
  artwork_id UUID REFERENCES public.dkegl_artwork(id),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'damaged', 'retired')),
  location TEXT,
  last_used_date DATE,
  maintenance_due_date DATE,
  usage_count INTEGER DEFAULT 0,
  specifications JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, cylinder_code)
);

-- Create cylinder maintenance table
CREATE TABLE public.dkegl_cylinder_maintenance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.dkegl_organizations(id),
  cylinder_id UUID REFERENCES public.dkegl_cylinders(id),
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('routine', 'repair', 'inspection', 'cleaning')),
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  performed_by UUID,
  maintenance_notes TEXT,
  cost NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quality templates table
CREATE TABLE public.dkegl_quality_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.dkegl_organizations(id),
  template_name TEXT NOT NULL,
  stage_type TEXT NOT NULL CHECK (stage_type IN ('artwork', 'cylinder', 'printing', 'lamination', 'coating', 'slitting', 'packaging')),
  quality_parameters JSONB NOT NULL DEFAULT '{}',
  acceptance_criteria JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, template_name, stage_type)
);

-- Create quality inspections table
CREATE TABLE public.dkegl_quality_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.dkegl_organizations(id),
  order_id UUID REFERENCES public.dkegl_orders(id),
  stage_id UUID REFERENCES public.dkegl_workflow_stages(id),
  template_id UUID REFERENCES public.dkegl_quality_templates(id),
  inspector_id UUID,
  inspection_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  inspection_results JSONB NOT NULL DEFAULT '{}',
  overall_result TEXT NOT NULL CHECK (overall_result IN ('passed', 'failed', 'conditional')),
  defects_found JSONB DEFAULT '[]',
  corrective_actions JSONB DEFAULT '[]',
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stage performance table for analytics
CREATE TABLE public.dkegl_stage_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.dkegl_organizations(id),
  stage_id UUID REFERENCES public.dkegl_workflow_stages(id),
  performance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  orders_processed INTEGER DEFAULT 0,
  avg_processing_time_hours NUMERIC DEFAULT 0,
  avg_efficiency_percentage NUMERIC DEFAULT 0,
  total_waste_percentage NUMERIC DEFAULT 0,
  quality_pass_rate NUMERIC DEFAULT 0,
  bottleneck_score NUMERIC DEFAULT 0,
  resource_utilization NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, stage_id, performance_date)
);

-- Enable RLS on all tables
ALTER TABLE public.dkegl_workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkegl_workflow_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkegl_artwork ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkegl_artwork_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkegl_cylinders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkegl_cylinder_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkegl_quality_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkegl_quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkegl_stage_performance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "DKEGL organization members can access workflow stages" ON public.dkegl_workflow_stages
  FOR ALL USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "DKEGL organization members can access workflow progress" ON public.dkegl_workflow_progress
  FOR ALL USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "DKEGL organization members can access artwork" ON public.dkegl_artwork
  FOR ALL USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "DKEGL organization members can access artwork versions" ON public.dkegl_artwork_versions
  FOR ALL USING (EXISTS(SELECT 1 FROM public.dkegl_artwork WHERE id = artwork_id AND organization_id = dkegl_get_current_user_org()));

CREATE POLICY "DKEGL organization members can access cylinders" ON public.dkegl_cylinders
  FOR ALL USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "DKEGL organization members can access cylinder maintenance" ON public.dkegl_cylinder_maintenance
  FOR ALL USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "DKEGL organization members can access quality templates" ON public.dkegl_quality_templates
  FOR ALL USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "DKEGL organization members can access quality inspections" ON public.dkegl_quality_inspections
  FOR ALL USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "DKEGL organization members can access stage performance" ON public.dkegl_stage_performance
  FOR ALL USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Create indexes for performance
CREATE INDEX idx_workflow_progress_order_id ON public.dkegl_workflow_progress(order_id);
CREATE INDEX idx_workflow_progress_stage_id ON public.dkegl_workflow_progress(stage_id);
CREATE INDEX idx_workflow_progress_status ON public.dkegl_workflow_progress(status);
CREATE INDEX idx_artwork_order_id ON public.dkegl_artwork(order_id);
CREATE INDEX idx_artwork_status ON public.dkegl_artwork(status);
CREATE INDEX idx_cylinders_status ON public.dkegl_cylinders(status);
CREATE INDEX idx_quality_inspections_order_id ON public.dkegl_quality_inspections(order_id);
CREATE INDEX idx_stage_performance_date ON public.dkegl_stage_performance(performance_date);

-- Insert default workflow stages for DKEGL organization
INSERT INTO public.dkegl_workflow_stages (organization_id, stage_name, stage_order, stage_type, stage_config)
SELECT 
  o.id,
  stage_name,
  stage_order,
  stage_type,
  stage_config::jsonb
FROM public.dkegl_organizations o,
(VALUES 
  ('Artwork Review', 1, 'artwork', '{"required_approvals": 2, "auto_progress": false}'),
  ('Cylinder Preparation', 2, 'cylinder', '{"preparation_time_hours": 4, "quality_check": true}'),
  ('Gravure Printing', 3, 'printing', '{"colors_max": 8, "speed_mpm": 300, "quality_intervals": 30}'),
  ('Lamination', 4, 'lamination', '{"adhesive_types": ["solvent", "solventless"], "quality_check": true}'),
  ('Adhesive Coating', 5, 'coating', '{"coating_types": ["hotmelt", "acrylic"], "thickness_tolerance": 0.1}'),
  ('Slitting', 6, 'slitting', '{"tolerance_mm": 0.5, "edge_quality": "A-grade"}'),
  ('Packaging', 7, 'packaging', '{"final_inspection": true, "labeling": true}'),
  ('Quality Assurance', 8, 'quality', '{"final_approval": true, "documentation": true}')
) AS stages(stage_name, stage_order, stage_type, stage_config)
WHERE o.code = 'DKEGL';

-- Insert default quality templates
INSERT INTO public.dkegl_quality_templates (organization_id, template_name, stage_type, quality_parameters, acceptance_criteria)
SELECT 
  o.id,
  template_name,
  stage_type,
  quality_parameters::jsonb,
  acceptance_criteria::jsonb
FROM public.dkegl_organizations o,
(VALUES 
  ('Artwork Quality Check', 'artwork', 
   '{"color_accuracy": "required", "text_clarity": "required", "bleed_margins": "3mm", "resolution_dpi": 300}',
   '{"color_deviation": "<=5%", "text_readability": "100%", "bleed_compliance": "100%"}'),
  ('Printing Quality Check', 'printing', 
   '{"registration": "required", "color_consistency": "required", "print_density": "required", "defects": "none"}',
   '{"registration_tolerance": "±0.1mm", "color_delta_e": "<=3", "density_variation": "<=5%"}'),
  ('Lamination Quality Check', 'lamination', 
   '{"bond_strength": "required", "clarity": "required", "bubbles": "none", "wrinkles": "none"}',
   '{"bond_strength_min": "2.5N/15mm", "clarity_rating": ">=8/10", "defect_rate": "<=0.1%"}'),
  ('Slitting Quality Check', 'slitting', 
   '{"width_accuracy": "required", "edge_quality": "required", "tension": "consistent"}',
   '{"width_tolerance": "±0.5mm", "edge_roughness": "<=10μm", "tension_variation": "<=3%"}')
) AS templates(template_name, stage_type, quality_parameters, acceptance_criteria)
WHERE o.code = 'DKEGL';