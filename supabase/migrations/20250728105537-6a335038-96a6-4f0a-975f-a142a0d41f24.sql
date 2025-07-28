-- Create vendor categories table
CREATE TABLE dkegl_vendor_categories (
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

-- Enable RLS
ALTER TABLE dkegl_vendor_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "DKEGL organization members can access vendor categories"
ON dkegl_vendor_categories FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Seed vendor categories
INSERT INTO dkegl_vendor_categories (organization_id, category_name, category_code, description) 
SELECT 
  org.id, 
  category_data.name,
  category_data.code,
  category_data.description
FROM dkegl_organizations org
CROSS JOIN (
  VALUES 
    ('Raw Materials', 'RAW_MAT', 'Suppliers of raw materials for production'),
    ('Packaging Materials', 'PKG_MAT', 'Suppliers of packaging materials and containers'), 
    ('Printing Supplies', 'PRT_SUP', 'Suppliers of inks, plates, and printing materials'),
    ('Adhesives & Chemicals', 'ADH_CHM', 'Suppliers of adhesives, solvents, and chemicals'),
    ('Consumables', 'CONSUMABLE', 'Suppliers of consumable items and office supplies'),
    ('Spare Parts', 'SPARE_PARTS', 'Suppliers of machinery spare parts and components'),
    ('Services', 'SERVICES', 'Service providers for maintenance, consulting, etc.'),
    ('Equipment', 'EQUIPMENT', 'Suppliers of machinery and equipment'),
    ('Office Supplies', 'OFFICE_SUP', 'Suppliers of office and administrative supplies')
) AS category_data(name, code, description);