-- Add foreign key relationships for inventory management
-- First, add unique constraints to enable foreign keys
ALTER TABLE dkegl_item_master ADD CONSTRAINT unique_item_code_per_org UNIQUE (organization_id, item_code);

-- Add foreign key from dkegl_grn_log to dkegl_item_master
ALTER TABLE dkegl_grn_log 
ADD CONSTRAINT fk_grn_item_master 
FOREIGN KEY (organization_id, item_code) 
REFERENCES dkegl_item_master(organization_id, item_code);

-- Add foreign key from dkegl_issue_log to dkegl_item_master  
ALTER TABLE dkegl_issue_log 
ADD CONSTRAINT fk_issue_item_master 
FOREIGN KEY (organization_id, item_code) 
REFERENCES dkegl_item_master(organization_id, item_code);

-- Add foreign key from dkegl_stock to dkegl_item_master
ALTER TABLE dkegl_stock 
ADD CONSTRAINT fk_stock_item_master 
FOREIGN KEY (organization_id, item_code) 
REFERENCES dkegl_item_master(organization_id, item_code);

-- Add missing required fields to dkegl_issue_log
ALTER TABLE dkegl_issue_log 
ADD COLUMN IF NOT EXISTS issue_number TEXT NOT NULL DEFAULT ('ISS-' || extract(epoch from now())::bigint),
ADD COLUMN IF NOT EXISTS uom TEXT NOT NULL DEFAULT 'PCS';

-- Update existing records to have issue numbers if they don't
UPDATE dkegl_issue_log 
SET issue_number = 'ISS-' || extract(epoch from created_at)::bigint
WHERE issue_number IS NULL OR issue_number = '';

-- Make issue_number unique per organization
ALTER TABLE dkegl_issue_log ADD CONSTRAINT unique_issue_number_per_org UNIQUE (organization_id, issue_number);