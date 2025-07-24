-- Enhanced Stock Analytics Functions
-- Stock Movement Tracking Function
CREATE OR REPLACE FUNCTION dkegl_get_stock_movements(_org_id UUID, _item_code TEXT DEFAULT NULL, _days INTEGER DEFAULT 30)
RETURNS TABLE(
  transaction_date DATE,
  transaction_type TEXT,
  item_code TEXT,
  item_name TEXT,
  quantity NUMERIC,
  running_balance NUMERIC,
  source_reference TEXT,
  unit_cost NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH movements AS (
    -- GRN movements (incoming)
    SELECT 
      g.date as transaction_date,
      'GRN'::TEXT as transaction_type,
      g.item_code,
      im.item_name,
      g.qty_received as quantity,
      g.grn_number as source_reference,
      CASE WHEN g.amount_inr > 0 AND g.qty_received > 0 
           THEN g.amount_inr / g.qty_received 
           ELSE 0 END as unit_cost
    FROM dkegl_grn_log g
    LEFT JOIN dkegl_item_master im ON g.organization_id = im.organization_id AND g.item_code = im.item_code
    WHERE g.organization_id = _org_id
      AND (_item_code IS NULL OR g.item_code = _item_code)
      AND g.date >= CURRENT_DATE - INTERVAL '1 day' * _days
    
    UNION ALL
    
    -- Issue movements (outgoing)
    SELECT 
      i.date as transaction_date,
      'ISSUE'::TEXT as transaction_type,
      i.item_code,
      im.item_name,
      -i.qty_issued as quantity,
      i.purpose as source_reference,
      0 as unit_cost
    FROM dkegl_issue_log i
    LEFT JOIN dkegl_item_master im ON i.organization_id = im.organization_id AND i.item_code = im.item_code
    WHERE i.organization_id = _org_id
      AND (_item_code IS NULL OR i.item_code = _item_code)
      AND i.date >= CURRENT_DATE - INTERVAL '1 day' * _days
  )
  SELECT 
    m.transaction_date,
    m.transaction_type,
    m.item_code,
    m.item_name,
    m.quantity,
    SUM(m.quantity) OVER (
      PARTITION BY m.item_code 
      ORDER BY m.transaction_date, m.transaction_type
      ROWS UNBOUNDED PRECEDING
    ) as running_balance,
    m.source_reference,
    m.unit_cost
  FROM movements m
  ORDER BY m.item_code, m.transaction_date DESC, m.transaction_type;
END;
$$;

-- Stock Aging Analysis Function
CREATE OR REPLACE FUNCTION dkegl_get_stock_aging(_org_id UUID)
RETURNS TABLE(
  item_code TEXT,
  item_name TEXT,
  category_name TEXT,
  current_qty NUMERIC,
  last_movement_date DATE,
  days_since_movement INTEGER,
  aging_category TEXT,
  estimated_value NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.item_code,
    im.item_name,
    c.category_name,
    s.current_qty,
    s.last_transaction_date,
    EXTRACT(DAY FROM CURRENT_DATE - s.last_transaction_date)::INTEGER as days_since_movement,
    CASE 
      WHEN EXTRACT(DAY FROM CURRENT_DATE - s.last_transaction_date) <= 30 THEN 'Fresh (0-30 days)'
      WHEN EXTRACT(DAY FROM CURRENT_DATE - s.last_transaction_date) <= 90 THEN 'Good (31-90 days)'
      WHEN EXTRACT(DAY FROM CURRENT_DATE - s.last_transaction_date) <= 180 THEN 'Aging (91-180 days)'
      WHEN EXTRACT(DAY FROM CURRENT_DATE - s.last_transaction_date) <= 365 THEN 'Old (181-365 days)'
      ELSE 'Critical (>365 days)'
    END as aging_category,
    s.current_qty * s.unit_cost as estimated_value
  FROM dkegl_stock s
  LEFT JOIN dkegl_item_master im ON s.organization_id = im.organization_id AND s.item_code = im.item_code
  LEFT JOIN dkegl_categories c ON im.category_id = c.id
  WHERE s.organization_id = _org_id
    AND s.current_qty > 0
  ORDER BY days_since_movement DESC;
END;
$$;

-- Pricing Calculation Engine
CREATE OR REPLACE FUNCTION dkegl_calculate_item_pricing(_org_id UUID, _item_code TEXT, _customer_tier TEXT DEFAULT 'standard', _quantity NUMERIC DEFAULT 1)
RETURNS TABLE(
  pricing_source TEXT,
  unit_price NUMERIC,
  total_price NUMERIC,
  discount_applied NUMERIC,
  margin_percentage NUMERIC,
  is_primary BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  primary_price NUMERIC;
  grn_avg_price NUMERIC;
  master_cost NUMERIC;
  final_price NUMERIC;
  applied_discount NUMERIC;
  cost_basis NUMERIC;
BEGIN
  -- Get Primary Pricing (Pricing Hierarchy)
  SELECT ph.final_price, ph.discount_percentage
  INTO primary_price, applied_discount
  FROM dkegl_pricing_hierarchy ph
  WHERE ph.organization_id = _org_id 
    AND ph.item_code = _item_code
    AND ph.customer_tier = _customer_tier
    AND ph.is_active = true
    AND ph.effective_from <= CURRENT_DATE
    AND (ph.effective_until IS NULL OR ph.effective_until >= CURRENT_DATE)
    AND _quantity >= ph.min_quantity
    AND (_quantity <= ph.max_quantity OR ph.max_quantity IS NULL)
  ORDER BY ph.min_quantity DESC
  LIMIT 1;

  -- Get GRN Average Pricing (Last 90 days)
  SELECT AVG(CASE WHEN g.qty_received > 0 AND g.amount_inr > 0 
                  THEN g.amount_inr / g.qty_received 
                  ELSE NULL END)
  INTO grn_avg_price
  FROM dkegl_grn_log g
  WHERE g.organization_id = _org_id 
    AND g.item_code = _item_code
    AND g.date >= CURRENT_DATE - INTERVAL '90 days';

  -- Get Item Master Cost
  SELECT COALESCE((im.pricing_info->>'unit_cost')::NUMERIC, 0)
  INTO master_cost
  FROM dkegl_item_master im
  WHERE im.organization_id = _org_id AND im.item_code = _item_code;

  -- Return pricing hierarchy
  IF primary_price IS NOT NULL THEN
    RETURN QUERY SELECT 
      'Pricing Master'::TEXT,
      primary_price,
      primary_price * _quantity,
      COALESCE(applied_discount, 0),
      CASE WHEN COALESCE(master_cost, 0) > 0 
           THEN ((primary_price - master_cost) / primary_price * 100)
           ELSE 0 END,
      true;
  END IF;

  IF grn_avg_price IS NOT NULL THEN
    RETURN QUERY SELECT 
      'GRN Average (90d)'::TEXT,
      grn_avg_price,
      grn_avg_price * _quantity,
      0::NUMERIC,
      CASE WHEN COALESCE(master_cost, 0) > 0 
           THEN ((grn_avg_price - master_cost) / grn_avg_price * 100)
           ELSE 0 END,
      primary_price IS NULL;
  END IF;

  IF master_cost IS NOT NULL AND master_cost > 0 THEN
    RETURN QUERY SELECT 
      'Item Master Cost'::TEXT,
      master_cost,
      master_cost * _quantity,
      0::NUMERIC,
      0::NUMERIC,
      primary_price IS NULL AND grn_avg_price IS NULL;
  END IF;
END;
$$;

-- Consumption Pattern Analysis
CREATE OR REPLACE FUNCTION dkegl_analyze_consumption_patterns(_org_id UUID, _item_code TEXT DEFAULT NULL)
RETURNS TABLE(
  item_code TEXT,
  item_name TEXT,
  avg_monthly_consumption NUMERIC,
  consumption_trend TEXT,
  seasonality_factor NUMERIC,
  recommended_reorder_level NUMERIC,
  recommended_reorder_quantity NUMERIC,
  next_reorder_date DATE
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH monthly_consumption AS (
    SELECT 
      i.item_code,
      im.item_name,
      DATE_TRUNC('month', i.date) as month,
      SUM(i.qty_issued) as monthly_qty
    FROM dkegl_issue_log i
    LEFT JOIN dkegl_item_master im ON i.organization_id = im.organization_id AND i.item_code = im.item_code
    WHERE i.organization_id = _org_id
      AND (_item_code IS NULL OR i.item_code = _item_code)
      AND i.date >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY i.item_code, im.item_name, DATE_TRUNC('month', i.date)
  ),
  consumption_stats AS (
    SELECT 
      mc.item_code,
      mc.item_name,
      AVG(mc.monthly_qty) as avg_monthly,
      STDDEV(mc.monthly_qty) as stddev_monthly,
      COUNT(*) as months_data,
      -- Simple trend calculation (last 3 months vs previous 3 months)
      CASE 
        WHEN AVG(CASE WHEN mc.month >= CURRENT_DATE - INTERVAL '3 months' THEN mc.monthly_qty END) >
             AVG(CASE WHEN mc.month < CURRENT_DATE - INTERVAL '3 months' 
                           AND mc.month >= CURRENT_DATE - INTERVAL '6 months' 
                      THEN mc.monthly_qty END) * 1.1 
        THEN 'Increasing'
        WHEN AVG(CASE WHEN mc.month >= CURRENT_DATE - INTERVAL '3 months' THEN mc.monthly_qty END) <
             AVG(CASE WHEN mc.month < CURRENT_DATE - INTERVAL '3 months' 
                           AND mc.month >= CURRENT_DATE - INTERVAL '6 months' 
                      THEN mc.monthly_qty END) * 0.9
        THEN 'Decreasing'
        ELSE 'Stable'
      END as trend
    FROM monthly_consumption mc
    GROUP BY mc.item_code, mc.item_name
  )
  SELECT 
    cs.item_code,
    cs.item_name,
    COALESCE(cs.avg_monthly, 0) as avg_monthly_consumption,
    cs.trend as consumption_trend,
    CASE WHEN cs.stddev_monthly > 0 AND cs.avg_monthly > 0
         THEN cs.stddev_monthly / cs.avg_monthly 
         ELSE 0 END as seasonality_factor,
    -- Safety stock + lead time demand
    COALESCE(cs.avg_monthly, 0) * 1.5 as recommended_reorder_level,
    COALESCE(cs.avg_monthly, 0) * 2 as recommended_reorder_quantity,
    CURRENT_DATE + INTERVAL '30 days' as next_reorder_date
  FROM consumption_stats cs
  WHERE cs.avg_monthly > 0
  ORDER BY cs.avg_monthly DESC;
END;
$$;