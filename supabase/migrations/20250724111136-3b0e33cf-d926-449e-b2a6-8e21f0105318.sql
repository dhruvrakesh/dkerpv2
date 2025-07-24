-- Enhanced Pricing Master System Implementation
-- Creates dual-pricing architecture with audit trail for stock valuations

-- 1. Create Pricing Master Table
CREATE TABLE public.dkegl_pricing_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  item_code TEXT NOT NULL,
  valuation_method TEXT NOT NULL DEFAULT 'standard_cost' CHECK (valuation_method IN ('standard_cost', 'weighted_average', 'fifo', 'manual_override')),
  standard_cost NUMERIC(15,4) NOT NULL DEFAULT 0,
  current_weighted_avg NUMERIC(15,4) DEFAULT 0,
  last_grn_price NUMERIC(15,4) DEFAULT 0,
  price_tolerance_percentage NUMERIC(5,2) DEFAULT 10.00,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  is_active BOOLEAN DEFAULT true,
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  pricing_notes TEXT,
  version_number INTEGER DEFAULT 1,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(organization_id, item_code, version_number),
  CONSTRAINT valid_effective_dates CHECK (effective_until IS NULL OR effective_until >= effective_from)
);

-- Enable RLS
ALTER TABLE public.dkegl_pricing_master ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "DKEGL organization members can access pricing master" 
ON public.dkegl_pricing_master 
FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- 2. Create Pricing Audit Log Table
CREATE TABLE public.dkegl_pricing_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  pricing_master_id UUID REFERENCES dkegl_pricing_master(id),
  item_code TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'APPROVE', 'REJECT', 'ARCHIVE')),
  old_values JSONB,
  new_values JSONB,
  change_reason TEXT,
  business_justification TEXT,
  impact_analysis JSONB DEFAULT '{}',
  user_id UUID DEFAULT auth.uid(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dkegl_pricing_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "DKEGL organization members can view pricing audit" 
ON public.dkegl_pricing_audit_log 
FOR SELECT 
USING (organization_id = dkegl_get_current_user_org());

CREATE POLICY "DKEGL system can create audit records" 
ON public.dkegl_pricing_audit_log 
FOR INSERT 
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- 3. Create Pricing Variance Alerts Table
CREATE TABLE public.dkegl_pricing_variance_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  item_code TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('grn_variance', 'market_change', 'cost_increase', 'manual_review')),
  current_master_price NUMERIC(15,4),
  new_market_price NUMERIC(15,4),
  variance_percentage NUMERIC(8,4),
  grn_reference TEXT,
  alert_severity TEXT DEFAULT 'medium' CHECK (alert_severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  alert_data JSONB DEFAULT '{}',
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dkegl_pricing_variance_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "DKEGL organization members can access variance alerts" 
ON public.dkegl_pricing_variance_alerts 
FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- 4. Modify Stock Table - Add pricing master reference and remove calculated total_value
ALTER TABLE public.dkegl_stock ADD COLUMN IF NOT EXISTS pricing_method TEXT DEFAULT 'standard_cost';
ALTER TABLE public.dkegl_stock ADD COLUMN IF NOT EXISTS last_valuation_date DATE DEFAULT CURRENT_DATE;
-- Remove total_value column that was causing issues
ALTER TABLE public.dkegl_stock DROP COLUMN IF EXISTS total_value;

-- 5. Create Pricing Master Functions

-- Function to get current active pricing for an item
CREATE OR REPLACE FUNCTION public.dkegl_get_current_item_pricing(_org_id UUID, _item_code TEXT)
RETURNS TABLE(
  standard_cost NUMERIC,
  valuation_method TEXT,
  last_updated TIMESTAMP WITH TIME ZONE,
  approved_by UUID,
  price_tolerance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pm.standard_cost,
    pm.valuation_method,
    pm.updated_at,
    pm.approved_by,
    pm.price_tolerance_percentage
  FROM dkegl_pricing_master pm
  WHERE pm.organization_id = _org_id
    AND pm.item_code = _item_code
    AND pm.is_active = true
    AND pm.approval_status = 'approved'
    AND pm.effective_from <= CURRENT_DATE
    AND (pm.effective_until IS NULL OR pm.effective_until >= CURRENT_DATE)
  ORDER BY pm.version_number DESC
  LIMIT 1;
END;
$$;

-- Function to calculate stock valuation using pricing master
CREATE OR REPLACE FUNCTION public.dkegl_calculate_stock_valuation(_org_id UUID, _item_code TEXT, _quantity NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pricing_data RECORD;
  valuation_amount NUMERIC := 0;
BEGIN
  -- Get current pricing
  SELECT * INTO pricing_data 
  FROM dkegl_get_current_item_pricing(_org_id, _item_code);
  
  IF pricing_data IS NULL THEN
    -- Fallback to item master cost if no pricing master entry
    SELECT COALESCE((pricing_info->>'unit_cost')::NUMERIC, 0) INTO valuation_amount
    FROM dkegl_item_master 
    WHERE organization_id = _org_id AND item_code = _item_code;
    
    RETURN _quantity * COALESCE(valuation_amount, 0);
  END IF;
  
  -- Calculate based on valuation method
  CASE pricing_data.valuation_method
    WHEN 'standard_cost' THEN
      valuation_amount := pricing_data.standard_cost;
    WHEN 'weighted_average' THEN
      -- Calculate weighted average from recent GRNs
      SELECT COALESCE(AVG(
        CASE WHEN qty_received > 0 AND total_amount > 0 
             THEN total_amount / qty_received 
             ELSE pricing_data.standard_cost END
      ), pricing_data.standard_cost)
      INTO valuation_amount
      FROM dkegl_grn_log
      WHERE organization_id = _org_id 
        AND item_code = _item_code
        AND date >= CURRENT_DATE - INTERVAL '90 days';
    WHEN 'fifo' THEN
      -- For now, use standard cost (FIFO requires more complex inventory tracking)
      valuation_amount := pricing_data.standard_cost;
    ELSE
      valuation_amount := pricing_data.standard_cost;
  END CASE;
  
  RETURN _quantity * COALESCE(valuation_amount, 0);
END;
$$;

-- Function to detect and create variance alerts
CREATE OR REPLACE FUNCTION public.dkegl_detect_pricing_variance(_org_id UUID, _item_code TEXT, _grn_price NUMERIC, _grn_reference TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pricing_data RECORD;
  variance_pct NUMERIC;
  alert_severity TEXT := 'low';
BEGIN
  -- Get current pricing master
  SELECT * INTO pricing_data 
  FROM dkegl_get_current_item_pricing(_org_id, _item_code);
  
  IF pricing_data IS NULL OR pricing_data.standard_cost = 0 THEN
    RETURN; -- No pricing master or zero cost, skip variance check
  END IF;
  
  -- Calculate variance percentage
  variance_pct := ABS((_grn_price - pricing_data.standard_cost) / pricing_data.standard_cost * 100);
  
  -- Only create alert if variance exceeds tolerance
  IF variance_pct > pricing_data.price_tolerance THEN
    -- Determine severity
    IF variance_pct > pricing_data.price_tolerance * 3 THEN
      alert_severity := 'critical';
    ELSIF variance_pct > pricing_data.price_tolerance * 2 THEN
      alert_severity := 'high';
    ELSIF variance_pct > pricing_data.price_tolerance * 1.5 THEN
      alert_severity := 'medium';
    END IF;
    
    -- Create variance alert
    INSERT INTO dkegl_pricing_variance_alerts (
      organization_id,
      item_code,
      alert_type,
      current_master_price,
      new_market_price,
      variance_percentage,
      grn_reference,
      alert_severity,
      alert_data
    ) VALUES (
      _org_id,
      _item_code,
      'grn_variance',
      pricing_data.standard_cost,
      _grn_price,
      variance_pct,
      _grn_reference,
      alert_severity,
      jsonb_build_object(
        'tolerance_percentage', pricing_data.price_tolerance,
        'valuation_method', pricing_data.valuation_method,
        'detected_at', now()
      )
    );
  END IF;
END;
$$;

-- 6. Create Audit Trigger for Pricing Master
CREATE OR REPLACE FUNCTION public.dkegl_audit_pricing_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log pricing changes
  IF TG_OP = 'INSERT' THEN
    INSERT INTO dkegl_pricing_audit_log (
      organization_id,
      pricing_master_id,
      item_code,
      action,
      new_values,
      change_reason
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      NEW.item_code,
      'CREATE',
      to_jsonb(NEW),
      'New pricing master entry created'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO dkegl_pricing_audit_log (
      organization_id,
      pricing_master_id,
      item_code,
      action,
      old_values,
      new_values,
      change_reason
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      NEW.item_code,
      CASE 
        WHEN OLD.approval_status != NEW.approval_status THEN NEW.approval_status::TEXT
        ELSE 'UPDATE'
      END,
      to_jsonb(OLD),
      to_jsonb(NEW),
      CASE 
        WHEN OLD.standard_cost != NEW.standard_cost THEN 'Standard cost updated'
        WHEN OLD.approval_status != NEW.approval_status THEN 'Approval status changed'
        ELSE 'Pricing master updated'
      END
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger
CREATE TRIGGER dkegl_pricing_audit_trigger
  AFTER INSERT OR UPDATE ON dkegl_pricing_master
  FOR EACH ROW EXECUTE FUNCTION dkegl_audit_pricing_changes();

-- 7. Modify GRN trigger to include variance detection
CREATE OR REPLACE FUNCTION public.dkegl_update_stock_on_grn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  unit_price NUMERIC := 0;
BEGIN
  -- Calculate unit price if total amount provided
  IF NEW.total_amount > 0 AND NEW.qty_received > 0 THEN
    unit_price := NEW.total_amount / NEW.qty_received;
  END IF;

  -- Update stock
  INSERT INTO dkegl_stock (organization_id, item_code, current_qty, unit_cost, last_transaction_date, last_updated)
  VALUES (NEW.organization_id, NEW.item_code, NEW.qty_received, unit_price, NEW.date, now())
  ON CONFLICT (organization_id, item_code, location)
  DO UPDATE SET 
    current_qty = dkegl_stock.current_qty + NEW.qty_received,
    unit_cost = CASE 
      WHEN unit_price > 0 THEN unit_price 
      ELSE dkegl_stock.unit_cost 
    END,
    last_transaction_date = NEW.date,
    last_updated = now();
  
  -- Check for pricing variance if unit price available
  IF unit_price > 0 THEN
    PERFORM dkegl_detect_pricing_variance(
      NEW.organization_id, 
      NEW.item_code, 
      unit_price, 
      NEW.grn_number
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 8. Create indexes for performance
CREATE INDEX idx_dkegl_pricing_master_org_item ON dkegl_pricing_master(organization_id, item_code);
CREATE INDEX idx_dkegl_pricing_master_active ON dkegl_pricing_master(organization_id, is_active, approval_status);
CREATE INDEX idx_dkegl_pricing_audit_item ON dkegl_pricing_audit_log(organization_id, item_code, created_at);
CREATE INDEX idx_dkegl_variance_alerts_status ON dkegl_pricing_variance_alerts(organization_id, status, alert_severity);

-- 9. Create initial pricing master entries for existing items
INSERT INTO dkegl_pricing_master (
  organization_id,
  item_code,
  standard_cost,
  valuation_method,
  approval_status,
  approved_by,
  approved_at,
  pricing_notes,
  created_by
)
SELECT DISTINCT
  im.organization_id,
  im.item_code,
  COALESCE((im.pricing_info->>'unit_cost')::NUMERIC, 0) as standard_cost,
  'standard_cost' as valuation_method,
  'approved' as approval_status,
  auth.uid() as approved_by,
  now() as approved_at,
  'Migrated from item master during pricing system implementation' as pricing_notes,
  auth.uid() as created_by
FROM dkegl_item_master im
WHERE im.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM dkegl_pricing_master pm 
    WHERE pm.organization_id = im.organization_id 
      AND pm.item_code = im.item_code
  )
ON CONFLICT (organization_id, item_code, version_number) DO NOTHING;

-- 10. Update triggers
CREATE TRIGGER dkegl_pricing_master_updated_at
  BEFORE UPDATE ON dkegl_pricing_master
  FOR EACH ROW EXECUTE FUNCTION dkegl_update_timestamp();

CREATE TRIGGER dkegl_pricing_variance_updated_at
  BEFORE UPDATE ON dkegl_pricing_variance_alerts
  FOR EACH ROW EXECUTE FUNCTION dkegl_update_timestamp();