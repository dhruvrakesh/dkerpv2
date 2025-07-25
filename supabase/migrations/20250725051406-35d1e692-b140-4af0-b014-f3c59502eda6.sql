-- Phase 4: Create Procurement Module Database Schema

-- Create vendors table
CREATE TABLE IF NOT EXISTS dkegl_vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  vendor_code TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  payment_terms TEXT DEFAULT 'Net 30',
  credit_limit NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, vendor_code)
);

-- Enable RLS on vendors
ALTER TABLE dkegl_vendors ENABLE ROW LEVEL SECURITY;

-- Create vendor access policies
CREATE POLICY "DKEGL organization members can access vendors" 
ON dkegl_vendors 
FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Create purchase orders table
CREATE TABLE IF NOT EXISTS dkegl_purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  vendor_id UUID REFERENCES dkegl_vendors(id),
  po_number TEXT NOT NULL,
  po_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'sent', 'received', 'completed', 'cancelled')),
  total_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  notes TEXT,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, po_number)
);

-- Enable RLS on purchase orders
ALTER TABLE dkegl_purchase_orders ENABLE ROW LEVEL SECURITY;

-- Create PO access policies
CREATE POLICY "DKEGL organization members can access purchase orders" 
ON dkegl_purchase_orders 
FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Create PO items table
CREATE TABLE IF NOT EXISTS dkegl_po_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  po_id UUID REFERENCES dkegl_purchase_orders(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  uom TEXT DEFAULT 'PCS',
  delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on PO items
ALTER TABLE dkegl_po_items ENABLE ROW LEVEL SECURITY;

-- Create PO items access policies
CREATE POLICY "DKEGL organization members can access PO items" 
ON dkegl_po_items 
FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());