-- Enable realtime for key tables
ALTER TABLE dkegl_workflow_progress REPLICA IDENTITY FULL;
ALTER TABLE dkegl_quality_inspections REPLICA IDENTITY FULL;
ALTER TABLE dkegl_production_metrics REPLICA IDENTITY FULL;
ALTER TABLE dkegl_orders REPLICA IDENTITY FULL;
ALTER TABLE dkegl_pricing_master REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE dkegl_workflow_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE dkegl_quality_inspections;
ALTER PUBLICATION supabase_realtime ADD TABLE dkegl_production_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE dkegl_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE dkegl_pricing_master;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workflow_progress_org_order ON dkegl_workflow_progress(organization_id, order_id);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_org_stage ON dkegl_quality_inspections(organization_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_production_metrics_org_date ON dkegl_production_metrics(organization_id, date);
CREATE INDEX IF NOT EXISTS idx_orders_org_status ON dkegl_orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_pricing_master_org_item ON dkegl_pricing_master(organization_id, item_code);