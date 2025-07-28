-- Step 1: Complete Database Schema Enhancement

-- Enhance dkegl_vendors table with missing fields
ALTER TABLE dkegl_vendors 
ADD COLUMN IF NOT EXISTS supplier_type TEXT DEFAULT 'VENDOR' CHECK (supplier_type IN ('MANUFACTURER', 'DISTRIBUTOR', 'VENDOR', 'AGENT')),
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES dkegl_vendor_categories(id),
ADD COLUMN IF NOT EXISTS performance_rating NUMERIC DEFAULT 0 CHECK (performance_rating >= 0 AND performance_rating <= 5),
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'under_review')),
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tax_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS address_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS quality_rating NUMERIC DEFAULT 0 CHECK (quality_rating >= 0 AND quality_rating <= 5),
ADD COLUMN IF NOT EXISTS delivery_rating NUMERIC DEFAULT 0 CHECK (delivery_rating >= 0 AND delivery_rating <= 5),
ADD COLUMN IF NOT EXISTS pricing_rating NUMERIC DEFAULT 0 CHECK (pricing_rating >= 0 AND pricing_rating <= 5),
ADD COLUMN IF NOT EXISTS last_performance_update TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS vendor_code TEXT;

-- Create unique constraint for vendor codes per organization
CREATE UNIQUE INDEX IF NOT EXISTS idx_dkegl_vendors_org_code 
ON dkegl_vendors(organization_id, vendor_code) 
WHERE vendor_code IS NOT NULL;

-- Create RFQ table
CREATE TABLE IF NOT EXISTS dkegl_rfq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  rfq_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'responses_received', 'evaluated', 'awarded', 'cancelled')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  submission_deadline TIMESTAMPTZ,
  evaluation_criteria JSONB DEFAULT '{}',
  terms_conditions TEXT,
  total_estimated_value NUMERIC DEFAULT 0,
  currency_code TEXT DEFAULT 'INR',
  priority_level TEXT DEFAULT 'medium' CHECK (priority_level IN ('low', 'medium', 'high', 'urgent')),
  awarded_vendor_id UUID,
  awarded_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  UNIQUE(organization_id, rfq_number)
);

-- Enable RLS on RFQ table
ALTER TABLE dkegl_rfq ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for RFQ
CREATE POLICY "DKEGL organization members can access RFQ"
ON dkegl_rfq FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Create RFQ items table
CREATE TABLE IF NOT EXISTS dkegl_rfq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  rfq_id UUID NOT NULL REFERENCES dkegl_rfq(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  item_description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  uom TEXT DEFAULT 'PCS',
  estimated_unit_price NUMERIC DEFAULT 0,
  specifications TEXT,
  delivery_requirements TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on RFQ items table
ALTER TABLE dkegl_rfq_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for RFQ items
CREATE POLICY "DKEGL organization members can access RFQ items"
ON dkegl_rfq_items FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Create vendor performance table
CREATE TABLE IF NOT EXISTS dkegl_vendor_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  vendor_id UUID NOT NULL REFERENCES dkegl_vendors(id) ON DELETE CASCADE,
  evaluation_period_start DATE NOT NULL,
  evaluation_period_end DATE NOT NULL,
  total_orders INTEGER DEFAULT 0,
  on_time_deliveries INTEGER DEFAULT 0,
  quality_issues INTEGER DEFAULT 0,
  total_order_value NUMERIC DEFAULT 0,
  average_delivery_days NUMERIC DEFAULT 0,
  defect_rate NUMERIC DEFAULT 0,
  price_variance_percentage NUMERIC DEFAULT 0,
  overall_score NUMERIC DEFAULT 0 CHECK (overall_score >= 0 AND overall_score <= 5),
  delivery_score NUMERIC DEFAULT 0 CHECK (delivery_score >= 0 AND delivery_score <= 5),
  quality_score NUMERIC DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 5),
  pricing_score NUMERIC DEFAULT 0 CHECK (pricing_score >= 0 AND pricing_score <= 5),
  communication_score NUMERIC DEFAULT 0 CHECK (communication_score >= 0 AND communication_score <= 5),
  evaluator_notes TEXT,
  evaluated_by UUID,
  evaluated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, vendor_id, evaluation_period_start, evaluation_period_end)
);

-- Enable RLS on vendor performance table
ALTER TABLE dkegl_vendor_performance ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for vendor performance
CREATE POLICY "DKEGL organization members can access vendor performance"
ON dkegl_vendor_performance FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Create vendor quotes table for RFQ responses
CREATE TABLE IF NOT EXISTS dkegl_vendor_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  rfq_id UUID NOT NULL REFERENCES dkegl_rfq(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES dkegl_vendors(id) ON DELETE CASCADE,
  quote_number TEXT,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'accepted', 'rejected', 'shortlisted')),
  total_quote_value NUMERIC DEFAULT 0,
  currency_code TEXT DEFAULT 'INR',
  validity_period INTEGER DEFAULT 30, -- days
  payment_terms TEXT,
  delivery_terms TEXT,
  submission_date TIMESTAMPTZ DEFAULT now(),
  evaluation_score NUMERIC DEFAULT 0,
  evaluation_notes TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, rfq_id, vendor_id)
);

-- Enable RLS on vendor quotes table
ALTER TABLE dkegl_vendor_quotes ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for vendor quotes
CREATE POLICY "DKEGL organization members can access vendor quotes"
ON dkegl_vendor_quotes FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Create quote items table
CREATE TABLE IF NOT EXISTS dkegl_quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  quote_id UUID NOT NULL REFERENCES dkegl_vendor_quotes(id) ON DELETE CASCADE,
  rfq_item_id UUID NOT NULL REFERENCES dkegl_rfq_items(id) ON DELETE CASCADE,
  quoted_unit_price NUMERIC NOT NULL DEFAULT 0,
  quoted_quantity NUMERIC NOT NULL DEFAULT 0,
  delivery_leadtime_days INTEGER DEFAULT 0,
  item_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on quote items table
ALTER TABLE dkegl_quote_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for quote items
CREATE POLICY "DKEGL organization members can access quote items"
ON dkegl_quote_items FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Function to auto-generate vendor codes
CREATE OR REPLACE FUNCTION dkegl_generate_vendor_code(_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org_code TEXT;
  vendor_count INTEGER;
  new_vendor_code TEXT;
BEGIN
  -- Get organization code
  SELECT code INTO org_code 
  FROM dkegl_organizations 
  WHERE id = _org_id;
  
  IF org_code IS NULL THEN
    org_code := 'ORG';
  END IF;
  
  -- Get current vendor count for this organization
  SELECT COUNT(*) INTO vendor_count
  FROM dkegl_vendors 
  WHERE organization_id = _org_id 
  AND vendor_code IS NOT NULL;
  
  -- Generate new vendor code
  new_vendor_code := org_code || '-V-' || LPAD((vendor_count + 1)::TEXT, 4, '0');
  
  -- Ensure uniqueness
  WHILE EXISTS (
    SELECT 1 FROM dkegl_vendors 
    WHERE organization_id = _org_id 
    AND vendor_code = new_vendor_code
  ) LOOP
    vendor_count := vendor_count + 1;
    new_vendor_code := org_code || '-V-' || LPAD((vendor_count + 1)::TEXT, 4, '0');
  END LOOP;
  
  RETURN new_vendor_code;
END;
$$;

-- Function to calculate vendor performance
CREATE OR REPLACE FUNCTION dkegl_calculate_vendor_performance(_vendor_id UUID, _start_date DATE, _end_date DATE)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_orders INTEGER := 0;
  on_time_orders INTEGER := 0;
  total_value NUMERIC := 0;
  quality_issues INTEGER := 0;
  avg_delivery_days NUMERIC := 0;
  delivery_score NUMERIC := 0;
  quality_score NUMERIC := 0;
  pricing_score NUMERIC := 0;
  overall_score NUMERIC := 0;
  vendor_org_id UUID;
BEGIN
  -- Get vendor's organization
  SELECT organization_id INTO vendor_org_id 
  FROM dkegl_vendors 
  WHERE id = _vendor_id;
  
  -- Calculate metrics from purchase orders and GRN data
  SELECT 
    COUNT(*),
    SUM(CASE WHEN grn.date <= po.expected_delivery_date THEN 1 ELSE 0 END),
    SUM(poi.total_amount),
    SUM(CASE WHEN grn.quality_status = 'failed' THEN 1 ELSE 0 END),
    AVG(grn.date - po.order_date)
  INTO total_orders, on_time_orders, total_value, quality_issues, avg_delivery_days
  FROM dkegl_purchase_orders po
  JOIN dkegl_po_items poi ON po.id = poi.purchase_order_id
  LEFT JOIN dkegl_grn_log grn ON poi.item_code = grn.item_code 
    AND grn.date BETWEEN po.order_date AND po.order_date + INTERVAL '90 days'
  WHERE po.vendor_id = _vendor_id
  AND po.order_date BETWEEN _start_date AND _end_date
  AND po.organization_id = vendor_org_id;
  
  -- Calculate scores (0-5 scale)
  delivery_score := CASE 
    WHEN total_orders = 0 THEN 3
    ELSE LEAST(5, (on_time_orders::NUMERIC / total_orders) * 5)
  END;
  
  quality_score := CASE 
    WHEN total_orders = 0 THEN 3
    ELSE GREATEST(0, 5 - (quality_issues::NUMERIC / total_orders) * 5)
  END;
  
  pricing_score := 3.5; -- Simplified, would need market price comparison
  
  -- Calculate overall score (weighted average)
  overall_score := (delivery_score * 0.4 + quality_score * 0.4 + pricing_score * 0.2);
  
  -- Insert or update performance record
  INSERT INTO dkegl_vendor_performance (
    organization_id, vendor_id, evaluation_period_start, evaluation_period_end,
    total_orders, on_time_deliveries, quality_issues, total_order_value,
    average_delivery_days, overall_score, delivery_score, quality_score, pricing_score
  ) VALUES (
    vendor_org_id, _vendor_id, _start_date, _end_date,
    total_orders, on_time_orders, quality_issues, total_value,
    avg_delivery_days, overall_score, delivery_score, quality_score, pricing_score
  )
  ON CONFLICT (organization_id, vendor_id, evaluation_period_start, evaluation_period_end)
  DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    on_time_deliveries = EXCLUDED.on_time_deliveries,
    quality_issues = EXCLUDED.quality_issues,
    total_order_value = EXCLUDED.total_order_value,
    average_delivery_days = EXCLUDED.average_delivery_days,
    overall_score = EXCLUDED.overall_score,
    delivery_score = EXCLUDED.delivery_score,
    quality_score = EXCLUDED.quality_score,
    pricing_score = EXCLUDED.pricing_score,
    updated_at = now();
  
  -- Update vendor's current performance rating
  UPDATE dkegl_vendors 
  SET 
    performance_rating = overall_score,
    quality_rating = quality_score,
    delivery_rating = delivery_score,
    pricing_rating = pricing_score,
    last_performance_update = now()
  WHERE id = _vendor_id;
  
  RETURN overall_score;
END;
$$;

-- Function to get procurement analytics
CREATE OR REPLACE FUNCTION dkegl_get_procurement_analytics(_org_id UUID, _days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  total_vendors BIGINT,
  active_vendors BIGINT,
  total_spend NUMERIC,
  average_order_value NUMERIC,
  on_time_delivery_rate NUMERIC,
  top_vendor_by_spend TEXT,
  pending_rfqs BIGINT,
  active_pos BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH vendor_stats AS (
    SELECT 
      COUNT(*) as total_vendors,
      COUNT(*) FILTER (WHERE status = 'active') as active_vendors
    FROM dkegl_vendors 
    WHERE organization_id = _org_id
  ),
  spend_stats AS (
    SELECT 
      COALESCE(SUM(poi.total_amount), 0) as total_spend,
      COALESCE(AVG(poi.total_amount), 0) as avg_order_value,
      COUNT(*) as total_orders,
      COUNT(*) FILTER (WHERE grn.date <= po.expected_delivery_date) as on_time_orders
    FROM dkegl_purchase_orders po
    JOIN dkegl_po_items poi ON po.id = poi.purchase_order_id
    LEFT JOIN dkegl_grn_log grn ON poi.item_code = grn.item_code 
      AND grn.date BETWEEN po.order_date AND po.order_date + INTERVAL '90 days'
    WHERE po.organization_id = _org_id
    AND po.order_date >= CURRENT_DATE - INTERVAL '1 day' * _days_back
  ),
  top_vendor AS (
    SELECT v.vendor_name
    FROM dkegl_purchase_orders po
    JOIN dkegl_po_items poi ON po.id = poi.purchase_order_id
    JOIN dkegl_vendors v ON po.vendor_id = v.id
    WHERE po.organization_id = _org_id
    AND po.order_date >= CURRENT_DATE - INTERVAL '1 day' * _days_back
    GROUP BY v.id, v.vendor_name
    ORDER BY SUM(poi.total_amount) DESC
    LIMIT 1
  ),
  rfq_stats AS (
    SELECT COUNT(*) as pending_rfqs
    FROM dkegl_rfq 
    WHERE organization_id = _org_id 
    AND status IN ('draft', 'sent', 'responses_received')
  ),
  po_stats AS (
    SELECT COUNT(*) as active_pos
    FROM dkegl_purchase_orders 
    WHERE organization_id = _org_id 
    AND status IN ('pending', 'approved', 'partially_received')
  )
  SELECT 
    vs.total_vendors,
    vs.active_vendors,
    ss.total_spend,
    ss.avg_order_value,
    CASE WHEN ss.total_orders > 0 THEN (ss.on_time_orders::NUMERIC / ss.total_orders * 100) ELSE 0 END,
    COALESCE(tv.vendor_name, 'N/A'),
    rs.pending_rfqs,
    ps.active_pos
  FROM vendor_stats vs
  CROSS JOIN spend_stats ss
  CROSS JOIN rfq_stats rs
  CROSS JOIN po_stats ps
  LEFT JOIN top_vendor tv ON true;
END;
$$;