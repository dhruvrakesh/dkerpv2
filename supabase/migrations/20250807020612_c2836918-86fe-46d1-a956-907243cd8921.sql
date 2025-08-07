-- Add RLS policy for the new view to ensure proper security
CREATE POLICY "DKEGL organization members can access opening stock with master view" 
ON dkegl_opening_stock_with_master 
FOR SELECT 
TO authenticated
USING (organization_id = dkegl_get_current_user_org());