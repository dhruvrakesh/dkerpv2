-- Create missing vendor performance table
CREATE TABLE IF NOT EXISTS dkegl_vendor_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  vendor_id UUID NOT NULL,
  evaluation_period_start DATE NOT NULL,
  evaluation_period_end DATE NOT NULL,
  total_orders INTEGER DEFAULT 0,
  on_time_deliveries INTEGER DEFAULT 0,
  quality_issues INTEGER DEFAULT 0,
  total_order_value NUMERIC DEFAULT 0,
  average_delivery_days NUMERIC DEFAULT 0,
  overall_score NUMERIC DEFAULT 0,
  delivery_score NUMERIC DEFAULT 0,
  quality_score NUMERIC DEFAULT 0,
  pricing_score NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, vendor_id, evaluation_period_start, evaluation_period_end)
);

-- Enable RLS
ALTER TABLE dkegl_vendor_performance ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Organization members can access vendor performance"
ON dkegl_vendor_performance
FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Create missing RFQ tables
CREATE TABLE IF NOT EXISTS dkegl_rfq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  rfq_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'in_progress', 'completed', 'cancelled')),
  issue_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, rfq_number)
);

CREATE TABLE IF NOT EXISTS dkegl_rfq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  rfq_id UUID NOT NULL REFERENCES dkegl_rfq(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  item_description TEXT,
  quantity NUMERIC NOT NULL,
  uom TEXT DEFAULT 'PCS',
  specifications JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for RFQ tables
ALTER TABLE dkegl_rfq ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_rfq_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for RFQ
CREATE POLICY "Organization members can access RFQ"
ON dkegl_rfq
FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "Organization members can access RFQ items"
ON dkegl_rfq_items
FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Create procurement analytics function
CREATE OR REPLACE FUNCTION dkegl_get_procurement_analytics(_org_id UUID, _days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  total_vendors INTEGER,
  active_vendors INTEGER,
  total_spend NUMERIC,
  avg_order_value NUMERIC,
  on_time_delivery_rate NUMERIC,
  active_rfqs INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM dkegl_vendors WHERE organization_id = _org_id) as total_vendors,
    (SELECT COUNT(*)::INTEGER FROM dkegl_vendors WHERE organization_id = _org_id AND is_active = true) as active_vendors,
    COALESCE((SELECT SUM(total_amount) FROM dkegl_grn_log WHERE organization_id = _org_id AND date >= CURRENT_DATE - INTERVAL '1 day' * _days_back), 0) as total_spend,
    COALESCE((SELECT AVG(total_amount) FROM dkegl_grn_log WHERE organization_id = _org_id AND date >= CURRENT_DATE - INTERVAL '1 day' * _days_back), 0) as avg_order_value,
    COALESCE((SELECT 
      CASE WHEN COUNT(*) > 0 
           THEN COUNT(*) FILTER (WHERE quality_status = 'approved')::NUMERIC / COUNT(*)::NUMERIC * 100 
           ELSE 0 END
      FROM dkegl_grn_log WHERE organization_id = _org_id AND date >= CURRENT_DATE - INTERVAL '1 day' * _days_back), 0) as on_time_delivery_rate,
    (SELECT COUNT(*)::INTEGER FROM dkegl_rfq WHERE organization_id = _org_id AND status IN ('sent', 'in_progress')) as active_rfqs;
END;
$function$;