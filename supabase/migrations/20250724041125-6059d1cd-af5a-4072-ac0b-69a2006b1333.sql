-- DKEGL ERP Security Policies Migration
-- Phase 3: Row Level Security Policies for Organization-based Data Isolation

-- RLS Policies for dkegl_organizations
CREATE POLICY "DKEGL admins can manage organizations"
  ON dkegl_organizations FOR ALL
  USING (dkegl_has_role(auth.uid(), id, 'admin'))
  WITH CHECK (dkegl_has_role(auth.uid(), id, 'admin'));

CREATE POLICY "DKEGL users can view their organization"
  ON dkegl_organizations FOR SELECT
  USING (id = dkegl_get_current_user_org());

-- RLS Policies for dkegl_user_profiles
CREATE POLICY "Users can manage their own DKEGL profile"
  ON dkegl_user_profiles FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "DKEGL admins can manage all profiles in their org"
  ON dkegl_user_profiles FOR ALL
  USING (dkegl_has_role(auth.uid(), organization_id, 'admin'))
  WITH CHECK (dkegl_has_role(auth.uid(), organization_id, 'admin'));

-- RLS Policies for dkegl_user_roles  
CREATE POLICY "DKEGL admins can manage roles in their org"
  ON dkegl_user_roles FOR ALL
  USING (dkegl_has_role(auth.uid(), organization_id, 'admin'))
  WITH CHECK (dkegl_has_role(auth.uid(), organization_id, 'admin'));

CREATE POLICY "Users can view their own DKEGL roles"
  ON dkegl_user_roles FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policies for dkegl_categories
CREATE POLICY "DKEGL organization members can access categories"
  ON dkegl_categories FOR ALL
  USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

-- RLS Policies for dkegl_item_master
CREATE POLICY "DKEGL organization members can access item master"
  ON dkegl_item_master FOR ALL
  USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

-- RLS Policies for dkegl_stock
CREATE POLICY "DKEGL organization members can access stock"
  ON dkegl_stock FOR ALL
  USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

-- RLS Policies for dkegl_grn_log
CREATE POLICY "DKEGL organization members can access GRN log"
  ON dkegl_grn_log FOR ALL
  USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

-- RLS Policies for dkegl_issue_log
CREATE POLICY "DKEGL organization members can access issue log"
  ON dkegl_issue_log FOR ALL
  USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

-- RLS Policies for dkegl_orders
CREATE POLICY "DKEGL organization members can access orders"
  ON dkegl_orders FOR ALL
  USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

-- RLS Policies for dkegl_production_schedule
CREATE POLICY "DKEGL organization members can access production schedule"
  ON dkegl_production_schedule FOR ALL
  USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

-- RLS Policies for dkegl_quality_control
CREATE POLICY "DKEGL organization members can access quality control"
  ON dkegl_quality_control FOR ALL
  USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

-- RLS Policies for dkegl_stock_summary
CREATE POLICY "DKEGL organization members can access stock summary"
  ON dkegl_stock_summary FOR ALL
  USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

-- RLS Policies for dkegl_daily_stock_snapshots
CREATE POLICY "DKEGL organization members can access stock snapshots"
  ON dkegl_daily_stock_snapshots FOR ALL
  USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

-- RLS Policies for dkegl_production_metrics
CREATE POLICY "DKEGL organization members can access production metrics"
  ON dkegl_production_metrics FOR ALL
  USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

-- RLS Policies for dkegl_grn_audit_log
CREATE POLICY "DKEGL admins can access GRN audit log"
  ON dkegl_grn_audit_log FOR SELECT
  USING (dkegl_has_role(auth.uid(), organization_id, 'admin'));

-- RLS Policies for dkegl_issue_audit_log
CREATE POLICY "DKEGL admins can access issue audit log"
  ON dkegl_issue_audit_log FOR SELECT
  USING (dkegl_has_role(auth.uid(), organization_id, 'admin'));

-- Insert default DKEGL organization
INSERT INTO dkegl_organizations (name, code, address, is_active)
VALUES ('DKEGL', 'DKEGL', 'DKEGL Industrial Complex', true)
ON CONFLICT (code) DO NOTHING;

-- Create some default categories for DKEGL
DO $$
DECLARE
  org_id UUID;
BEGIN
  SELECT id INTO org_id FROM dkegl_organizations WHERE code = 'DKEGL';
  
  INSERT INTO dkegl_categories (organization_id, category_name, category_code, description) VALUES
  (org_id, 'Flexible Packaging', 'FPK', 'Flexible packaging materials and products'),
  (org_id, 'Adhesive Tapes', 'ADH', 'Adhesive tape products'),
  (org_id, 'Laminated Films', 'LAM', 'Laminated film products'),
  (org_id, 'Raw Materials', 'RAW', 'Raw materials and substrates'),
  (org_id, 'Printing Inks', 'INK', 'Printing inks and chemicals')
  ON CONFLICT (organization_id, category_code) DO NOTHING;
END $$;