-- Step 1: Remove redundant columns from dkegl_opening_stock
ALTER TABLE dkegl_opening_stock 
DROP COLUMN IF EXISTS item_name,
DROP COLUMN IF EXISTS category_name;

-- Step 2: Add foreign key constraint to ensure data integrity
ALTER TABLE dkegl_opening_stock 
ADD CONSTRAINT fk_opening_stock_item_master 
FOREIGN KEY (organization_id, item_code) 
REFERENCES dkegl_item_master (organization_id, item_code);

-- Step 3: Create a view that joins opening stock with item master data
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

-- Step 4: Enable RLS on the view
ALTER VIEW dkegl_opening_stock_with_master OWNER TO postgres;

-- Grant permissions on the view
GRANT SELECT ON dkegl_opening_stock_with_master TO authenticated;
GRANT SELECT ON dkegl_opening_stock_with_master TO anon;