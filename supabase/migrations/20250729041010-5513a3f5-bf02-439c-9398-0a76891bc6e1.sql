-- Phase 1: Establish Common Source of Truth - Create unified data views and standardized functions

-- Create unified data views for sales data
CREATE OR REPLACE VIEW dkpkl_unified_sales_view AS
SELECT 
  sr.batch_id,
  sr.organization_id,
  sr.voucher_number,
  sr.voucher_date,
  sr.party_name as customer_name,
  sr.amount,
  sr.tax_amount,
  sr.total_amount,
  sr.item_details,
  sr.gst_details,
  ib.period_start,
  ib.period_end,
  ib.import_type,
  ib.status as batch_status,
  sr.validation_status,
  sr.created_at
FROM dkpkl_sales_records sr
JOIN dkpkl_import_batches ib ON sr.batch_id = ib.id
WHERE ib.import_type = 'SALES';

-- Create unified data views for purchase data
CREATE OR REPLACE VIEW dkpkl_unified_purchase_view AS
SELECT 
  pr.batch_id,
  pr.organization_id,
  pr.voucher_number,
  pr.voucher_date,
  pr.vendor_name,
  pr.amount,
  pr.tax_amount,
  pr.total_amount,
  pr.item_details,
  pr.gst_details,
  ib.period_start,
  ib.period_end,
  ib.import_type,
  ib.status as batch_status,
  pr.validation_status,
  pr.created_at
FROM dkpkl_purchase_records pr
JOIN dkpkl_import_batches ib ON pr.batch_id = ib.id
WHERE ib.import_type = 'PURCHASE';

-- Phase 2: Enterprise Sales Reporting Functions

-- Sales summary analytics function
CREATE OR REPLACE FUNCTION dkpkl_get_sales_summary(
  _org_id UUID,
  _start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  _end_date DATE DEFAULT CURRENT_DATE
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_revenue', COALESCE(SUM(total_amount), 0),
    'total_transactions', COUNT(*),
    'avg_transaction_value', COALESCE(AVG(total_amount), 0),
    'revenue_growth', COALESCE(
      (SELECT 
        CASE 
          WHEN prev_revenue > 0 THEN ((SUM(total_amount) - prev_revenue) / prev_revenue * 100)
          ELSE 0 
        END
       FROM (
         SELECT COALESCE(SUM(total_amount), 0) as prev_revenue
         FROM dkpkl_unified_sales_view
         WHERE organization_id = _org_id
         AND voucher_date BETWEEN (_start_date - (_end_date - _start_date)) AND _start_date
       ) prev
      ), 0
    ),
    'top_customers', (
      SELECT json_agg(customer_data ORDER BY total_amount DESC)
      FROM (
        SELECT 
          customer_name,
          SUM(total_amount) as total_amount,
          COUNT(*) as transaction_count
        FROM dkpkl_unified_sales_view
        WHERE organization_id = _org_id
        AND voucher_date BETWEEN _start_date AND _end_date
        GROUP BY customer_name
        LIMIT 10
      ) customer_data
    ),
    'daily_revenue', (
      SELECT json_agg(daily_data ORDER BY revenue_date)
      FROM (
        SELECT 
          voucher_date as revenue_date,
          SUM(total_amount) as daily_revenue,
          COUNT(*) as daily_transactions
        FROM dkpkl_unified_sales_view
        WHERE organization_id = _org_id
        AND voucher_date BETWEEN _start_date AND _end_date
        GROUP BY voucher_date
        ORDER BY voucher_date
      ) daily_data
    )
  )
  INTO result
  FROM dkpkl_unified_sales_view
  WHERE organization_id = _org_id
  AND voucher_date BETWEEN _start_date AND _end_date;
  
  RETURN COALESCE(result, '{"total_revenue": 0, "total_transactions": 0, "avg_transaction_value": 0, "revenue_growth": 0}'::json);
END;
$$;

-- Customer analysis function
CREATE OR REPLACE FUNCTION dkpkl_get_customer_analysis(
  _org_id UUID,
  _start_date DATE DEFAULT CURRENT_DATE - INTERVAL '90 days',
  _end_date DATE DEFAULT CURRENT_DATE
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'customer_segmentation', (
      SELECT json_agg(segment_data)
      FROM (
        SELECT 
          CASE 
            WHEN total_amount >= 100000 THEN 'Premium'
            WHEN total_amount >= 50000 THEN 'High Value'
            WHEN total_amount >= 10000 THEN 'Regular'
            ELSE 'Basic'
          END as segment,
          COUNT(*) as customer_count,
          SUM(total_amount) as segment_revenue
        FROM (
          SELECT 
            customer_name,
            SUM(total_amount) as total_amount
          FROM dkpkl_unified_sales_view
          WHERE organization_id = _org_id
          AND voucher_date BETWEEN _start_date AND _end_date
          GROUP BY customer_name
        ) customer_totals
        GROUP BY segment
      ) segment_data
    ),
    'new_customers', (
      SELECT COUNT(DISTINCT customer_name)
      FROM dkpkl_unified_sales_view
      WHERE organization_id = _org_id
      AND voucher_date BETWEEN _start_date AND _end_date
      AND customer_name NOT IN (
        SELECT DISTINCT customer_name
        FROM dkpkl_unified_sales_view
        WHERE organization_id = _org_id
        AND voucher_date < _start_date
      )
    ),
    'customer_retention_rate', (
      SELECT 
        CASE 
          WHEN prev_customers > 0 THEN (returning_customers::FLOAT / prev_customers * 100)
          ELSE 0 
        END
      FROM (
        SELECT 
          COUNT(DISTINCT prev.customer_name) as prev_customers,
          COUNT(DISTINCT curr.customer_name) as returning_customers
        FROM (
          SELECT DISTINCT customer_name
          FROM dkpkl_unified_sales_view
          WHERE organization_id = _org_id
          AND voucher_date BETWEEN (_start_date - INTERVAL '90 days') AND _start_date
        ) prev
        LEFT JOIN (
          SELECT DISTINCT customer_name
          FROM dkpkl_unified_sales_view
          WHERE organization_id = _org_id
          AND voucher_date BETWEEN _start_date AND _end_date
        ) curr ON prev.customer_name = curr.customer_name
      ) retention_calc
    )
  ) INTO result;
  
  RETURN COALESCE(result, '{}'::json);
END;
$$;

-- Phase 3: Enterprise Purchase Reporting Functions

-- Purchase summary analytics function
CREATE OR REPLACE FUNCTION dkpkl_get_purchase_summary(
  _org_id UUID,
  _start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  _end_date DATE DEFAULT CURRENT_DATE
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_spend', COALESCE(SUM(total_amount), 0),
    'total_orders', COUNT(*),
    'avg_order_value', COALESCE(AVG(total_amount), 0),
    'spend_growth', COALESCE(
      (SELECT 
        CASE 
          WHEN prev_spend > 0 THEN ((SUM(total_amount) - prev_spend) / prev_spend * 100)
          ELSE 0 
        END
       FROM (
         SELECT COALESCE(SUM(total_amount), 0) as prev_spend
         FROM dkpkl_unified_purchase_view
         WHERE organization_id = _org_id
         AND voucher_date BETWEEN (_start_date - (_end_date - _start_date)) AND _start_date
       ) prev
      ), 0
    ),
    'top_vendors', (
      SELECT json_agg(vendor_data ORDER BY total_amount DESC)
      FROM (
        SELECT 
          vendor_name,
          SUM(total_amount) as total_amount,
          COUNT(*) as order_count
        FROM dkpkl_unified_purchase_view
        WHERE organization_id = _org_id
        AND voucher_date BETWEEN _start_date AND _end_date
        GROUP BY vendor_name
        LIMIT 10
      ) vendor_data
    ),
    'daily_spend', (
      SELECT json_agg(daily_data ORDER BY spend_date)
      FROM (
        SELECT 
          voucher_date as spend_date,
          SUM(total_amount) as daily_spend,
          COUNT(*) as daily_orders
        FROM dkpkl_unified_purchase_view
        WHERE organization_id = _org_id
        AND voucher_date BETWEEN _start_date AND _end_date
        GROUP BY voucher_date
        ORDER BY voucher_date
      ) daily_data
    )
  )
  INTO result
  FROM dkpkl_unified_purchase_view
  WHERE organization_id = _org_id
  AND voucher_date BETWEEN _start_date AND _end_date;
  
  RETURN COALESCE(result, '{"total_spend": 0, "total_orders": 0, "avg_order_value": 0, "spend_growth": 0}'::json);
END;
$$;

-- Vendor performance analysis function
CREATE OR REPLACE FUNCTION dkpkl_get_vendor_analysis(
  _org_id UUID,
  _start_date DATE DEFAULT CURRENT_DATE - INTERVAL '90 days',
  _end_date DATE DEFAULT CURRENT_DATE
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'vendor_performance', (
      SELECT json_agg(vendor_data ORDER BY total_amount DESC)
      FROM (
        SELECT 
          vendor_name,
          SUM(total_amount) as total_amount,
          COUNT(*) as order_count,
          AVG(total_amount) as avg_order_value,
          ROUND(
            CASE 
              WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE validation_status = 'valid')::FLOAT / COUNT(*) * 100)
              ELSE 0 
            END, 2
          ) as quality_score
        FROM dkpkl_unified_purchase_view
        WHERE organization_id = _org_id
        AND voucher_date BETWEEN _start_date AND _end_date
        GROUP BY vendor_name
        HAVING COUNT(*) > 0
      ) vendor_data
    ),
    'vendor_categories', (
      SELECT json_agg(category_data)
      FROM (
        SELECT 
          CASE 
            WHEN total_amount >= 500000 THEN 'Strategic'
            WHEN total_amount >= 100000 THEN 'Preferred'
            WHEN total_amount >= 25000 THEN 'Standard'
            ELSE 'Occasional'
          END as category,
          COUNT(*) as vendor_count,
          SUM(total_amount) as category_spend
        FROM (
          SELECT 
            vendor_name,
            SUM(total_amount) as total_amount
          FROM dkpkl_unified_purchase_view
          WHERE organization_id = _org_id
          AND voucher_date BETWEEN _start_date AND _end_date
          GROUP BY vendor_name
        ) vendor_totals
        GROUP BY category
      ) category_data
    )
  ) INTO result;
  
  RETURN COALESCE(result, '{}'::json);
END;
$$;

-- Phase 4: Cross-Functional Enterprise Reports

-- Financial consolidation function
CREATE OR REPLACE FUNCTION dkpkl_get_financial_summary(
  _org_id UUID,
  _start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  _end_date DATE DEFAULT CURRENT_DATE
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  sales_total NUMERIC;
  purchase_total NUMERIC;
BEGIN
  -- Get sales total
  SELECT COALESCE(SUM(total_amount), 0) INTO sales_total
  FROM dkpkl_unified_sales_view
  WHERE organization_id = _org_id
  AND voucher_date BETWEEN _start_date AND _end_date;
  
  -- Get purchase total
  SELECT COALESCE(SUM(total_amount), 0) INTO purchase_total
  FROM dkpkl_unified_purchase_view
  WHERE organization_id = _org_id
  AND voucher_date BETWEEN _start_date AND _end_date;
  
  SELECT json_build_object(
    'revenue', sales_total,
    'expenses', purchase_total,
    'gross_profit', (sales_total - purchase_total),
    'profit_margin', CASE 
      WHEN sales_total > 0 THEN ROUND(((sales_total - purchase_total) / sales_total * 100), 2)
      ELSE 0 
    END,
    'cash_flow_trend', (
      SELECT json_agg(flow_data ORDER BY period_date)
      FROM (
        SELECT 
          period_date,
          SUM(revenue) as revenue,
          SUM(expenses) as expenses,
          SUM(revenue) - SUM(expenses) as net_flow
        FROM (
          SELECT 
            voucher_date as period_date,
            total_amount as revenue,
            0 as expenses
          FROM dkpkl_unified_sales_view
          WHERE organization_id = _org_id
          AND voucher_date BETWEEN _start_date AND _end_date
          
          UNION ALL
          
          SELECT 
            voucher_date as period_date,
            0 as revenue,
            total_amount as expenses
          FROM dkpkl_unified_purchase_view
          WHERE organization_id = _org_id
          AND voucher_date BETWEEN _start_date AND _end_date
        ) combined_data
        GROUP BY period_date
        ORDER BY period_date
      ) flow_data
    )
  ) INTO result;
  
  RETURN COALESCE(result, '{"revenue": 0, "expenses": 0, "gross_profit": 0, "profit_margin": 0}'::json);
END;
$$;

-- Executive dashboard summary function
CREATE OR REPLACE FUNCTION dkpkl_get_executive_summary(
  _org_id UUID,
  _period TEXT DEFAULT 'monthly' -- 'daily', 'weekly', 'monthly', 'quarterly'
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  date_interval INTERVAL;
  start_date DATE;
  end_date DATE;
BEGIN
  -- Determine date range based on period
  CASE _period
    WHEN 'daily' THEN 
      date_interval := INTERVAL '1 day';
      start_date := CURRENT_DATE - INTERVAL '7 days';
    WHEN 'weekly' THEN 
      date_interval := INTERVAL '7 days';
      start_date := CURRENT_DATE - INTERVAL '8 weeks';
    WHEN 'monthly' THEN 
      date_interval := INTERVAL '30 days';
      start_date := CURRENT_DATE - INTERVAL '12 months';
    WHEN 'quarterly' THEN 
      date_interval := INTERVAL '90 days';
      start_date := CURRENT_DATE - INTERVAL '4 quarters';
    ELSE
      date_interval := INTERVAL '30 days';
      start_date := CURRENT_DATE - INTERVAL '12 months';
  END CASE;
  
  end_date := CURRENT_DATE;
  
  SELECT json_build_object(
    'period', _period,
    'date_range', json_build_object(
      'start_date', start_date,
      'end_date', end_date
    ),
    'kpis', json_build_object(
      'total_revenue', (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM dkpkl_unified_sales_view
        WHERE organization_id = _org_id
        AND voucher_date BETWEEN start_date AND end_date
      ),
      'total_expenses', (
        SELECT COALESCE(SUM(total_amount), 0)
        FROM dkpkl_unified_purchase_view
        WHERE organization_id = _org_id
        AND voucher_date BETWEEN start_date AND end_date
      ),
      'active_customers', (
        SELECT COUNT(DISTINCT customer_name)
        FROM dkpkl_unified_sales_view
        WHERE organization_id = _org_id
        AND voucher_date BETWEEN start_date AND end_date
      ),
      'active_vendors', (
        SELECT COUNT(DISTINCT vendor_name)
        FROM dkpkl_unified_purchase_view
        WHERE organization_id = _org_id
        AND voucher_date BETWEEN start_date AND end_date
      ),
      'data_quality_score', (
        SELECT ROUND(AVG(
          CASE 
            WHEN validation_status = 'valid' THEN 100
            WHEN validation_status = 'warning' THEN 75
            ELSE 0
          END
        ), 2)
        FROM (
          SELECT validation_status FROM dkpkl_unified_sales_view
          WHERE organization_id = _org_id
          AND voucher_date BETWEEN start_date AND end_date
          UNION ALL
          SELECT validation_status FROM dkpkl_unified_purchase_view
          WHERE organization_id = _org_id
          AND voucher_date BETWEEN start_date AND end_date
        ) all_records
      )
    ),
    'trends', json_build_object(
      'revenue_trend', dkpkl_get_sales_summary(_org_id, start_date, end_date),
      'expense_trend', dkpkl_get_purchase_summary(_org_id, start_date, end_date)
    )
  ) INTO result;
  
  RETURN COALESCE(result, '{}'::json);
END;
$$;