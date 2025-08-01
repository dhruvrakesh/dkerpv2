-- Fix audit log constraint to allow reconciliation actions
ALTER TABLE dkegl_audit_log 
DROP CONSTRAINT dkegl_audit_log_action_check;

ALTER TABLE dkegl_audit_log 
ADD CONSTRAINT dkegl_audit_log_action_check 
CHECK (action = ANY (ARRAY[
  'create'::text, 
  'update'::text, 
  'delete'::text, 
  'auto_progress'::text, 
  'bulk_upload'::text, 
  'approval'::text, 
  'quality_check'::text, 
  'stage_transition'::text,
  'STOCK_RECONCILIATION_START'::text,
  'STOCK_RECONCILIATION_COMPLETE'::text,
  'stock_reconciliation'::text,
  'variance_correction'::text,
  'system_correction'::text
]));