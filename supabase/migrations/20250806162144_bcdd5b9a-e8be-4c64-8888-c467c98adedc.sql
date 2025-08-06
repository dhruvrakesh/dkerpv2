-- Fix the audit function by properly handling the action constraint
-- First drop the audit trigger to avoid conflicts
DROP TRIGGER IF EXISTS dkegl_opening_stock_audit_trigger ON dkegl_opening_stock;

-- Drop the function
DROP FUNCTION IF EXISTS dkegl_audit_opening_stock_changes();

-- Create simpler opening stock data insertion without audit triggers
INSERT INTO dkegl_opening_stock (
  organization_id, 
  item_code, 
  opening_qty, 
  unit_cost,
  opening_date,
  location,
  remarks,
  approval_status
) VALUES 
(
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  'BOP_650_kg_50',
  1000.00,
  25.50,
  CURRENT_DATE,
  'main_warehouse',
  'Initial opening stock - 1000 kg @ ₹25.50/kg',
  'approved'
),
(
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  'MDO_1000_ft_30',
  500.00,
  18.75,
  CURRENT_DATE,
  'main_warehouse',
  'Initial opening stock - 500 ft @ ₹18.75/ft',
  'approved'
),
(
  (SELECT id FROM dkegl_organizations WHERE code = 'DKEGL' LIMIT 1),
  'LDO_800_mt_25',
  750.00,
  22.80,
  CURRENT_DATE,
  'main_warehouse',
  'Initial opening stock - 750 mt @ ₹22.80/mt',
  'approved'
);