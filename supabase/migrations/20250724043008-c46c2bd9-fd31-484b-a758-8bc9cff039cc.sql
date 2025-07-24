-- Complete DKEGL Database Schema - Add Cost Analytics Tables

-- Cost Analysis Table
CREATE TABLE public.dkegl_cost_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  item_code TEXT NOT NULL,
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Cost Components
  material_cost NUMERIC(12,4) DEFAULT 0,
  labor_cost NUMERIC(12,4) DEFAULT 0,
  overhead_cost NUMERIC(12,4) DEFAULT 0,
  total_manufacturing_cost NUMERIC(12,4) DEFAULT 0,
  
  -- Pricing Data
  standard_cost NUMERIC(12,4) DEFAULT 0,
  current_market_price NUMERIC(12,4) DEFAULT 0,
  selling_price NUMERIC(12,4) DEFAULT 0,
  margin_percentage NUMERIC(5,2) DEFAULT 0,
  
  -- Volume & Efficiency Data
  production_volume NUMERIC(12,2) DEFAULT 0,
  efficiency_factor NUMERIC(5,4) DEFAULT 1.0000,
  waste_percentage NUMERIC(5,2) DEFAULT 0,
  
  -- Analysis Metadata
  cost_breakdown JSONB DEFAULT '{}',
  notes TEXT,
  analyzed_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Pricing Hierarchy Table
CREATE TABLE public.dkegl_pricing_hierarchy (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  item_code TEXT NOT NULL,
  
  -- Customer/Volume Tiers
  customer_tier TEXT NOT NULL, -- 'premium', 'standard', 'bulk', 'wholesale'
  min_quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  max_quantity NUMERIC(12,2),
  
  -- Pricing Structure
  base_price NUMERIC(12,4) NOT NULL,
  discount_percentage NUMERIC(5,2) DEFAULT 0,
  final_price NUMERIC(12,4) NOT NULL,
  
  -- Time-based Pricing
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  is_active BOOLEAN DEFAULT true,
  
  -- Geographic/Market Pricing
  market_region TEXT DEFAULT 'domestic',
  currency_code TEXT DEFAULT 'INR',
  
  -- Pricing Rules
  pricing_rules JSONB DEFAULT '{}',
  special_conditions TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_quantity_range CHECK (min_quantity <= COALESCE(max_quantity, min_quantity)),
  CONSTRAINT valid_dates CHECK (effective_from <= COALESCE(effective_until, effective_from))
);

-- Add RLS Policies
ALTER TABLE public.dkegl_cost_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkegl_pricing_hierarchy ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Cost Analysis
CREATE POLICY "DKEGL organization members can access cost analysis"
ON public.dkegl_cost_analysis
FOR ALL
TO authenticated
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- RLS Policies for Pricing Hierarchy
CREATE POLICY "DKEGL organization members can access pricing hierarchy"
ON public.dkegl_pricing_hierarchy
FOR ALL
TO authenticated
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Create Indexes for Performance
CREATE INDEX idx_dkegl_cost_analysis_org_item ON public.dkegl_cost_analysis(organization_id, item_code);
CREATE INDEX idx_dkegl_cost_analysis_date ON public.dkegl_cost_analysis(analysis_date);

CREATE INDEX idx_dkegl_pricing_hierarchy_org_item ON public.dkegl_pricing_hierarchy(organization_id, item_code);
CREATE INDEX idx_dkegl_pricing_hierarchy_tier ON public.dkegl_pricing_hierarchy(customer_tier, is_active);
CREATE INDEX idx_dkegl_pricing_hierarchy_dates ON public.dkegl_pricing_hierarchy(effective_from, effective_until);

-- Add Updated At Triggers
CREATE TRIGGER dkegl_cost_analysis_updated_at
  BEFORE UPDATE ON public.dkegl_cost_analysis
  FOR EACH ROW
  EXECUTE FUNCTION dkegl_update_timestamp();

CREATE TRIGGER dkegl_pricing_hierarchy_updated_at
  BEFORE UPDATE ON public.dkegl_pricing_hierarchy
  FOR EACH ROW
  EXECUTE FUNCTION dkegl_update_timestamp();