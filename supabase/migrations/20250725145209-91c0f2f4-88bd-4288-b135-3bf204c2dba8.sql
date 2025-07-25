-- Phase 3: Material & Cost Integration

-- Add material consumption tracking to workflow progress
ALTER TABLE dkegl_workflow_progress 
ADD COLUMN IF NOT EXISTS material_consumed jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS material_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS labor_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS overhead_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_stage_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS waste_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS efficiency_percentage numeric DEFAULT 100,
ADD COLUMN IF NOT EXISTS resource_utilization jsonb DEFAULT '{}'::jsonb;

-- Create material consumption log table
CREATE TABLE IF NOT EXISTS dkegl_material_consumption (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES dkegl_organizations(id),
  order_id UUID REFERENCES dkegl_orders(id),
  stage_id UUID REFERENCES dkegl_workflow_stages(id),
  workflow_progress_id UUID REFERENCES dkegl_workflow_progress(id),
  item_code TEXT NOT NULL,
  planned_quantity NUMERIC NOT NULL DEFAULT 0,
  actual_quantity NUMERIC NOT NULL DEFAULT 0,
  waste_quantity NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  consumption_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for material consumption
ALTER TABLE dkegl_material_consumption ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for material consumption
CREATE POLICY "Organization members can access material consumption"
ON dkegl_material_consumption
FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Create waste tracking table
CREATE TABLE IF NOT EXISTS dkegl_waste_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES dkegl_organizations(id),
  order_id UUID REFERENCES dkegl_orders(id),
  stage_id UUID REFERENCES dkegl_workflow_stages(id),
  workflow_progress_id UUID REFERENCES dkegl_workflow_progress(id),
  waste_type TEXT NOT NULL, -- 'material', 'time', 'energy'
  waste_category TEXT NOT NULL, -- 'setup', 'defect', 'trim', 'rework'
  planned_amount NUMERIC NOT NULL DEFAULT 0,
  actual_amount NUMERIC NOT NULL DEFAULT 0,
  waste_amount NUMERIC NOT NULL DEFAULT 0,
  waste_percentage NUMERIC NOT NULL DEFAULT 0,
  cost_impact NUMERIC NOT NULL DEFAULT 0,
  root_cause TEXT,
  corrective_action TEXT,
  recorded_by UUID,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for waste tracking
ALTER TABLE dkegl_waste_tracking ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for waste tracking
CREATE POLICY "Organization members can access waste tracking"
ON dkegl_waste_tracking
FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Function to calculate stage cost
CREATE OR REPLACE FUNCTION dkegl_calculate_stage_cost(
  _workflow_progress_id UUID
) RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_cost NUMERIC := 0;
  material_cost NUMERIC := 0;
  labor_cost NUMERIC := 0;
  overhead_cost NUMERIC := 0;
  progress_data RECORD;
BEGIN
  -- Get workflow progress data
  SELECT wp.*, ws.stage_name, o.order_quantity
  INTO progress_data
  FROM dkegl_workflow_progress wp
  JOIN dkegl_workflow_stages ws ON wp.stage_id = ws.id
  JOIN dkegl_orders o ON wp.order_id = o.id
  WHERE wp.id = _workflow_progress_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Calculate material cost from consumption
  SELECT COALESCE(SUM(total_cost), 0)
  INTO material_cost
  FROM dkegl_material_consumption
  WHERE workflow_progress_id = _workflow_progress_id;
  
  -- Calculate labor cost (simplified - based on stage duration and rate)
  IF progress_data.started_at IS NOT NULL AND progress_data.completed_at IS NOT NULL THEN
    labor_cost := EXTRACT(EPOCH FROM (progress_data.completed_at - progress_data.started_at)) / 3600 * 25; -- $25/hour
  END IF;
  
  -- Calculate overhead cost (10% of material + labor)
  overhead_cost := (material_cost + labor_cost) * 0.1;
  
  total_cost := material_cost + labor_cost + overhead_cost;
  
  -- Update workflow progress with costs
  UPDATE dkegl_workflow_progress
  SET 
    material_cost = material_cost,
    labor_cost = labor_cost,
    overhead_cost = overhead_cost,
    total_stage_cost = total_cost,
    updated_at = NOW()
  WHERE id = _workflow_progress_id;
  
  RETURN total_cost;
END;
$function$;

-- Function to track material consumption
CREATE OR REPLACE FUNCTION dkegl_track_material_consumption(
  _workflow_progress_id UUID,
  _item_code TEXT,
  _planned_qty NUMERIC,
  _actual_qty NUMERIC,
  _unit_cost NUMERIC DEFAULT 0
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  consumption_id UUID;
  progress_data RECORD;
  waste_qty NUMERIC;
  total_cost NUMERIC;
BEGIN
  -- Get workflow progress data
  SELECT wp.*, ws.organization_id, wp.order_id, wp.stage_id
  INTO progress_data
  FROM dkegl_workflow_progress wp
  JOIN dkegl_workflow_stages ws ON wp.stage_id = ws.id
  WHERE wp.id = _workflow_progress_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workflow progress not found';
  END IF;
  
  -- Calculate waste and cost
  waste_qty := GREATEST(_actual_qty - _planned_qty, 0);
  total_cost := _actual_qty * _unit_cost;
  
  -- Insert material consumption record
  INSERT INTO dkegl_material_consumption (
    organization_id,
    order_id,
    stage_id,
    workflow_progress_id,
    item_code,
    planned_quantity,
    actual_quantity,
    waste_quantity,
    unit_cost,
    total_cost
  ) VALUES (
    progress_data.organization_id,
    progress_data.order_id,
    progress_data.stage_id,
    _workflow_progress_id,
    _item_code,
    _planned_qty,
    _actual_qty,
    waste_qty,
    _unit_cost,
    total_cost
  ) RETURNING id INTO consumption_id;
  
  -- Update workflow progress material cost
  PERFORM dkegl_calculate_stage_cost(_workflow_progress_id);
  
  -- Track waste if any
  IF waste_qty > 0 THEN
    INSERT INTO dkegl_waste_tracking (
      organization_id,
      order_id,
      stage_id,
      workflow_progress_id,
      waste_type,
      waste_category,
      planned_amount,
      actual_amount,
      waste_amount,
      waste_percentage,
      cost_impact,
      recorded_by
    ) VALUES (
      progress_data.organization_id,
      progress_data.order_id,
      progress_data.stage_id,
      _workflow_progress_id,
      'material',
      'excess_usage',
      _planned_qty,
      _actual_qty,
      waste_qty,
      (waste_qty / NULLIF(_planned_qty, 0)) * 100,
      waste_qty * _unit_cost,
      auth.uid()
    );
  END IF;
  
  RETURN consumption_id;
END;
$function$;

-- Function to get order cost summary
CREATE OR REPLACE FUNCTION dkegl_get_order_cost_summary(_order_id UUID)
RETURNS TABLE(
  stage_name TEXT,
  material_cost NUMERIC,
  labor_cost NUMERIC,
  overhead_cost NUMERIC,
  total_stage_cost NUMERIC,
  waste_percentage NUMERIC,
  efficiency_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ws.stage_name,
    COALESCE(wp.material_cost, 0) as material_cost,
    COALESCE(wp.labor_cost, 0) as labor_cost,
    COALESCE(wp.overhead_cost, 0) as overhead_cost,
    COALESCE(wp.total_stage_cost, 0) as total_stage_cost,
    COALESCE(wp.waste_percentage, 0) as waste_percentage,
    COALESCE(wp.efficiency_percentage, 100) as efficiency_percentage
  FROM dkegl_workflow_progress wp
  JOIN dkegl_workflow_stages ws ON wp.stage_id = ws.id
  WHERE wp.order_id = _order_id
  ORDER BY ws.sequence_order;
END;
$function$;