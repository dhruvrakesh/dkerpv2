-- Phase 1: BOM Master Data Structure
-- Create BOM Master table for linking FG items to their BOMs
CREATE TABLE public.dkegl_bom_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  item_code TEXT NOT NULL,
  bom_version VARCHAR(20) NOT NULL DEFAULT '1.0',
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  is_active BOOLEAN DEFAULT true,
  total_material_cost NUMERIC DEFAULT 0,
  total_labor_cost NUMERIC DEFAULT 0,
  total_overhead_cost NUMERIC DEFAULT 0,
  yield_percentage NUMERIC DEFAULT 100,
  scrap_percentage NUMERIC DEFAULT 0,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  bom_notes TEXT,
  approval_status TEXT DEFAULT 'draft' CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected'))
);

-- Create BOM Components table for detailed component requirements
CREATE TABLE public.dkegl_bom_components (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  bom_master_id UUID NOT NULL REFERENCES dkegl_bom_master(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES dkegl_workflow_stages(id),
  component_item_code TEXT NOT NULL,
  quantity_per_unit NUMERIC NOT NULL DEFAULT 1,
  uom TEXT DEFAULT 'PCS',
  consumption_type TEXT DEFAULT 'direct' CHECK (consumption_type IN ('direct', 'indirect', 'byproduct')),
  is_critical BOOLEAN DEFAULT false,
  waste_percentage NUMERIC DEFAULT 0,
  substitute_items JSONB DEFAULT '[]',
  stage_sequence INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  component_notes TEXT
);

-- Create Material Reservations table for stock allocation
CREATE TABLE public.dkegl_material_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES dkegl_orders(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  reserved_quantity NUMERIC NOT NULL DEFAULT 0,
  allocated_quantity NUMERIC DEFAULT 0,
  consumed_quantity NUMERIC DEFAULT 0,
  reservation_status TEXT DEFAULT 'reserved' CHECK (reservation_status IN ('reserved', 'allocated', 'consumed', 'released')),
  reserved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  allocated_at TIMESTAMP WITH TIME ZONE,
  consumed_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reservation_notes TEXT
);

-- Create indexes for performance
CREATE INDEX idx_dkegl_bom_master_item_code ON dkegl_bom_master(organization_id, item_code);
CREATE INDEX idx_dkegl_bom_master_active ON dkegl_bom_master(organization_id, is_active, effective_from, effective_until);
CREATE INDEX idx_dkegl_bom_components_bom_master ON dkegl_bom_components(bom_master_id);
CREATE INDEX idx_dkegl_bom_components_stage ON dkegl_bom_components(stage_id, stage_sequence);
CREATE INDEX idx_dkegl_material_reservations_order ON dkegl_material_reservations(organization_id, order_id);
CREATE INDEX idx_dkegl_material_reservations_item ON dkegl_material_reservations(organization_id, item_code, reservation_status);

-- Add unique constraints
ALTER TABLE dkegl_bom_master ADD CONSTRAINT uk_dkegl_bom_master_version 
  UNIQUE (organization_id, item_code, bom_version);

ALTER TABLE dkegl_bom_components ADD CONSTRAINT uk_dkegl_bom_components_stage_item 
  UNIQUE (bom_master_id, stage_id, component_item_code);

-- Enable RLS
ALTER TABLE dkegl_bom_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_bom_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_material_reservations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "DKEGL organization members can access BOM master" 
ON dkegl_bom_master FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "DKEGL organization members can access BOM components" 
ON dkegl_bom_components FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "DKEGL organization members can access material reservations" 
ON dkegl_material_reservations FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Create function to get active BOM for an item
CREATE OR REPLACE FUNCTION public.dkegl_get_active_bom(_org_id UUID, _item_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  bom_id UUID;
BEGIN
  SELECT id INTO bom_id
  FROM dkegl_bom_master
  WHERE organization_id = _org_id
    AND item_code = _item_code
    AND is_active = true
    AND approval_status = 'approved'
    AND effective_from <= CURRENT_DATE
    AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
  ORDER BY bom_version DESC
  LIMIT 1;
  
  RETURN bom_id;
END;
$function$;

-- Create BOM explosion function to calculate material requirements
CREATE OR REPLACE FUNCTION public.dkegl_explode_bom(_org_id UUID, _item_code TEXT, _quantity NUMERIC)
RETURNS TABLE(
  component_item_code TEXT,
  component_item_name TEXT,
  total_quantity_required NUMERIC,
  stage_id UUID,
  stage_name TEXT,
  consumption_type TEXT,
  is_critical BOOLEAN,
  waste_percentage NUMERIC,
  net_requirement NUMERIC,
  available_stock NUMERIC,
  shortage_quantity NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  bom_id UUID;
  yield_factor NUMERIC := 1;
BEGIN
  -- Get active BOM
  bom_id := dkegl_get_active_bom(_org_id, _item_code);
  
  IF bom_id IS NULL THEN
    RAISE NOTICE 'No active BOM found for item: %', _item_code;
    RETURN;
  END IF;
  
  -- Get yield factor
  SELECT (yield_percentage / 100.0) INTO yield_factor
  FROM dkegl_bom_master
  WHERE id = bom_id;
  
  -- Return exploded BOM with shortage analysis
  RETURN QUERY
  SELECT 
    bc.component_item_code,
    im.item_name as component_item_name,
    (bc.quantity_per_unit * _quantity / COALESCE(yield_factor, 1)) * (1 + COALESCE(bc.waste_percentage, 0) / 100) as total_quantity_required,
    bc.stage_id,
    ws.stage_name,
    bc.consumption_type,
    bc.is_critical,
    bc.waste_percentage,
    -- Net requirement considering waste
    (bc.quantity_per_unit * _quantity / COALESCE(yield_factor, 1)) * (1 + COALESCE(bc.waste_percentage, 0) / 100) as net_requirement,
    COALESCE(s.current_qty - s.reserved_qty, 0) as available_stock,
    GREATEST(
      (bc.quantity_per_unit * _quantity / COALESCE(yield_factor, 1)) * (1 + COALESCE(bc.waste_percentage, 0) / 100) - 
      COALESCE(s.current_qty - s.reserved_qty, 0), 
      0
    ) as shortage_quantity
  FROM dkegl_bom_components bc
  LEFT JOIN dkegl_item_master im ON bc.organization_id = im.organization_id AND bc.component_item_code = im.item_code
  LEFT JOIN dkegl_workflow_stages ws ON bc.stage_id = ws.id
  LEFT JOIN dkegl_stock s ON bc.organization_id = s.organization_id AND bc.component_item_code = s.item_code
  WHERE bc.bom_master_id = bom_id
  ORDER BY bc.stage_sequence, bc.component_item_code;
END;
$function$;

-- Create function to reserve materials for an order
CREATE OR REPLACE FUNCTION public.dkegl_reserve_order_materials(_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  order_data RECORD;
  reservation_results JSONB := '{"success": true, "reservations": [], "warnings": []}';
  material_req RECORD;
  reservation_id UUID;
  warnings TEXT[] := '{}';
BEGIN
  -- Get order details
  SELECT organization_id, item_code, order_quantity
  INTO order_data
  FROM dkegl_orders
  WHERE id = _order_id;
  
  IF NOT FOUND THEN
    RETURN '{"success": false, "error": "Order not found"}';
  END IF;
  
  -- Get material requirements from BOM explosion
  FOR material_req IN 
    SELECT * FROM dkegl_explode_bom(order_data.organization_id, order_data.item_code, order_data.order_quantity)
  LOOP
    -- Check for shortages
    IF material_req.shortage_quantity > 0 THEN
      warnings := array_append(warnings, 
        FORMAT('Shortage of %s units for %s (%s)', 
          material_req.shortage_quantity, 
          material_req.component_item_code,
          material_req.component_item_name
        )
      );
    END IF;
    
    -- Create reservation record
    INSERT INTO dkegl_material_reservations (
      organization_id,
      order_id,
      item_code,
      reserved_quantity,
      reservation_status
    ) VALUES (
      order_data.organization_id,
      _order_id,
      material_req.component_item_code,
      material_req.net_requirement,
      CASE WHEN material_req.shortage_quantity > 0 THEN 'reserved' ELSE 'reserved' END
    ) RETURNING id INTO reservation_id;
    
    -- Update stock reserved quantity
    UPDATE dkegl_stock
    SET reserved_qty = COALESCE(reserved_qty, 0) + LEAST(material_req.net_requirement, COALESCE(current_qty, 0))
    WHERE organization_id = order_data.organization_id 
      AND item_code = material_req.component_item_code;
  END LOOP;
  
  -- Update results
  reservation_results := jsonb_set(reservation_results, '{warnings}', to_jsonb(warnings));
  reservation_results := jsonb_set(reservation_results, '{order_id}', to_jsonb(_order_id));
  reservation_results := jsonb_set(reservation_results, '{reserved_at}', to_jsonb(now()));
  
  RETURN reservation_results;
END;
$function$;

-- Create trigger to auto-reserve materials when order is approved
CREATE OR REPLACE FUNCTION public.dkegl_auto_reserve_materials()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Auto-reserve materials when order status changes to approved
  IF OLD.status != NEW.status AND NEW.status = 'approved' THEN
    PERFORM dkegl_reserve_order_materials(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER dkegl_orders_auto_reserve_materials
  AFTER UPDATE ON dkegl_orders
  FOR EACH ROW
  EXECUTE FUNCTION dkegl_auto_reserve_materials();