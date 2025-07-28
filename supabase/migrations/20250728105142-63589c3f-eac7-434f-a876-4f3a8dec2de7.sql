-- Phase 1: Enhanced Database Schema & Security for Multi-Tenant Vendor Management

-- 1.1 Enhanced Vendor Management Schema
-- Create vendor categories lookup table
CREATE TABLE IF NOT EXISTS dkegl_vendor_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  category_name TEXT NOT NULL,
  category_code TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, category_code)
);

-- Enhanced vendors table (extending existing dkegl_vendors)
ALTER TABLE dkegl_vendors 
ADD COLUMN IF NOT EXISTS supplier_type TEXT DEFAULT 'VENDOR',
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'STANDARD',
ADD COLUMN IF NOT EXISTS contact_person TEXT,
ADD COLUMN IF NOT EXISTS structured_address JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tax_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS bank_details JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS performance_rating NUMERIC(2,1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS material_categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS lead_time_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS minimum_order_value NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 1.2 Procurement Enhancement Schema
-- RFQ (Request for Quotation) table
CREATE TABLE IF NOT EXISTS dkegl_rfq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  rfq_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  requested_by UUID NOT NULL,
  status TEXT DEFAULT 'draft',
  priority TEXT DEFAULT 'medium',
  quote_deadline DATE,
  delivery_date DATE,
  total_estimated_value NUMERIC(12,2) DEFAULT 0,
  vendor_ids UUID[] DEFAULT '{}',
  line_items JSONB DEFAULT '[]',
  terms_conditions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, rfq_number)
);

-- Vendor Performance tracking table
CREATE TABLE IF NOT EXISTS dkegl_vendor_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  vendor_id UUID NOT NULL,
  evaluation_period_start DATE NOT NULL,
  evaluation_period_end DATE NOT NULL,
  delivery_performance_score NUMERIC(3,2) DEFAULT 0,
  quality_score NUMERIC(3,2) DEFAULT 0,
  pricing_competitiveness_score NUMERIC(3,2) DEFAULT 0,
  communication_score NUMERIC(3,2) DEFAULT 0,
  overall_score NUMERIC(3,2) DEFAULT 0,
  on_time_deliveries INTEGER DEFAULT 0,
  total_deliveries INTEGER DEFAULT 0,
  quality_rejections INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  average_lead_time_days NUMERIC(5,2) DEFAULT 0,
  cost_variance_percentage NUMERIC(5,2) DEFAULT 0,
  evaluated_by UUID,
  evaluation_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Purchase Orders enhancement (if not exists)
CREATE TABLE IF NOT EXISTS dkegl_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  po_number TEXT NOT NULL,
  vendor_id UUID NOT NULL,
  rfq_id UUID,
  status TEXT DEFAULT 'draft',
  total_amount NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  payment_terms TEXT DEFAULT 'NET_30',
  delivery_address JSONB DEFAULT '{}',
  delivery_date DATE,
  line_items JSONB DEFAULT '[]',
  terms_conditions TEXT,
  created_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, po_number)
);

-- 1.3 Security & Audit Enhancements
-- Enable RLS on new tables
ALTER TABLE dkegl_vendor_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_rfq ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_vendor_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_purchase_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor categories
CREATE POLICY "DKEGL organization members can access vendor categories"
ON dkegl_vendor_categories FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- RLS Policies for RFQ
CREATE POLICY "DKEGL organization members can access RFQ"
ON dkegl_rfq FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- RLS Policies for vendor performance
CREATE POLICY "DKEGL organization members can access vendor performance"
ON dkegl_vendor_performance FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- RLS Policies for purchase orders
CREATE POLICY "DKEGL organization members can access purchase orders"
ON dkegl_purchase_orders FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Seed vendor categories
INSERT INTO dkegl_vendor_categories (organization_id, category_name, category_code, description) 
SELECT org.id, category_data.name, category_data.code, category_data.desc
FROM dkegl_organizations org,
(VALUES 
  ('Raw Materials', 'RAW_MAT', 'Suppliers of raw materials for production'),
  ('Packaging Materials', 'PKG_MAT', 'Suppliers of packaging materials and containers'),
  ('Printing Supplies', 'PRT_SUP', 'Suppliers of inks, plates, and printing materials'),
  ('Adhesives & Chemicals', 'ADH_CHM', 'Suppliers of adhesives, solvents, and chemicals'),
  ('Consumables', 'CONSUMABLE', 'Suppliers of consumable items and office supplies'),
  ('Spare Parts', 'SPARE_PARTS', 'Suppliers of machinery spare parts and components'),
  ('Services', 'SERVICES', 'Service providers for maintenance, consulting, etc.'),
  ('Equipment', 'EQUIPMENT', 'Suppliers of machinery and equipment'),
  ('Office Supplies', 'OFFICE_SUP', 'Suppliers of office and administrative supplies')
) AS category_data(name, code, desc)
ON CONFLICT (organization_id, category_code) DO NOTHING;