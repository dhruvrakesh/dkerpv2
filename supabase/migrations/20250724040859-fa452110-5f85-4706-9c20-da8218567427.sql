-- DKEGL ERP Database Schema Migration
-- Phase 1: Complete Database Infrastructure for DKEGL

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create DKEGL-specific enums
CREATE TYPE dkegl_process_status AS ENUM (
  'pending', 'in_progress', 'completed', 'on_hold', 'cancelled', 'quality_check', 'approved', 'rejected'
);

CREATE TYPE dkegl_order_status AS ENUM (
  'draft', 'confirmed', 'in_production', 'completed', 'shipped', 'delivered', 'cancelled'
);

CREATE TYPE dkegl_quality_status AS ENUM (
  'pending', 'in_review', 'passed', 'failed', 'rework_required', 'approved'
);

CREATE TYPE dkegl_user_role AS ENUM (
  'admin', 'manager', 'operator', 'viewer', 'quality_controller', 'production_planner'
);

CREATE TYPE dkegl_transaction_type AS ENUM (
  'opening_stock', 'purchase', 'production', 'issue', 'adjustment', 'transfer', 'return'
);

-- Core DKEGL Tables

-- DKEGL Organizations table
CREATE TABLE dkegl_organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  contact_details JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- DKEGL User Profiles (isolated from main profiles)
CREATE TABLE dkegl_user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES dkegl_organizations(id),
  employee_id TEXT,
  full_name TEXT,
  department TEXT,
  designation TEXT,
  contact_number TEXT,
  email TEXT,
  preferences JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- DKEGL User Roles (isolated role management)
CREATE TABLE dkegl_user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES dkegl_organizations(id),
  role dkegl_user_role NOT NULL DEFAULT 'viewer',
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id, role)
);

-- DKEGL Categories (isolated from main categories)
CREATE TABLE dkegl_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  category_name TEXT NOT NULL,
  category_code TEXT NOT NULL,
  description TEXT,
  parent_category_id UUID REFERENCES dkegl_categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, category_code)
);

-- DKEGL Item Master (comprehensive item catalog)
CREATE TABLE dkegl_item_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  category_id UUID REFERENCES dkegl_categories(id),
  specifications JSONB DEFAULT '{}',
  material_properties JSONB DEFAULT '{}',
  dimensions JSONB DEFAULT '{}',
  weight_per_unit NUMERIC,
  uom TEXT NOT NULL DEFAULT 'PCS',
  hsn_code TEXT,
  reorder_level NUMERIC DEFAULT 0,
  reorder_quantity NUMERIC DEFAULT 0,
  lead_time_days INTEGER DEFAULT 0,
  storage_location TEXT,
  quality_parameters JSONB DEFAULT '{}',
  pricing_info JSONB DEFAULT '{}',
  supplier_info JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, item_code)
);

-- DKEGL Stock Management (current stock levels)
CREATE TABLE dkegl_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  item_code TEXT NOT NULL,
  location TEXT DEFAULT 'main_warehouse',
  opening_qty NUMERIC NOT NULL DEFAULT 0,
  current_qty NUMERIC NOT NULL DEFAULT 0,
  reserved_qty NUMERIC DEFAULT 0,
  available_qty NUMERIC GENERATED ALWAYS AS (current_qty - COALESCE(reserved_qty, 0)) STORED,
  last_transaction_date DATE,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valuation_method TEXT DEFAULT 'weighted_average',
  unit_cost NUMERIC DEFAULT 0,
  total_value NUMERIC GENERATED ALWAYS AS (current_qty * COALESCE(unit_cost, 0)) STORED,
  UNIQUE(organization_id, item_code, location)
);

-- DKEGL GRN Log (goods received notes)
CREATE TABLE dkegl_grn_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  grn_number TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  item_code TEXT NOT NULL,
  qty_received NUMERIC NOT NULL,
  uom TEXT NOT NULL,
  unit_rate NUMERIC,
  total_amount NUMERIC,
  supplier_name TEXT,
  invoice_number TEXT,
  invoice_date DATE,
  quality_status dkegl_quality_status DEFAULT 'pending',
  remarks TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, grn_number)
);

-- DKEGL Issue Log (material issues)
CREATE TABLE dkegl_issue_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  issue_number TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  item_code TEXT NOT NULL,
  qty_issued NUMERIC NOT NULL,
  uom TEXT NOT NULL,
  purpose TEXT,
  department TEXT,
  requested_by TEXT,
  approved_by TEXT,
  job_order_ref TEXT,
  remarks TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, issue_number)
);

-- Enhanced DKEGL Tape Orders (upgrade existing structure)
CREATE TABLE dkegl_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  order_number TEXT NOT NULL,
  uiorn TEXT NOT NULL,
  customer_info JSONB DEFAULT '{}',
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  order_quantity NUMERIC NOT NULL,
  specifications JSONB DEFAULT '{}',
  substrate_details JSONB DEFAULT '{}',
  printing_details JSONB DEFAULT '{}',
  delivery_date DATE,
  priority_level INTEGER DEFAULT 3,
  status dkegl_order_status DEFAULT 'draft',
  created_by UUID,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, order_number),
  UNIQUE(organization_id, uiorn)
);

-- DKEGL Production Schedule
CREATE TABLE dkegl_production_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  order_id UUID REFERENCES dkegl_orders(id),
  process_name TEXT NOT NULL,
  scheduled_start_date DATE,
  scheduled_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  assigned_operator TEXT,
  machine_allocated TEXT,
  status dkegl_process_status DEFAULT 'pending',
  priority INTEGER DEFAULT 3,
  estimated_duration_hours NUMERIC,
  actual_duration_hours NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- DKEGL Quality Control
CREATE TABLE dkegl_quality_control (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  order_id UUID REFERENCES dkegl_orders(id),
  process_name TEXT NOT NULL,
  inspection_date DATE DEFAULT CURRENT_DATE,
  inspector_name TEXT,
  quality_parameters JSONB DEFAULT '{}',
  test_results JSONB DEFAULT '{}',
  status dkegl_quality_status DEFAULT 'pending',
  defect_details TEXT,
  corrective_action TEXT,
  approval_status TEXT,
  approved_by TEXT,
  approval_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- DKEGL Analytics Tables

-- DKEGL Stock Summary View (as table for performance)
CREATE TABLE dkegl_stock_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  item_code TEXT NOT NULL,
  item_name TEXT,
  category_name TEXT,
  opening_qty NUMERIC,
  total_grn_qty NUMERIC,
  total_issued_qty NUMERIC,
  current_qty NUMERIC,
  calculated_qty NUMERIC,
  variance_qty NUMERIC GENERATED ALWAYS AS (current_qty - COALESCE(calculated_qty, 0)) STORED,
  issue_7d NUMERIC,
  issue_30d NUMERIC,
  issue_90d NUMERIC,
  consumption_rate_7d NUMERIC,
  consumption_rate_30d NUMERIC,
  consumption_rate_90d NUMERIC,
  days_of_cover NUMERIC,
  reorder_level NUMERIC,
  reorder_suggested BOOLEAN DEFAULT false,
  last_transaction_date DATE,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, item_code)
);

-- DKEGL Daily Stock Snapshots
CREATE TABLE dkegl_daily_stock_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  snapshot_date DATE NOT NULL,
  snapshot_data JSONB NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  total_value NUMERIC DEFAULT 0,
  variance_analysis JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, snapshot_date)
);

-- DKEGL Production Metrics
CREATE TABLE dkegl_production_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  process_name TEXT NOT NULL,
  total_orders INTEGER DEFAULT 0,
  completed_orders INTEGER DEFAULT 0,
  pending_orders INTEGER DEFAULT 0,
  efficiency_percentage NUMERIC DEFAULT 0,
  downtime_hours NUMERIC DEFAULT 0,
  quality_rejection_rate NUMERIC DEFAULT 0,
  on_time_delivery_rate NUMERIC DEFAULT 0,
  capacity_utilization NUMERIC DEFAULT 0,
  metrics_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, date, process_name)
);

-- DKEGL Audit Logs
CREATE TABLE dkegl_grn_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  grn_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE dkegl_issue_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES dkegl_organizations(id),
  issue_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_dkegl_stock_org_item ON dkegl_stock(organization_id, item_code);
CREATE INDEX idx_dkegl_grn_org_date ON dkegl_grn_log(organization_id, date);
CREATE INDEX idx_dkegl_issue_org_date ON dkegl_issue_log(organization_id, date);
CREATE INDEX idx_dkegl_orders_org_status ON dkegl_orders(organization_id, status);
CREATE INDEX idx_dkegl_production_org_date ON dkegl_production_schedule(organization_id, scheduled_start_date);

-- Enable Row Level Security on all tables
ALTER TABLE dkegl_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_item_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_grn_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_issue_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_production_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_quality_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_stock_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_daily_stock_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_production_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_grn_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE dkegl_issue_audit_log ENABLE ROW LEVEL SECURITY;