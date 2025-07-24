-- Add missing Consumable category
INSERT INTO dkegl_categories (organization_id, category_name, category_code, description)
VALUES (
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  'Consumables',
  'CONS',
  'Consumable items and supplies'
);