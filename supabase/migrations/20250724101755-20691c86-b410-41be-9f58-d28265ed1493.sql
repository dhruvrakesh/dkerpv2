-- Add Finished Goods category for FG items
INSERT INTO dkegl_categories (organization_id, category_name, category_code, description, is_active) 
VALUES (
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  'Finished Goods',
  'FG',
  'Finished goods and final products',
  true
)
ON CONFLICT (organization_id, category_code) DO NOTHING;