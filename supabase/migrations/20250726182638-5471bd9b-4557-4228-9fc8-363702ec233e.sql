-- Phase 1: Enhanced Material Flow Tables
-- Create stage material inputs table to track all incoming materials per stage
CREATE TABLE public.dkegl_stage_material_inputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  order_id UUID NOT NULL,
  stage_id UUID NOT NULL,
  workflow_progress_id UUID NOT NULL,
  input_type TEXT NOT NULL CHECK (input_type IN ('substrate_carryforward', 'fresh_material', 'bom_component')),
  item_code TEXT NOT NULL,
  planned_quantity NUMERIC NOT NULL DEFAULT 0,
  actual_quantity NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (actual_quantity * unit_cost) STORED,
  source_stage_id UUID, -- for carryforward materials
  lot_number TEXT,
  supplier_batch TEXT,
  received_date DATE,
  expiry_date DATE,
  quality_status TEXT DEFAULT 'approved' CHECK (quality_status IN ('pending', 'approved', 'rejected', 'quarantine')),
  material_properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stage material outputs table to track all outgoing materials per stage
CREATE TABLE public.dkegl_stage_material_outputs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  order_id UUID NOT NULL,
  stage_id UUID NOT NULL,
  workflow_progress_id UUID NOT NULL,
  output_type TEXT NOT NULL CHECK (output_type IN ('substrate_forward', 'waste_material', 'finished_product', 'rework_material')),
  item_code TEXT NOT NULL,
  planned_quantity NUMERIC NOT NULL DEFAULT 0,
  actual_quantity NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (actual_quantity * unit_cost) STORED,
  destination_stage_id UUID, -- for forward materials
  yield_percentage NUMERIC GENERATED ALWAYS AS (
    CASE WHEN planned_quantity > 0 
    THEN (actual_quantity / planned_quantity) * 100 
    ELSE 0 END
  ) STORED,
  waste_category TEXT,
  waste_reason TEXT,
  quality_grade TEXT,
  material_properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create material transformations table to track how materials change during processing
CREATE TABLE public.dkegl_material_transformations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  order_id UUID NOT NULL,
  stage_id UUID NOT NULL,
  workflow_progress_id UUID NOT NULL,
  input_material_id UUID NOT NULL REFERENCES dkegl_stage_material_inputs(id),
  output_material_id UUID NOT NULL REFERENCES dkegl_stage_material_outputs(id),
  transformation_type TEXT NOT NULL,
  yield_rate NUMERIC NOT NULL DEFAULT 100,
  waste_percentage NUMERIC NOT NULL DEFAULT 0,
  transformation_parameters JSONB DEFAULT '{}',
  processing_conditions JSONB DEFAULT '{}',
  quality_impact JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create material flow log for complete traceability
CREATE TABLE public.dkegl_material_flow_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  order_id UUID NOT NULL,
  stage_id UUID NOT NULL,
  workflow_progress_id UUID NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('input', 'output', 'transfer', 'adjustment', 'waste')),
  item_code TEXT NOT NULL,
  quantity_change NUMERIC NOT NULL,
  running_balance NUMERIC NOT NULL,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  cost_impact NUMERIC GENERATED ALWAYS AS (quantity_change * unit_cost) STORED,
  reference_id UUID, -- references inputs/outputs/transformations
  reference_type TEXT,
  lot_number TEXT,
  transaction_reason TEXT,
  user_id UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enhanced BOM structure for stage-specific materials
CREATE TABLE public.dkegl_stage_material_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  stage_id UUID NOT NULL,
  category_name TEXT NOT NULL,
  category_type TEXT NOT NULL CHECK (category_type IN ('substrate', 'fresh_material', 'consumable', 'tooling', 'packaging')),
  is_required BOOLEAN DEFAULT true,
  typical_consumption_rate NUMERIC DEFAULT 0,
  waste_allowance_percentage NUMERIC DEFAULT 5,
  cost_allocation_method TEXT DEFAULT 'direct',
  quality_requirements JSONB DEFAULT '{}',
  storage_requirements JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, stage_id, category_name)
);

-- Insert default material categories for each stage
INSERT INTO public.dkegl_stage_material_categories (organization_id, stage_id, category_name, category_type, is_required, waste_allowance_percentage) 
SELECT 
  ws.organization_id,
  ws.id,
  mc.category_name,
  mc.category_type,
  mc.is_required,
  mc.waste_allowance_percentage
FROM dkegl_workflow_stages ws
CROSS JOIN (
  VALUES 
    -- Order Punching materials
    ('substrate', 'substrate', true, 2),
    ('tooling', 'tooling', true, 0),
    ('consumables', 'consumable', true, 5),
    ('setup_materials', 'consumable', false, 10),
    
    -- Gravure Printing materials  
    ('inks', 'fresh_material', true, 3),
    ('solvents', 'fresh_material', true, 8),
    ('plates', 'tooling', true, 0),
    ('chemicals', 'fresh_material', false, 5),
    ('cleaning_agents', 'consumable', true, 15),
    ('cylinder_prep', 'consumable', false, 5),
    
    -- Lamination Coating materials
    ('adhesives', 'fresh_material', true, 4),
    ('primers', 'fresh_material', false, 6),
    ('release_agents', 'fresh_material', false, 10),
    ('catalysts', 'fresh_material', false, 2),
    
    -- Adhesive Coating materials
    ('specialized_adhesives', 'fresh_material', true, 3),
    ('activators', 'fresh_material', false, 5),
    ('coating_chemicals', 'fresh_material', true, 4),
    ('release_papers', 'consumable', false, 8),
    
    -- Slitting Packaging materials
    ('cores', 'packaging', true, 1),
    ('stretch_wrap', 'packaging', true, 2),
    ('packaging_materials', 'packaging', true, 3),
    ('labels', 'packaging', false, 5),
    ('cartons', 'packaging', true, 1)
) AS mc(category_name, category_type, is_required, waste_allowance_percentage)
WHERE (
  (ws.stage_type = 'order_punching' AND mc.category_name IN ('substrate', 'tooling', 'consumables', 'setup_materials')) OR
  (ws.stage_type = 'gravure_printing' AND mc.category_name IN ('substrate', 'inks', 'solvents', 'plates', 'chemicals', 'cleaning_agents', 'cylinder_prep')) OR
  (ws.stage_type = 'lamination_coating' AND mc.category_name IN ('substrate', 'adhesives', 'primers', 'release_agents', 'catalysts')) OR
  (ws.stage_type = 'adhesive_coating' AND mc.category_name IN ('substrate', 'specialized_adhesives', 'activators', 'coating_chemicals', 'release_papers')) OR
  (ws.stage_type = 'slitting_packaging' AND mc.category_name IN ('substrate', 'cores', 'stretch_wrap', 'packaging_materials', 'labels', 'cartons'))
);

-- Create comprehensive cost breakdown table
CREATE TABLE public.dkegl_stage_cost_breakdown (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  order_id UUID NOT NULL,
  stage_id UUID NOT NULL,
  workflow_progress_id UUID NOT NULL,
  cost_category TEXT NOT NULL CHECK (cost_category IN ('material', 'labor', 'overhead', 'quality', 'waste', 'rework')),
  cost_subcategory TEXT,
  planned_cost NUMERIC NOT NULL DEFAULT 0,
  actual_cost NUMERIC NOT NULL DEFAULT 0,
  variance_amount NUMERIC GENERATED ALWAYS AS (actual_cost - planned_cost) STORED,
  variance_percentage NUMERIC GENERATED ALWAYS AS (
    CASE WHEN planned_cost > 0 
    THEN ((actual_cost - planned_cost) / planned_cost) * 100 
    ELSE 0 END
  ) STORED,
  cost_driver TEXT,
  allocation_basis TEXT,
  cost_center TEXT,
  accounting_period DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for new tables
ALTER TABLE public.dkegl_stage_material_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkegl_stage_material_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkegl_material_transformations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkegl_material_flow_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkegl_stage_material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkegl_stage_cost_breakdown ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "DKEGL organization members can access stage material inputs"
ON public.dkegl_stage_material_inputs
FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "DKEGL organization members can access stage material outputs"
ON public.dkegl_stage_material_outputs
FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "DKEGL organization members can access material transformations"
ON public.dkegl_material_transformations
FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "DKEGL organization members can access material flow log"
ON public.dkegl_material_flow_log
FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "DKEGL organization members can access stage material categories"
ON public.dkegl_stage_material_categories
FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "DKEGL organization members can access stage cost breakdown"
ON public.dkegl_stage_cost_breakdown
FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Create indexes for performance
CREATE INDEX idx_stage_material_inputs_workflow ON dkegl_stage_material_inputs(workflow_progress_id);
CREATE INDEX idx_stage_material_inputs_stage ON dkegl_stage_material_inputs(stage_id, order_id);
CREATE INDEX idx_stage_material_outputs_workflow ON dkegl_stage_material_outputs(workflow_progress_id);
CREATE INDEX idx_stage_material_outputs_stage ON dkegl_stage_material_outputs(stage_id, order_id);
CREATE INDEX idx_material_flow_log_order ON dkegl_material_flow_log(order_id, created_at);
CREATE INDEX idx_stage_cost_breakdown_order ON dkegl_stage_cost_breakdown(order_id, stage_id);

-- Update existing BOM components with proper stage assignments where null
UPDATE public.dkegl_bom_components 
SET stage_id = (
  SELECT ws.id 
  FROM dkegl_workflow_stages ws 
  WHERE ws.organization_id = dkegl_bom_components.organization_id 
  AND ws.stage_type = 'order_punching' 
  LIMIT 1
)
WHERE stage_id IS NULL 
AND material_category IN ('substrate', 'raw_material');

-- Create function to calculate stage material requirements
CREATE OR REPLACE FUNCTION public.dkegl_calculate_stage_material_requirements(
  _order_id UUID,
  _stage_id UUID
) RETURNS TABLE(
  item_code TEXT,
  item_name TEXT,
  material_category TEXT,
  planned_quantity NUMERIC,
  unit_cost NUMERIC,
  total_planned_cost NUMERIC,
  waste_allowance NUMERIC,
  total_with_waste NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  order_qty NUMERIC;
  org_id UUID;
BEGIN
  -- Get order quantity and organization
  SELECT o.order_quantity, o.organization_id
  INTO order_qty, org_id
  FROM dkegl_orders o
  WHERE o.id = _order_id;
  
  IF order_qty IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  RETURN QUERY
  SELECT 
    bc.item_code,
    im.item_name,
    bc.material_category,
    (bc.quantity_per_unit * order_qty) as planned_quantity,
    bc.unit_cost,
    (bc.quantity_per_unit * order_qty * bc.unit_cost) as total_planned_cost,
    (bc.quantity_per_unit * order_qty * bc.scrap_percentage / 100) as waste_allowance,
    (bc.quantity_per_unit * order_qty * (1 + bc.scrap_percentage / 100) * bc.unit_cost) as total_with_waste
  FROM dkegl_bom_components bc
  LEFT JOIN dkegl_item_master im ON bc.organization_id = im.organization_id AND bc.item_code = im.item_code
  WHERE bc.organization_id = org_id
    AND bc.stage_id = _stage_id
    AND bc.is_active = true
  ORDER BY bc.material_category, bc.item_code;
END;
$function$;