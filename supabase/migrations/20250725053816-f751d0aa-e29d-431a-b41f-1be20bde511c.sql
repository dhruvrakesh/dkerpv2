-- Fix order status enum and create sample data
-- First check what values are allowed in the enum
-- Add missing enum values if needed
ALTER TYPE dkegl_order_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE dkegl_order_status ADD VALUE IF NOT EXISTS 'in_production';

-- Create sample orders and workflow progress for testing (with corrected enum values)
INSERT INTO dkegl_orders (
  organization_id,
  order_number,
  uiorn,
  item_code,
  item_name,
  customer_info,
  order_quantity,
  specifications,
  substrate_details,
  printing_details,
  delivery_date,
  priority_level,
  status,
  created_by
) VALUES 
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'ORD-2025-001',
  'UIORN-001-2025',
  'ITM-PACK-001',
  'Premium Packaging Material',
  '{"customer_name": "ABC Industries", "contact_person": "John Smith", "email": "john@abc.com", "phone": "+91-9876543210"}',
  5000,
  '{"width_mm": 300, "length_mm": 400, "thickness_micron": 25, "finish": "matte"}',
  '{"material": "BOPP", "gsm": 20, "color": "transparent", "barrier_properties": "medium"}',
  '{"colors": ["Cyan", "Magenta", "Yellow", "Black"], "print_method": "gravure", "resolution": "175 LPI"}',
  '2025-02-15',
  2,
  'draft',
  (SELECT auth.uid())
),
(
  (SELECT id FROM dkegl_organizations LIMIT 1),
  'ORD-2025-002',
  'UIORN-002-2025',
  'ITM-PACK-002',
  'Food Grade Packaging',
  '{"customer_name": "FoodCorp Ltd", "contact_person": "Sarah Wilson", "email": "sarah@foodcorp.com", "phone": "+91-9876543211"}',
  8000,
  '{"width_mm": 250, "length_mm": 350, "thickness_micron": 30, "finish": "glossy"}',
  '{"material": "PET", "gsm": 25, "color": "clear", "barrier_properties": "high"}',
  '{"colors": ["Red", "Blue", "White"], "print_method": "flexo", "resolution": "150 LPI"}',
  '2025-02-20',
  1,
  'draft',
  (SELECT auth.uid())
);