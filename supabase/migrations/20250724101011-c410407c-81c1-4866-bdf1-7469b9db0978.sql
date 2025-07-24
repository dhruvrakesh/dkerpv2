-- Add missing categories for bulk upload support
INSERT INTO dkegl_categories (organization_id, category_name, category_code, description, is_active) 
SELECT 
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1) as organization_id,
  category_name,
  category_code,
  description,
  true as is_active
FROM (VALUES 
  ('Chemicals', 'CHEM', 'Chemical products and solvents'),
  ('Paper Cores', 'CORE', 'Paper cores and tubes'),
  ('Cast Polypropylene', 'CPP', 'CPP films and materials'),
  ('Paper Products', 'PAPER', 'Paper-based materials'),
  ('Polyester Films', 'PET', 'PET and polyester films'),
  ('Work in Progress', 'WIP', 'Work in progress items'),
  ('Machinery', 'MACHINERY', 'Machinery and equipment'),
  ('BOPP Films', 'BOPP', 'Biaxially oriented polypropylene films')
) AS new_categories(category_name, category_code, description)
WHERE NOT EXISTS (
  SELECT 1 FROM dkegl_categories dc 
  WHERE dc.category_code = new_categories.category_code 
  AND dc.organization_id = (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1)
);