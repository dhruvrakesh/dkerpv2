-- Create stock snapshots table for daily automated capture at 4 PM IST
CREATE TABLE dkegl_stock_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES dkegl_organizations(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  snapshot_data JSONB NOT NULL,
  file_name TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  total_value NUMERIC(15,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one snapshot per day per organization
  UNIQUE(organization_id, snapshot_date)
);

-- Enable RLS
ALTER TABLE dkegl_stock_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Organization members can access stock snapshots"
  ON dkegl_stock_snapshots
  FOR ALL
  USING (organization_id = dkegl_get_current_user_org())
  WITH CHECK (organization_id = dkegl_get_current_user_org());

-- Create index for performance
CREATE INDEX idx_dkegl_stock_snapshots_org_date ON dkegl_stock_snapshots(organization_id, snapshot_date DESC);

-- Function to capture daily stock snapshot at 4 PM IST
CREATE OR REPLACE FUNCTION dkegl_capture_daily_stock_snapshot(_org_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org_id UUID;
  snapshot_data JSONB;
  record_count INTEGER;
  total_value NUMERIC := 0;
  file_name TEXT;
  snapshot_date DATE := CURRENT_DATE;
BEGIN
  -- Use provided org_id or get current user's org
  org_id := COALESCE(_org_id, dkegl_get_current_user_org());
  
  IF org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  -- Generate filename
  file_name := FORMAT('stock_snapshot_%s_%s.json', 
    (SELECT code FROM dkegl_organizations WHERE id = org_id),
    TO_CHAR(snapshot_date, 'YYYY_MM_DD')
  );
  
  -- Get comprehensive stock data
  SELECT jsonb_agg(
    jsonb_build_object(
      'item_code', s.item_code,
      'item_name', COALESCE(im.item_name, 'Unknown'),
      'category_name', COALESCE(c.category_name, 'Uncategorized'),
      'current_qty', s.current_qty,
      'unit_cost', s.unit_cost,
      'total_value', (s.current_qty * s.unit_cost),
      'location', s.location,
      'last_transaction_date', s.last_transaction_date,
      'last_updated', s.last_updated,
      'uom', COALESCE(im.uom, 'PCS'),
      'reorder_level', im.reorder_level,
      'is_low_stock', (s.current_qty <= COALESCE(im.reorder_level, 0)),
      'days_since_movement', 
        CASE 
          WHEN s.last_transaction_date IS NULL THEN 999
          ELSE EXTRACT(DAY FROM CURRENT_DATE - s.last_transaction_date)::INTEGER
        END,
      'aging_category',
        CASE 
          WHEN s.last_transaction_date IS NULL THEN 'No Movement'
          WHEN EXTRACT(DAY FROM CURRENT_DATE - s.last_transaction_date) <= 30 THEN 'Fresh (0-30 days)'
          WHEN EXTRACT(DAY FROM CURRENT_DATE - s.last_transaction_date) <= 90 THEN 'Good (31-90 days)'
          WHEN EXTRACT(DAY FROM CURRENT_DATE - s.last_transaction_date) <= 180 THEN 'Aging (91-180 days)'
          WHEN EXTRACT(DAY FROM CURRENT_DATE - s.last_transaction_date) <= 365 THEN 'Old (181-365 days)'
          ELSE 'Critical (>365 days)'
        END
    )
  ), COUNT(*), SUM(s.current_qty * s.unit_cost)
  INTO snapshot_data, record_count, total_value
  FROM dkegl_stock s
  LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
  LEFT JOIN dkegl_categories c ON im.category_id = c.id
  WHERE s.organization_id = org_id;
  
  -- Insert or update snapshot (prevent duplicates)
  INSERT INTO dkegl_stock_snapshots (
    organization_id,
    snapshot_date,
    snapshot_data,
    file_name,
    record_count,
    total_value,
    metadata
  ) VALUES (
    org_id,
    snapshot_date,
    snapshot_data,
    file_name,
    record_count,
    COALESCE(total_value, 0),
    jsonb_build_object(
      'captured_at', NOW(),
      'capture_time_ist', TO_CHAR(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS'),
      'source', 'automated_capture',
      'version', '1.0'
    )
  )
  ON CONFLICT (organization_id, snapshot_date) 
  DO UPDATE SET 
    snapshot_data = EXCLUDED.snapshot_data,
    record_count = EXCLUDED.record_count,
    total_value = EXCLUDED.total_value,
    updated_at = NOW(),
    metadata = EXCLUDED.metadata;
  
  RETURN jsonb_build_object(
    'success', true,
    'date', snapshot_date,
    'file_name', file_name,
    'record_count', record_count,
    'total_value', COALESCE(total_value, 0),
    'message', 'Stock snapshot captured successfully'
  );
END;
$$;

-- Function to get paginated stock data
CREATE OR REPLACE FUNCTION dkegl_get_paginated_stock(
  _org_id UUID,
  _page INTEGER DEFAULT 1,
  _page_size INTEGER DEFAULT 50,
  _search TEXT DEFAULT NULL,
  _category_filter TEXT DEFAULT NULL,
  _status_filter TEXT DEFAULT NULL,
  _sort_column TEXT DEFAULT 'item_code',
  _sort_direction TEXT DEFAULT 'asc'
)
RETURNS TABLE(
  item_code TEXT,
  item_name TEXT,
  category_name TEXT,
  current_qty NUMERIC,
  unit_cost NUMERIC,
  total_value NUMERIC,
  location TEXT,
  uom TEXT,
  reorder_level NUMERIC,
  is_low_stock BOOLEAN,
  last_transaction_date DATE,
  last_updated TIMESTAMP WITH TIME ZONE,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  offset_val INTEGER;
  where_clause TEXT := '';
  order_clause TEXT;
  query_text TEXT;
BEGIN
  offset_val := (_page - 1) * _page_size;
  
  -- Build WHERE clause
  where_clause := 's.organization_id = $1';
  
  IF _search IS NOT NULL AND _search != '' THEN
    where_clause := where_clause || ' AND (s.item_code ILIKE $2 OR im.item_name ILIKE $2 OR c.category_name ILIKE $2)';
  END IF;
  
  IF _category_filter IS NOT NULL AND _category_filter != '' THEN
    where_clause := where_clause || ' AND c.category_name = ' || quote_literal(_category_filter);
  END IF;
  
  IF _status_filter IS NOT NULL AND _status_filter != '' THEN
    IF _status_filter = 'low_stock' THEN
      where_clause := where_clause || ' AND s.current_qty <= COALESCE(im.reorder_level, 0)';
    ELSIF _status_filter = 'out_of_stock' THEN
      where_clause := where_clause || ' AND s.current_qty = 0';
    ELSIF _status_filter = 'in_stock' THEN
      where_clause := where_clause || ' AND s.current_qty > COALESCE(im.reorder_level, 0)';
    END IF;
  END IF;
  
  -- Build ORDER clause
  order_clause := _sort_column || ' ' || _sort_direction;
  
  -- Execute query
  RETURN QUERY EXECUTE format('
    SELECT 
      s.item_code,
      COALESCE(im.item_name, ''Unknown'') as item_name,
      COALESCE(c.category_name, ''Uncategorized'') as category_name,
      s.current_qty,
      s.unit_cost,
      (s.current_qty * s.unit_cost) as total_value,
      s.location,
      COALESCE(im.uom, ''PCS'') as uom,
      im.reorder_level,
      (s.current_qty <= COALESCE(im.reorder_level, 0)) as is_low_stock,
      s.last_transaction_date,
      s.last_updated,
      COUNT(*) OVER() as total_count
    FROM dkegl_stock s
    LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
    LEFT JOIN dkegl_categories c ON im.category_id = c.id
    WHERE %s
    ORDER BY %s
    LIMIT %s OFFSET %s
  ', where_clause, order_clause, _page_size, offset_val)
  USING _org_id, CASE WHEN _search IS NOT NULL THEN '%' || _search || '%' ELSE NULL END;
END;
$$;