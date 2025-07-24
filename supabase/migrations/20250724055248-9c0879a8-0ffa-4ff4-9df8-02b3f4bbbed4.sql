-- Phase 1: Extend dkegl_item_master with enterprise features

-- Create item type enum
CREATE TYPE dkegl_item_type AS ENUM ('raw_material', 'work_in_progress', 'consumable', 'finished_good');

-- Add enterprise fields to dkegl_item_master
ALTER TABLE dkegl_item_master 
ADD COLUMN IF NOT EXISTS item_type dkegl_item_type DEFAULT 'raw_material',
ADD COLUMN IF NOT EXISTS artwork_reference TEXT,
ADD COLUMN IF NOT EXISTS specification_reference TEXT,
ADD COLUMN IF NOT EXISTS parent_item_code TEXT,
ADD COLUMN IF NOT EXISTS bom_structure JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS technical_specs JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS quality_specs JSONB DEFAULT '{}';

-- Create specialized views for different item types (Fixed stock references)

-- Raw Materials View
CREATE OR REPLACE VIEW dkegl_rm_items_view AS
SELECT 
  im.*,
  c.category_name,
  COALESCE(s.current_qty, 0) as stock_qty,
  im.reorder_level as effective_reorder_level
FROM dkegl_item_master im
LEFT JOIN dkegl_categories c ON im.category_id = c.id
LEFT JOIN dkegl_stock s ON im.organization_id = s.organization_id AND im.item_code = s.item_code
WHERE im.item_type = 'raw_material' AND im.status = 'active';

-- Finished Goods View  
CREATE OR REPLACE VIEW dkegl_fg_items_view AS
SELECT 
  im.*,
  c.category_name,
  COALESCE(s.current_qty, 0) as stock_qty,
  au.artwork_file,
  au.ai_prompt as artwork_notes
FROM dkegl_item_master im
LEFT JOIN dkegl_categories c ON im.category_id = c.id
LEFT JOIN dkegl_stock s ON im.organization_id = s.organization_id AND im.item_code = s.item_code
LEFT JOIN artwork_upload au ON im.artwork_reference = au.id::text
WHERE im.item_type = 'finished_good' AND im.status = 'active';

-- Work in Progress View
CREATE OR REPLACE VIEW dkegl_wip_items_view AS
SELECT 
  im.*,
  c.category_name,
  COALESCE(s.current_qty, 0) as stock_qty,
  parent.item_name as parent_item_name
FROM dkegl_item_master im
LEFT JOIN dkegl_categories c ON im.category_id = c.id
LEFT JOIN dkegl_stock s ON im.organization_id = s.organization_id AND im.item_code = s.item_code
LEFT JOIN dkegl_item_master parent ON im.organization_id = parent.organization_id AND im.parent_item_code = parent.item_code
WHERE im.item_type = 'work_in_progress' AND im.status = 'active';

-- Consumables View
CREATE OR REPLACE VIEW dkegl_consumable_items_view AS
SELECT 
  im.*,
  c.category_name,
  COALESCE(s.current_qty, 0) as stock_qty,
  CASE 
    WHEN s.current_qty <= im.reorder_level THEN 'reorder_required'
    WHEN s.current_qty <= (im.reorder_level * 1.2) THEN 'low_stock'
    ELSE 'adequate'
  END as stock_status
FROM dkegl_item_master im
LEFT JOIN dkegl_categories c ON im.category_id = c.id
LEFT JOIN dkegl_stock s ON im.organization_id = s.organization_id AND im.item_code = s.item_code
WHERE im.item_type = 'consumable' AND im.status = 'active';

-- Create item specifications table for detailed specs
CREATE TABLE IF NOT EXISTS dkegl_item_specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES dkegl_organizations(id),
  item_code TEXT NOT NULL,
  specification_type TEXT NOT NULL, -- 'technical', 'quality', 'customer_specific'
  specification_data JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (organization_id, item_code) REFERENCES dkegl_item_master(organization_id, item_code)
);

-- Enable RLS for item specifications
ALTER TABLE dkegl_item_specifications ENABLE ROW LEVEL SECURITY;

-- RLS policy for item specifications
CREATE POLICY "DKEGL organization members can access item specifications"
ON dkegl_item_specifications
FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Add trigger for updated_at
CREATE TRIGGER dkegl_item_specifications_updated_at
BEFORE UPDATE ON dkegl_item_specifications
FOR EACH ROW
EXECUTE FUNCTION dkegl_update_timestamp();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_dkegl_item_specifications_org_item 
ON dkegl_item_specifications(organization_id, item_code);

CREATE INDEX IF NOT EXISTS idx_dkegl_item_specifications_type 
ON dkegl_item_specifications(specification_type, is_active);

-- Update existing items to have default item_type based on category
DO $$
BEGIN
  -- Set item types based on category names (best guess)
  UPDATE dkegl_item_master 
  SET item_type = 'raw_material'
  WHERE item_type IS NULL 
  AND category_id IN (
    SELECT id FROM dkegl_categories 
    WHERE LOWER(category_name) LIKE '%raw%' 
    OR LOWER(category_name) LIKE '%material%'
  );
  
  UPDATE dkegl_item_master 
  SET item_type = 'consumable'
  WHERE item_type IS NULL 
  AND category_id IN (
    SELECT id FROM dkegl_categories 
    WHERE LOWER(category_name) LIKE '%consumable%' 
    OR LOWER(category_name) LIKE '%supplies%'
  );
  
  UPDATE dkegl_item_master 
  SET item_type = 'finished_good'
  WHERE item_type IS NULL 
  AND category_id IN (
    SELECT id FROM dkegl_categories 
    WHERE LOWER(category_name) LIKE '%packaging%' 
    OR LOWER(category_name) LIKE '%tape%'
    OR LOWER(category_name) LIKE '%film%'
  );
  
  -- Default remaining items to raw_material
  UPDATE dkegl_item_master 
  SET item_type = 'raw_material'
  WHERE item_type IS NULL;
END $$;