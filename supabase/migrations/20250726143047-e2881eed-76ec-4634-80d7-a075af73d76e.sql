-- Add foreign key constraint between BOM master and item master
-- First ensure item_master has a unique constraint on (organization_id, item_code)
ALTER TABLE dkegl_item_master 
ADD CONSTRAINT uk_item_master_org_code 
UNIQUE (organization_id, item_code);

-- Add foreign key constraint from BOM master to item master
ALTER TABLE dkegl_bom_master 
ADD CONSTRAINT fk_bom_master_item_code 
FOREIGN KEY (organization_id, item_code) 
REFERENCES dkegl_item_master(organization_id, item_code);