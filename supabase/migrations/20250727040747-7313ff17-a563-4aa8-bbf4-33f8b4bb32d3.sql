-- Phase 2B: Complete Material Flow Implementation (Corrected)
-- Priority 1: Complete BOM Foundation - Assign remaining 4 BOM components

-- Get the current unassigned BOM components and assign them to appropriate stages
UPDATE dkegl_bom_components 
SET stage_id = (
  SELECT id FROM dkegl_workflow_stages 
  WHERE organization_id = dkegl_bom_components.organization_id 
  AND stage_name = 'Gravure Printing' 
  LIMIT 1
)
WHERE stage_id IS NULL 
AND component_item_code IN ('PVDC_COAT_25_kg', 'NYL_FILM_12MIC_kg');

UPDATE dkegl_bom_components 
SET stage_id = (
  SELECT id FROM dkegl_workflow_stages 
  WHERE organization_id = dkegl_bom_components.organization_id 
  AND stage_name = 'Lamination Coating' 
  LIMIT 1
)
WHERE stage_id IS NULL 
AND component_item_code IN ('PU_ADH_2K_kg', 'SOL_MEK_kg');

-- Priority 2: Build Missing Functions

-- Function 1: Create Material Transformation
CREATE OR REPLACE FUNCTION public.dkegl_create_material_transformation(
  _org_id UUID,
  _order_id UUID,
  _stage_id UUID,
  _workflow_progress_id UUID,
  _input_item_code TEXT,
  _output_item_code TEXT,
  _input_quantity NUMERIC,
  _output_quantity NUMERIC,
  _yield_percentage NUMERIC,
  _transformation_properties JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  transformation_id UUID;
BEGIN
  -- Insert material transformation record
  INSERT INTO dkegl_material_transformations (
    organization_id,
    order_id,
    stage_id,
    workflow_progress_id,
    input_item_code,
    output_item_code,
    input_quantity,
    output_quantity,
    yield_percentage,
    transformation_properties,
    transformation_date,
    created_at
  ) VALUES (
    _org_id,
    _order_id,
    _stage_id,
    _workflow_progress_id,
    _input_item_code,
    _output_item_code,
    _input_quantity,
    _output_quantity,
    _yield_percentage,
    _transformation_properties,
    CURRENT_DATE,
    now()
  ) RETURNING id INTO transformation_id;
  
  -- Create corresponding stage material output
  INSERT INTO dkegl_stage_material_outputs (
    organization_id,
    order_id,
    stage_id,
    workflow_progress_id,
    item_code,
    planned_quantity,
    actual_quantity,
    yield_percentage,
    transformation_id,
    output_type,
    production_date
  ) VALUES (
    _org_id,
    _order_id,
    _stage_id,
    _workflow_progress_id,
    _output_item_code,
    _output_quantity,
    _output_quantity,
    _yield_percentage,
    transformation_id,
    'processed_material',
    CURRENT_DATE
  );
  
  RETURN transformation_id;
END;
$$;

-- Function 2: Detect Material Shortages
CREATE OR REPLACE FUNCTION public.dkegl_detect_material_shortages(
  _org_id UUID,
  _stage_id UUID,
  _order_id UUID
)
RETURNS TABLE(
  item_code TEXT,
  required_quantity NUMERIC,
  available_quantity NUMERIC,
  shortage_quantity NUMERIC,
  shortage_severity TEXT,
  suggested_action TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH stage_requirements AS (
    -- Get material requirements for the stage from BOM
    SELECT 
      bc.component_item_code,
      bc.quantity_per_unit * o.order_quantity AS required_qty
    FROM dkegl_bom_components bc
    JOIN dkegl_orders o ON o.organization_id = bc.organization_id
    WHERE bc.organization_id = _org_id
      AND bc.stage_id = _stage_id
      AND o.id = _order_id
  ),
  current_stock AS (
    -- Get current available stock
    SELECT 
      s.item_code,
      s.current_qty - COALESCE(s.reserved_qty, 0) AS available_qty
    FROM dkegl_stock s
    WHERE s.organization_id = _org_id
  )
  SELECT 
    sr.component_item_code::TEXT,
    sr.required_qty,
    COALESCE(cs.available_qty, 0),
    GREATEST(sr.required_qty - COALESCE(cs.available_qty, 0), 0) AS shortage_qty,
    CASE 
      WHEN COALESCE(cs.available_qty, 0) >= sr.required_qty THEN 'sufficient'
      WHEN COALESCE(cs.available_qty, 0) >= sr.required_qty * 0.8 THEN 'low'
      WHEN COALESCE(cs.available_qty, 0) >= sr.required_qty * 0.5 THEN 'critical'
      ELSE 'severe'
    END::TEXT AS shortage_severity,
    CASE 
      WHEN COALESCE(cs.available_qty, 0) >= sr.required_qty THEN 'proceed_with_production'
      WHEN COALESCE(cs.available_qty, 0) >= sr.required_qty * 0.8 THEN 'order_additional_stock'
      WHEN COALESCE(cs.available_qty, 0) >= sr.required_qty * 0.5 THEN 'urgent_procurement_required'
      ELSE 'halt_production_until_restocked'
    END::TEXT AS suggested_action
  FROM stage_requirements sr
  LEFT JOIN current_stock cs ON sr.component_item_code = cs.item_code
  WHERE sr.required_qty > COALESCE(cs.available_qty, 0);
END;
$$;

-- Priority 3: Populate Material Flow Tables with existing workflow data

-- Auto-populate stage material inputs from existing workflow progress
INSERT INTO dkegl_stage_material_inputs (
  organization_id,
  order_id,
  stage_id,
  workflow_progress_id,
  item_code,
  planned_quantity,
  actual_quantity,
  unit_cost,
  total_cost,
  input_type,
  quality_status,
  created_at
)
SELECT DISTINCT
  wp.organization_id,
  wp.order_id,
  wp.stage_id,
  wp.id,
  bc.component_item_code,
  bc.quantity_per_unit * o.order_quantity AS planned_qty,
  bc.quantity_per_unit * o.order_quantity AS actual_qty, -- Default to planned
  COALESCE(s.unit_cost, 0) AS unit_cost,
  (bc.quantity_per_unit * o.order_quantity) * COALESCE(s.unit_cost, 0) AS total_cost,
  CASE 
    WHEN bc.material_category IN ('substrate', 'base_material') THEN 'substrate'
    WHEN bc.material_category IN ('ink', 'adhesive', 'coating') THEN 'fresh_material'
    ELSE 'bom_component'
  END AS input_type,
  'approved' AS quality_status,
  now()
FROM dkegl_workflow_progress wp
JOIN dkegl_orders o ON wp.order_id = o.id
JOIN dkegl_bom_components bc ON bc.organization_id = wp.organization_id AND bc.stage_id = wp.stage_id
LEFT JOIN dkegl_stock s ON s.organization_id = wp.organization_id AND s.item_code = bc.component_item_code
WHERE NOT EXISTS (
  SELECT 1 FROM dkegl_stage_material_inputs smi 
  WHERE smi.workflow_progress_id = wp.id 
  AND smi.item_code = bc.component_item_code
);

-- Create stage material outputs with yield calculations
INSERT INTO dkegl_stage_material_outputs (
  organization_id,
  order_id,
  stage_id,
  workflow_progress_id,
  item_code,
  planned_quantity,
  actual_quantity,
  yield_percentage,
  unit_cost,
  total_cost,
  output_type,
  quality_status,
  production_date,
  created_at
)
SELECT DISTINCT
  wp.organization_id,
  wp.order_id,
  wp.stage_id,
  wp.id,
  o.item_code,
  o.order_quantity AS planned_qty,
  o.order_quantity * 0.95 AS actual_qty, -- 95% yield assumption
  95.0 AS yield_percentage,
  COALESCE(s.unit_cost, 0) AS unit_cost,
  (o.order_quantity * 0.95) * COALESCE(s.unit_cost, 0) AS total_cost,
  CASE 
    WHEN ws.stage_name LIKE '%Slitting%' THEN 'slit_material'
    WHEN ws.stage_name LIKE '%Printing%' THEN 'printed_material'
    WHEN ws.stage_name LIKE '%Coating%' THEN 'coated_material'
    WHEN ws.stage_name LIKE '%Packaging%' THEN 'finished_goods'
    ELSE 'processed_material'
  END AS output_type,
  'approved' AS quality_status,
  CURRENT_DATE AS production_date,
  now()
FROM dkegl_workflow_progress wp
JOIN dkegl_orders o ON wp.order_id = o.id
JOIN dkegl_workflow_stages ws ON wp.stage_id = ws.id
LEFT JOIN dkegl_stock s ON s.organization_id = wp.organization_id AND s.item_code = o.item_code
WHERE wp.status = 'completed'
AND NOT EXISTS (
  SELECT 1 FROM dkegl_stage_material_outputs smo 
  WHERE smo.workflow_progress_id = wp.id
);

-- Create sample material transformations for completed stages
INSERT INTO dkegl_material_transformations (
  organization_id,
  order_id,
  stage_id,
  workflow_progress_id,
  input_item_code,
  output_item_code,
  input_quantity,
  output_quantity,
  yield_percentage,
  transformation_properties,
  transformation_date,
  created_at
)
SELECT DISTINCT
  wp.organization_id,
  wp.order_id,
  wp.stage_id,
  wp.id,
  COALESCE(bc.component_item_code, 'SUBSTRATE_BASE') AS input_code,
  o.item_code AS output_code,
  o.order_quantity AS input_qty,
  o.order_quantity * 0.95 AS output_qty,
  95.0 AS yield_percentage,
  jsonb_build_object(
    'process_temperature', 150,
    'process_speed', 100,
    'quality_grade', 'A',
    'waste_percentage', 5.0
  ) AS transformation_properties,
  CURRENT_DATE,
  now()
FROM dkegl_workflow_progress wp
JOIN dkegl_orders o ON wp.order_id = o.id
LEFT JOIN dkegl_bom_components bc ON bc.organization_id = wp.organization_id AND bc.stage_id = wp.stage_id
WHERE wp.status = 'completed'
AND NOT EXISTS (
  SELECT 1 FROM dkegl_material_transformations mt 
  WHERE mt.workflow_progress_id = wp.id
)
LIMIT 20; -- Start with 20 sample transformations

-- Create material balance validation function
CREATE OR REPLACE FUNCTION public.dkegl_validate_material_balance(
  _workflow_progress_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  balance_result JSONB := '{"valid": true, "issues": []}';
  total_inputs NUMERIC := 0;
  total_outputs NUMERIC := 0;
  balance_variance NUMERIC;
  issues TEXT[] := '{}';
BEGIN
  -- Calculate total material inputs
  SELECT COALESCE(SUM(actual_quantity), 0) INTO total_inputs
  FROM dkegl_stage_material_inputs
  WHERE workflow_progress_id = _workflow_progress_id;
  
  -- Calculate total material outputs
  SELECT COALESCE(SUM(actual_quantity), 0) INTO total_outputs
  FROM dkegl_stage_material_outputs
  WHERE workflow_progress_id = _workflow_progress_id;
  
  -- Calculate variance percentage
  IF total_inputs > 0 THEN
    balance_variance := ABS((total_outputs - total_inputs) / total_inputs * 100);
  ELSE
    balance_variance := 0;
  END IF;
  
  -- Check for balance issues
  IF balance_variance > 10 THEN
    issues := array_append(issues, FORMAT('High material balance variance: %.2f%%', balance_variance));
  END IF;
  
  IF total_inputs = 0 THEN
    issues := array_append(issues, 'No material inputs recorded');
  END IF;
  
  IF total_outputs = 0 THEN
    issues := array_append(issues, 'No material outputs recorded');
  END IF;
  
  -- Build result
  balance_result := jsonb_build_object(
    'valid', array_length(issues, 1) IS NULL,
    'total_inputs', total_inputs,
    'total_outputs', total_outputs,
    'balance_variance_percent', balance_variance,
    'issues', to_jsonb(issues)
  );
  
  RETURN balance_result;
END;
$$;