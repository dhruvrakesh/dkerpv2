-- DKEGL ERP Database Functions Migration
-- Phase 2: Essential Business Logic Functions

-- Function to check DKEGL user roles (security definer to prevent recursion)
CREATE OR REPLACE FUNCTION dkegl_has_role(_user_id UUID, _org_id UUID, _role dkegl_user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM dkegl_user_roles
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = _role
  )
$$;

-- Function to get current user's organization
CREATE OR REPLACE FUNCTION dkegl_get_current_user_org()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM dkegl_user_profiles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- Function to generate DKEGL item codes
CREATE OR REPLACE FUNCTION dkegl_generate_item_code(
  _org_id UUID,
  category_name TEXT,
  qualifier TEXT DEFAULT '',
  size_mm TEXT DEFAULT '',
  gsm NUMERIC DEFAULT NULL
)
RETURNS TEXT
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  category_code TEXT;
  final_code TEXT;
  base_code TEXT;
  counter INTEGER := 1;
  max_attempts INTEGER := 100;
BEGIN
  -- Sanitize and get category code
  category_code := UPPER(LEFT(REGEXP_REPLACE(category_name, '[^A-Za-z0-9]', '', 'g'), 3));
  
  -- If category code is too short, pad with 'X' or use fallback
  IF LENGTH(category_code) < 2 THEN
    category_code := RPAD(category_code, 3, 'X');
  END IF;
  
  -- If category code is empty, use 'DKE' as fallback
  IF category_code = '' OR category_code IS NULL THEN
    category_code := 'DKE';
  END IF;
  
  -- Build base item code
  base_code := category_code;
  
  IF qualifier IS NOT NULL AND qualifier != '' THEN
    base_code := base_code || '_' || UPPER(LEFT(REGEXP_REPLACE(qualifier, '[^A-Za-z0-9]', '', 'g'), 10));
  END IF;
  
  IF size_mm IS NOT NULL AND size_mm != '' THEN
    base_code := base_code || '_' || LEFT(REGEXP_REPLACE(size_mm, '[^A-Za-z0-9x]', '', 'g'), 15);
  END IF;
  
  IF gsm IS NOT NULL THEN
    base_code := base_code || '_' || gsm::TEXT;
  END IF;
  
  -- Ensure uniqueness
  final_code := base_code;
  
  WHILE EXISTS (SELECT 1 FROM dkegl_item_master WHERE organization_id = _org_id AND item_code = final_code) AND counter <= max_attempts LOOP
    final_code := base_code || '_' || LPAD(counter::TEXT, 3, '0');
    counter := counter + 1;
  END LOOP;
  
  IF counter > max_attempts THEN
    final_code := base_code || '_' || EXTRACT(EPOCH FROM now())::bigint;
  END IF;
  
  RETURN final_code;
END;
$$;

-- Function to update stock on GRN
CREATE OR REPLACE FUNCTION dkegl_update_stock_on_grn()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO dkegl_stock (organization_id, item_code, current_qty, last_transaction_date, last_updated)
  VALUES (NEW.organization_id, NEW.item_code, NEW.qty_received, NEW.date, now())
  ON CONFLICT (organization_id, item_code, location)
  DO UPDATE SET 
    current_qty = dkegl_stock.current_qty + NEW.qty_received,
    last_transaction_date = NEW.date,
    last_updated = now();
  
  RETURN NEW;
END;
$$;

-- Function to update stock on issue
CREATE OR REPLACE FUNCTION dkegl_update_stock_on_issue()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE dkegl_stock 
  SET 
    current_qty = current_qty - NEW.qty_issued,
    last_transaction_date = NEW.date,
    last_updated = now()
  WHERE organization_id = NEW.organization_id 
    AND item_code = NEW.item_code;
  
  RETURN NEW;
END;
$$;

-- Function to capture daily stock snapshots
CREATE OR REPLACE FUNCTION dkegl_capture_daily_stock_snapshot(_org_id UUID)
RETURNS JSONB
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  snapshot_data JSONB;
  record_count INTEGER;
  total_val NUMERIC;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', item_code,
      'current_qty', current_qty,
      'unit_cost', unit_cost,
      'total_value', total_value,
      'location', location
    )
  ), COUNT(*), COALESCE(SUM(total_value), 0)
  INTO snapshot_data, record_count, total_val
  FROM dkegl_stock
  WHERE organization_id = _org_id;

  INSERT INTO dkegl_daily_stock_snapshots (
    organization_id,
    snapshot_date, 
    snapshot_data, 
    record_count,
    total_value
  ) VALUES (
    _org_id,
    CURRENT_DATE, 
    snapshot_data, 
    record_count,
    total_val
  )
  ON CONFLICT (organization_id, snapshot_date) 
  DO UPDATE SET 
    snapshot_data = EXCLUDED.snapshot_data,
    record_count = EXCLUDED.record_count,
    total_value = EXCLUDED.total_value,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'date', CURRENT_DATE,
    'record_count', record_count,
    'total_value', total_val
  );
END;
$$;

-- Function to refresh stock summary
CREATE OR REPLACE FUNCTION dkegl_refresh_stock_summary(_org_id UUID)
RETURNS VOID
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing summary for organization
  DELETE FROM dkegl_stock_summary WHERE organization_id = _org_id;
  
  -- Regenerate stock summary
  INSERT INTO dkegl_stock_summary (
    organization_id,
    item_code,
    item_name,
    category_name,
    opening_qty,
    total_grn_qty,
    total_issued_qty,
    current_qty,
    calculated_qty,
    issue_7d,
    issue_30d,
    issue_90d,
    consumption_rate_7d,
    consumption_rate_30d,
    consumption_rate_90d,
    days_of_cover,
    reorder_level,
    reorder_suggested,
    last_transaction_date
  )
  SELECT 
    s.organization_id,
    s.item_code,
    im.item_name,
    c.category_name,
    s.opening_qty,
    COALESCE(grn_total.total_qty, 0) as total_grn_qty,
    COALESCE(issue_total.total_qty, 0) as total_issued_qty,
    s.current_qty,
    s.opening_qty + COALESCE(grn_total.total_qty, 0) - COALESCE(issue_total.total_qty, 0) as calculated_qty,
    COALESCE(issue_7d.total_qty, 0) as issue_7d,
    COALESCE(issue_30d.total_qty, 0) as issue_30d,
    COALESCE(issue_90d.total_qty, 0) as issue_90d,
    CASE WHEN issue_7d.total_qty > 0 THEN issue_7d.total_qty / 7.0 ELSE 0 END as consumption_rate_7d,
    CASE WHEN issue_30d.total_qty > 0 THEN issue_30d.total_qty / 30.0 ELSE 0 END as consumption_rate_30d,
    CASE WHEN issue_90d.total_qty > 0 THEN issue_90d.total_qty / 90.0 ELSE 0 END as consumption_rate_90d,
    CASE 
      WHEN issue_30d.total_qty > 0 THEN s.current_qty / (issue_30d.total_qty / 30.0)
      ELSE 999
    END as days_of_cover,
    im.reorder_level,
    s.current_qty <= im.reorder_level as reorder_suggested,
    s.last_transaction_date
  FROM dkegl_stock s
  LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
  LEFT JOIN dkegl_categories c ON im.category_id = c.id
  LEFT JOIN (
    SELECT organization_id, item_code, SUM(qty_received) as total_qty
    FROM dkegl_grn_log
    WHERE organization_id = _org_id
    GROUP BY organization_id, item_code
  ) grn_total ON s.organization_id = grn_total.organization_id AND s.item_code = grn_total.item_code
  LEFT JOIN (
    SELECT organization_id, item_code, SUM(qty_issued) as total_qty
    FROM dkegl_issue_log
    WHERE organization_id = _org_id
    GROUP BY organization_id, item_code
  ) issue_total ON s.organization_id = issue_total.organization_id AND s.item_code = issue_total.item_code
  LEFT JOIN (
    SELECT organization_id, item_code, SUM(qty_issued) as total_qty
    FROM dkegl_issue_log
    WHERE organization_id = _org_id AND date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY organization_id, item_code
  ) issue_7d ON s.organization_id = issue_7d.organization_id AND s.item_code = issue_7d.item_code
  LEFT JOIN (
    SELECT organization_id, item_code, SUM(qty_issued) as total_qty
    FROM dkegl_issue_log
    WHERE organization_id = _org_id AND date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY organization_id, item_code
  ) issue_30d ON s.organization_id = issue_30d.organization_id AND s.item_code = issue_30d.item_code
  LEFT JOIN (
    SELECT organization_id, item_code, SUM(qty_issued) as total_qty
    FROM dkegl_issue_log
    WHERE organization_id = _org_id AND date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY organization_id, item_code
  ) issue_90d ON s.organization_id = issue_90d.organization_id AND s.item_code = issue_90d.item_code
  WHERE s.organization_id = _org_id;
END;
$$;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION dkegl_update_timestamp()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for stock updates
CREATE TRIGGER dkegl_grn_stock_update_trigger
  AFTER INSERT ON dkegl_grn_log
  FOR EACH ROW EXECUTE FUNCTION dkegl_update_stock_on_grn();

CREATE TRIGGER dkegl_issue_stock_update_trigger
  AFTER INSERT ON dkegl_issue_log
  FOR EACH ROW EXECUTE FUNCTION dkegl_update_stock_on_issue();

-- Create triggers for timestamp updates
CREATE TRIGGER dkegl_organizations_updated_at_trigger
  BEFORE UPDATE ON dkegl_organizations
  FOR EACH ROW EXECUTE FUNCTION dkegl_update_timestamp();

CREATE TRIGGER dkegl_user_profiles_updated_at_trigger
  BEFORE UPDATE ON dkegl_user_profiles
  FOR EACH ROW EXECUTE FUNCTION dkegl_update_timestamp();

CREATE TRIGGER dkegl_user_roles_updated_at_trigger
  BEFORE UPDATE ON dkegl_user_roles
  FOR EACH ROW EXECUTE FUNCTION dkegl_update_timestamp();

CREATE TRIGGER dkegl_categories_updated_at_trigger
  BEFORE UPDATE ON dkegl_categories
  FOR EACH ROW EXECUTE FUNCTION dkegl_update_timestamp();

CREATE TRIGGER dkegl_item_master_updated_at_trigger
  BEFORE UPDATE ON dkegl_item_master
  FOR EACH ROW EXECUTE FUNCTION dkegl_update_timestamp();

CREATE TRIGGER dkegl_orders_updated_at_trigger
  BEFORE UPDATE ON dkegl_orders
  FOR EACH ROW EXECUTE FUNCTION dkegl_update_timestamp();

CREATE TRIGGER dkegl_production_schedule_updated_at_trigger
  BEFORE UPDATE ON dkegl_production_schedule
  FOR EACH ROW EXECUTE FUNCTION dkegl_update_timestamp();

CREATE TRIGGER dkegl_quality_control_updated_at_trigger
  BEFORE UPDATE ON dkegl_quality_control
  FOR EACH ROW EXECUTE FUNCTION dkegl_update_timestamp();