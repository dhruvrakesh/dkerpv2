-- Final setup for vendor categories and database functions
-- Seed vendor categories for all organizations
INSERT INTO dkegl_vendor_categories (organization_id, category_name, category_code, description) 
SELECT 
  org.id, 
  unnest(ARRAY['Raw Materials', 'Packaging Materials', 'Printing Supplies', 'Adhesives & Chemicals', 'Consumables', 'Spare Parts', 'Services', 'Equipment', 'Office Supplies']) as category_name,
  unnest(ARRAY['RAW_MAT', 'PKG_MAT', 'PRT_SUP', 'ADH_CHM', 'CONSUMABLE', 'SPARE_PARTS', 'SERVICES', 'EQUIPMENT', 'OFFICE_SUP']) as category_code,
  unnest(ARRAY[
    'Suppliers of raw materials for production',
    'Suppliers of packaging materials and containers', 
    'Suppliers of inks, plates, and printing materials',
    'Suppliers of adhesives, solvents, and chemicals',
    'Suppliers of consumable items and office supplies',
    'Suppliers of machinery spare parts and components',
    'Service providers for maintenance, consulting, etc.',
    'Suppliers of machinery and equipment',
    'Suppliers of office and administrative supplies'
  ]) as description
FROM dkegl_organizations org
ON CONFLICT (organization_id, category_code) DO NOTHING;

-- Create function to calculate vendor performance score
CREATE OR REPLACE FUNCTION dkegl_calculate_vendor_performance_score(p_vendor_id UUID)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_organization_id UUID;
  v_avg_score NUMERIC := 0;
  v_delivery_score NUMERIC := 0;
  v_quality_score NUMERIC := 0;
BEGIN
  v_organization_id := dkegl_get_current_user_org();
  
  -- Calculate average performance from last 6 months
  SELECT 
    AVG(overall_score),
    AVG(delivery_performance_score),
    AVG(quality_score)
  INTO v_avg_score, v_delivery_score, v_quality_score
  FROM dkegl_vendor_performance 
  WHERE vendor_id = p_vendor_id 
    AND organization_id = v_organization_id
    AND evaluation_period_end >= CURRENT_DATE - INTERVAL '6 months';
  
  -- Update vendor's performance rating
  UPDATE dkegl_vendors 
  SET performance_rating = COALESCE(v_avg_score, 0)
  WHERE id = p_vendor_id AND organization_id = v_organization_id;
  
  RETURN COALESCE(v_avg_score, 0);
END;
$function$;

-- Create function to get procurement analytics
CREATE OR REPLACE FUNCTION dkegl_get_procurement_analytics(p_days_back INTEGER DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_organization_id UUID;
  v_result JSONB := '{}';
  v_total_vendors INTEGER := 0;
  v_active_vendors INTEGER := 0;
  v_total_pos INTEGER := 0;
  v_total_po_value NUMERIC := 0;
  v_avg_lead_time NUMERIC := 0;
BEGIN
  v_organization_id := dkegl_get_current_user_org();
  
  -- Get vendor stats
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_active = true) as active
  INTO v_total_vendors, v_active_vendors
  FROM dkegl_vendors 
  WHERE organization_id = v_organization_id;
  
  -- Get PO stats for the period
  SELECT 
    COUNT(*),
    COALESCE(SUM(total_amount), 0),
    COALESCE(AVG(EXTRACT(DAY FROM (updated_at - created_at))), 0)
  INTO v_total_pos, v_total_po_value, v_avg_lead_time
  FROM dkegl_purchase_orders 
  WHERE organization_id = v_organization_id
    AND created_at >= CURRENT_DATE - INTERVAL '1 day' * p_days_back;
  
  v_result := jsonb_build_object(
    'total_vendors', v_total_vendors,
    'active_vendors', v_active_vendors,
    'total_purchase_orders', v_total_pos,
    'total_po_value', v_total_po_value,
    'average_lead_time_days', v_avg_lead_time,
    'period_days', p_days_back
  );
  
  RETURN v_result;
END;
$function$;