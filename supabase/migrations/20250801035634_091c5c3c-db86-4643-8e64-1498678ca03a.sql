-- Create proper PO number generation function for DKEGL organizations
CREATE OR REPLACE FUNCTION public.dkegl_generate_po_number(_org_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  org_code TEXT;
  po_count INTEGER;
  new_po_number TEXT;
BEGIN
  -- Get organization code
  SELECT code INTO org_code 
  FROM dkegl_organizations 
  WHERE id = _org_id;
  
  IF org_code IS NULL THEN
    org_code := 'ORG';
  END IF;
  
  -- Get current PO count for this organization
  SELECT COUNT(*) INTO po_count
  FROM dkegl_purchase_orders 
  WHERE organization_id = _org_id 
  AND po_number IS NOT NULL;
  
  -- Generate new PO number with sequential format
  new_po_number := org_code || '-PO-' || LPAD((po_count + 1)::TEXT, 4, '0');
  
  -- Ensure uniqueness by checking for duplicates
  WHILE EXISTS (
    SELECT 1 FROM dkegl_purchase_orders 
    WHERE organization_id = _org_id 
    AND po_number = new_po_number
  ) LOOP
    po_count := po_count + 1;
    new_po_number := org_code || '-PO-' || LPAD((po_count + 1)::TEXT, 4, '0');
  END LOOP;
  
  RETURN new_po_number;
END;
$function$;