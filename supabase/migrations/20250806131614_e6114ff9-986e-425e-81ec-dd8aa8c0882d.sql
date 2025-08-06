-- Create the dkegl_opening_stock table with date tracking
CREATE TABLE dkegl_opening_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT dkegl_get_current_user_org(),
  item_code TEXT NOT NULL,
  item_name TEXT,
  category_name TEXT,
  location TEXT DEFAULT 'main',
  opening_qty NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  total_value NUMERIC GENERATED ALWAYS AS (opening_qty * unit_cost) STORED,
  opening_date DATE NOT NULL,
  remarks TEXT,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, item_code, location)
);

-- Enable RLS
ALTER TABLE dkegl_opening_stock ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Organization members can access opening stock"
ON dkegl_opening_stock
FOR ALL
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Create index for performance
CREATE INDEX idx_dkegl_opening_stock_org_item ON dkegl_opening_stock(organization_id, item_code);
CREATE INDEX idx_dkegl_opening_stock_date ON dkegl_opening_stock(opening_date);

-- Create function to calculate stock with opening date
CREATE OR REPLACE FUNCTION dkegl_calculate_stock_with_opening_date(
  _org_id UUID,
  _item_code TEXT DEFAULT NULL,
  _as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  item_code TEXT,
  item_name TEXT,
  category_name TEXT,
  opening_qty NUMERIC,
  opening_date DATE,
  grn_qty_since_opening NUMERIC,
  issues_qty_since_opening NUMERIC,
  calculated_current_qty NUMERIC,
  opening_value NUMERIC,
  calculated_current_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH opening_stock AS (
    SELECT 
      os.item_code,
      os.item_name,
      os.category_name,
      os.opening_qty,
      os.opening_date,
      os.unit_cost,
      os.opening_qty * os.unit_cost as opening_value
    FROM dkegl_opening_stock os
    WHERE os.organization_id = _org_id
      AND (_item_code IS NULL OR os.item_code = _item_code)
      AND os.approval_status = 'approved'
      AND os.opening_date <= _as_of_date
  ),
  grn_since_opening AS (
    SELECT 
      g.item_code,
      COALESCE(SUM(g.qty_received), 0) as grn_qty
    FROM dkegl_grn_log g
    JOIN opening_stock os ON g.item_code = os.item_code
    WHERE g.organization_id = _org_id
      AND g.date >= os.opening_date
      AND g.date <= _as_of_date
    GROUP BY g.item_code
  ),
  issues_since_opening AS (
    SELECT 
      i.item_code,
      COALESCE(SUM(i.qty_issued), 0) as issues_qty
    FROM dkegl_issue_log i
    JOIN opening_stock os ON i.item_code = os.item_code
    WHERE i.organization_id = _org_id
      AND i.date >= os.opening_date
      AND i.date <= _as_of_date
    GROUP BY i.item_code
  )
  SELECT 
    os.item_code,
    os.item_name,
    os.category_name,
    os.opening_qty,
    os.opening_date,
    COALESCE(g.grn_qty, 0) as grn_qty_since_opening,
    COALESCE(i.issues_qty, 0) as issues_qty_since_opening,
    os.opening_qty + COALESCE(g.grn_qty, 0) - COALESCE(i.issues_qty, 0) as calculated_current_qty,
    os.opening_value,
    (os.opening_qty + COALESCE(g.grn_qty, 0) - COALESCE(i.issues_qty, 0)) * os.unit_cost as calculated_current_value
  FROM opening_stock os
  LEFT JOIN grn_since_opening g ON os.item_code = g.item_code
  LEFT JOIN issues_since_opening i ON os.item_code = i.item_code
  ORDER BY os.item_code;
END;
$$;

-- Create audit trigger for opening stock changes
CREATE OR REPLACE FUNCTION dkegl_audit_opening_stock_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO dkegl_audit_log (
      organization_id,
      table_name,
      record_id,
      action,
      new_values,
      changed_by
    ) VALUES (
      NEW.organization_id,
      'dkegl_opening_stock',
      NEW.id,
      'INSERT',
      to_jsonb(NEW),
      auth.uid()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO dkegl_audit_log (
      organization_id,
      table_name,
      record_id,
      action,
      old_values,
      new_values,
      changed_by
    ) VALUES (
      NEW.organization_id,
      'dkegl_opening_stock',
      NEW.id,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid()
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO dkegl_audit_log (
      organization_id,
      table_name,
      record_id,
      action,
      old_values,
      changed_by
    ) VALUES (
      OLD.organization_id,
      'dkegl_opening_stock',
      OLD.id,
      'DELETE',
      to_jsonb(OLD),
      auth.uid()
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger
CREATE TRIGGER trg_audit_opening_stock_changes
  AFTER INSERT OR UPDATE OR DELETE ON dkegl_opening_stock
  FOR EACH ROW EXECUTE FUNCTION dkegl_audit_opening_stock_changes();