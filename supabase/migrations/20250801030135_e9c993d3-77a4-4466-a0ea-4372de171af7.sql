-- PHASE 1 CONTINUED: Add foreign key constraints for data integrity

-- Add foreign key from dkegl_item_master to dkegl_categories
ALTER TABLE dkegl_item_master 
ADD CONSTRAINT fk_item_master_category 
FOREIGN KEY (category_id) REFERENCES dkegl_categories(id);

-- Add foreign key from dkegl_stock to dkegl_item_master
ALTER TABLE dkegl_stock 
ADD CONSTRAINT fk_stock_item_master 
FOREIGN KEY (organization_id, item_code) REFERENCES dkegl_item_master(organization_id, item_code);

-- Add foreign key from dkegl_grn_log to dkegl_item_master
ALTER TABLE dkegl_grn_log 
ADD CONSTRAINT fk_grn_item_master 
FOREIGN KEY (organization_id, item_code) REFERENCES dkegl_item_master(organization_id, item_code);

-- Add foreign key from dkegl_issue_log to dkegl_item_master
ALTER TABLE dkegl_issue_log 
ADD CONSTRAINT fk_issue_item_master 
FOREIGN KEY (organization_id, item_code) REFERENCES dkegl_item_master(organization_id, item_code);

-- Add foreign key from dkegl_pricing_master to dkegl_item_master
ALTER TABLE dkegl_pricing_master 
ADD CONSTRAINT fk_pricing_master_item 
FOREIGN KEY (organization_id, item_code) REFERENCES dkegl_item_master(organization_id, item_code);

-- Add foreign key from dkegl_bom_components to dkegl_item_master
ALTER TABLE dkegl_bom_components 
ADD CONSTRAINT fk_bom_component_item 
FOREIGN KEY (organization_id, component_item_code) REFERENCES dkegl_item_master(organization_id, item_code);

-- Add foreign key from dkegl_bom_master to dkegl_item_master
ALTER TABLE dkegl_bom_master 
ADD CONSTRAINT fk_bom_master_item 
FOREIGN KEY (organization_id, item_code) REFERENCES dkegl_item_master(organization_id, item_code);