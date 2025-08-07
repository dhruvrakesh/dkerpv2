-- First, create missing items in item master
-- These items exist in opening stock but not in item master

-- Insert MDO_1000_ft_30
INSERT INTO dkegl_item_master (
  organization_id,
  item_code,
  item_name,
  uom,
  hsn_code,
  item_type,
  status
) VALUES (
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  'MDO_1000_ft_30',
  'MDO 1000 ft 30',
  'FT',
  '39209900',
  'raw_material',
  'active'
);

-- Insert LDO_800_mt_25
INSERT INTO dkegl_item_master (
  organization_id,
  item_code,
  item_name,
  uom,
  hsn_code,
  item_type,
  status
) VALUES (
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  'LDO_800_mt_25',
  'LDO 800 mt 25',
  'MT',
  '39209900',
  'raw_material',
  'active'
);

-- Now remove redundant columns from dkegl_opening_stock
ALTER TABLE dkegl_opening_stock 
DROP COLUMN IF EXISTS item_name,
DROP COLUMN IF EXISTS category_name;

-- Add foreign key constraint to ensure data integrity
ALTER TABLE dkegl_opening_stock 
ADD CONSTRAINT fk_opening_stock_item_master 
FOREIGN KEY (organization_id, item_code) 
REFERENCES dkegl_item_master (organization_id, item_code);

-- Create a view that joins opening stock with item master data
CREATE OR REPLACE VIEW dkegl_opening_stock_with_master AS
SELECT 
  os.*,
  im.item_name,
  im.uom,
  im.hsn_code,
  c.category_name,
  im.status as item_status
FROM dkegl_opening_stock os
LEFT JOIN dkegl_item_master im ON os.organization_id = im.organization_id AND os.item_code = im.item_code
LEFT JOIN dkegl_categories c ON im.category_id = c.id
WHERE im.status = 'active';

-- Grant permissions on the view
GRANT SELECT ON dkegl_opening_stock_with_master TO authenticated;
GRANT SELECT ON dkegl_opening_stock_with_master TO anon;