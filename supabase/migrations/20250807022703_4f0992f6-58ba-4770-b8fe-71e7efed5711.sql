-- Create audit trigger function for GRN log
CREATE OR REPLACE FUNCTION dkegl_audit_grn_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log GRN changes
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
      'dkegl_grn_log',
      NEW.id::TEXT,
      to_jsonb(NEW),
      jsonb_build_object(
        'grn_number', NEW.grn_number,
        'item_code', NEW.item_code,
        'qty_received', NEW.qty_received,
        'unit_cost', NEW.unit_cost,
        'total_amount', NEW.total_amount,
        'supplier_name', NEW.supplier_name,
        'quality_status', NEW.quality_status
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
      'dkegl_grn_log',
      NEW.id::TEXT,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object(
        'grn_number', NEW.grn_number,
        'item_code', NEW.item_code,
        'changes', jsonb_build_object(
          'qty_received', jsonb_build_object('old', OLD.qty_received, 'new', NEW.qty_received),
          'unit_cost', jsonb_build_object('old', OLD.unit_cost, 'new', NEW.unit_cost),
          'total_amount', jsonb_build_object('old', OLD.total_amount, 'new', NEW.total_amount),
          'supplier_name', jsonb_build_object('old', OLD.supplier_name, 'new', NEW.supplier_name),
          'quality_status', jsonb_build_object('old', OLD.quality_status, 'new', NEW.quality_status),
          'remarks', jsonb_build_object('old', OLD.remarks, 'new', NEW.remarks)
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
      'dkegl_grn_log',
      OLD.id::TEXT,
      to_jsonb(OLD),
      jsonb_build_object(
        'grn_number', OLD.grn_number,
        'item_code', OLD.item_code,
        'qty_received', OLD.qty_received,
        'unit_cost', OLD.unit_cost,
        'total_amount', OLD.total_amount,
        'supplier_name', OLD.supplier_name,
        'quality_status', OLD.quality_status
      )
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- Create audit trigger function for Issue log
CREATE OR REPLACE FUNCTION dkegl_audit_issue_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log Issue changes
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
      'dkegl_issue_log',
      NEW.id::TEXT,
      to_jsonb(NEW),
      jsonb_build_object(
        'issue_number', NEW.issue_number,
        'item_code', NEW.item_code,
        'qty_issued', NEW.qty_issued,
        'unit_cost', NEW.unit_cost,
        'total_value', NEW.qty_issued * COALESCE(NEW.unit_cost, 0),
        'department', NEW.department,
        'purpose', NEW.purpose,
        'approval_status', NEW.approval_status
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
      'dkegl_issue_log',
      NEW.id::TEXT,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object(
        'issue_number', NEW.issue_number,
        'item_code', NEW.item_code,
        'changes', jsonb_build_object(
          'qty_issued', jsonb_build_object('old', OLD.qty_issued, 'new', NEW.qty_issued),
          'unit_cost', jsonb_build_object('old', OLD.unit_cost, 'new', NEW.unit_cost),
          'total_value', jsonb_build_object(
            'old', OLD.qty_issued * COALESCE(OLD.unit_cost, 0),
            'new', NEW.qty_issued * COALESCE(NEW.unit_cost, 0)
          ),
          'department', jsonb_build_object('old', OLD.department, 'new', NEW.department),
          'purpose', jsonb_build_object('old', OLD.purpose, 'new', NEW.purpose),
          'approval_status', jsonb_build_object('old', OLD.approval_status, 'new', NEW.approval_status),
          'remarks', jsonb_build_object('old', OLD.remarks, 'new', NEW.remarks)
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
      'dkegl_issue_log',
      OLD.id::TEXT,
      to_jsonb(OLD),
      jsonb_build_object(
        'issue_number', OLD.issue_number,
        'item_code', OLD.item_code,
        'qty_issued', OLD.qty_issued,
        'unit_cost', OLD.unit_cost,
        'total_value', OLD.qty_issued * COALESCE(OLD.unit_cost, 0),
        'department', OLD.department,
        'purpose', OLD.purpose,
        'approval_status', OLD.approval_status
      )
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- Create triggers for GRN log audit trail
CREATE TRIGGER dkegl_grn_log_audit_insert
  AFTER INSERT ON dkegl_grn_log
  FOR EACH ROW EXECUTE FUNCTION dkegl_audit_grn_log();

CREATE TRIGGER dkegl_grn_log_audit_update
  AFTER UPDATE ON dkegl_grn_log
  FOR EACH ROW EXECUTE FUNCTION dkegl_audit_grn_log();

CREATE TRIGGER dkegl_grn_log_audit_delete
  AFTER DELETE ON dkegl_grn_log
  FOR EACH ROW EXECUTE FUNCTION dkegl_audit_grn_log();

-- Create triggers for Issue log audit trail
CREATE TRIGGER dkegl_issue_log_audit_insert
  AFTER INSERT ON dkegl_issue_log
  FOR EACH ROW EXECUTE FUNCTION dkegl_audit_issue_log();

CREATE TRIGGER dkegl_issue_log_audit_update
  AFTER UPDATE ON dkegl_issue_log
  FOR EACH ROW EXECUTE FUNCTION dkegl_audit_issue_log();

CREATE TRIGGER dkegl_issue_log_audit_delete
  AFTER DELETE ON dkegl_issue_log
  FOR EACH ROW EXECUTE FUNCTION dkegl_audit_issue_log();