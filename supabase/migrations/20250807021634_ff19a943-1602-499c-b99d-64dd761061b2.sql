-- Create audit trigger function for opening stock
CREATE OR REPLACE FUNCTION dkegl_audit_opening_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log opening stock changes
  IF TG_OP = 'INSERT' THEN
    INSERT INTO dkegl_audit_log (
      organization_id,
      user_id,
      action,
      table_name,
      record_id,
      new_values,
      details
    ) VALUES (
      NEW.organization_id,
      auth.uid(),
      'CREATE',
      'dkegl_opening_stock',
      NEW.id::TEXT,
      to_jsonb(NEW),
      jsonb_build_object(
        'item_code', NEW.item_code,
        'opening_qty', NEW.opening_qty,
        'unit_cost', NEW.unit_cost,
        'total_value', NEW.opening_qty * NEW.unit_cost,
        'location', NEW.location
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO dkegl_audit_log (
      organization_id,
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      details
    ) VALUES (
      NEW.organization_id,
      auth.uid(),
      'UPDATE',
      'dkegl_opening_stock',
      NEW.id::TEXT,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object(
        'item_code', NEW.item_code,
        'changes', jsonb_build_object(
          'opening_qty', jsonb_build_object('old', OLD.opening_qty, 'new', NEW.opening_qty),
          'unit_cost', jsonb_build_object('old', OLD.unit_cost, 'new', NEW.unit_cost),
          'total_value', jsonb_build_object(
            'old', OLD.opening_qty * OLD.unit_cost,
            'new', NEW.opening_qty * NEW.unit_cost
          ),
          'location', jsonb_build_object('old', OLD.location, 'new', NEW.location),
          'remarks', jsonb_build_object('old', OLD.remarks, 'new', NEW.remarks),
          'approval_status', jsonb_build_object('old', OLD.approval_status, 'new', NEW.approval_status)
        )
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO dkegl_audit_log (
      organization_id,
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      details
    ) VALUES (
      OLD.organization_id,
      auth.uid(),
      'DELETE',
      'dkegl_opening_stock',
      OLD.id::TEXT,
      to_jsonb(OLD),
      jsonb_build_object(
        'item_code', OLD.item_code,
        'opening_qty', OLD.opening_qty,
        'unit_cost', OLD.unit_cost,
        'total_value', OLD.opening_qty * OLD.unit_cost,
        'location', OLD.location
      )
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- Create triggers for opening stock audit trail
CREATE TRIGGER dkegl_opening_stock_audit_insert
  AFTER INSERT ON dkegl_opening_stock
  FOR EACH ROW EXECUTE FUNCTION dkegl_audit_opening_stock();

CREATE TRIGGER dkegl_opening_stock_audit_update
  AFTER UPDATE ON dkegl_opening_stock
  FOR EACH ROW EXECUTE FUNCTION dkegl_audit_opening_stock();

CREATE TRIGGER dkegl_opening_stock_audit_delete
  AFTER DELETE ON dkegl_opening_stock
  FOR EACH ROW EXECUTE FUNCTION dkegl_audit_opening_stock();