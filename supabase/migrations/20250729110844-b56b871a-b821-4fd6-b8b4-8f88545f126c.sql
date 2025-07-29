-- Create GST analytics and returns functions
CREATE OR REPLACE FUNCTION public.dkegl_get_gst_summary(_org_id uuid, _start_date date DEFAULT NULL, _end_date date DEFAULT NULL)
RETURNS TABLE(
  total_gst_liability numeric,
  total_input_tax_credit numeric,
  net_gst_payable numeric,
  cgst_amount numeric,
  sgst_amount numeric,
  igst_amount numeric,
  total_taxable_turnover numeric,
  gst_rate_wise_breakdown jsonb,
  monthly_gst_trend jsonb,
  vendor_wise_gst jsonb,
  customer_wise_gst jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  start_period date := COALESCE(_start_date, date_trunc('month', CURRENT_DATE));
  end_period date := COALESCE(_end_date, CURRENT_DATE);
  gst_breakdown jsonb := '[]'::jsonb;
  monthly_trend jsonb := '[]'::jsonb;
  vendor_gst jsonb := '[]'::jsonb;
  customer_gst jsonb := '[]'::jsonb;
BEGIN
  -- Calculate GST breakdown by rate
  SELECT jsonb_agg(
    jsonb_build_object(
      'gst_rate', COALESCE(gst_rate, 0),
      'taxable_amount', SUM(taxable_amount),
      'cgst_amount', SUM(cgst_amount),
      'sgst_amount', SUM(sgst_amount),
      'igst_amount', SUM(igst_amount),
      'total_gst', SUM(total_gst_amount)
    )
  ) INTO gst_breakdown
  FROM dkegl_gst_summary gs
  WHERE gs.organization_id = _org_id
    AND gs.transaction_date BETWEEN start_period AND end_period
  GROUP BY gst_rate;

  -- Calculate monthly GST trend
  SELECT jsonb_agg(
    jsonb_build_object(
      'month', TO_CHAR(date_trunc('month', transaction_date), 'YYYY-MM'),
      'total_gst', SUM(total_gst_amount),
      'taxable_amount', SUM(taxable_amount),
      'transaction_count', COUNT(*)
    ) ORDER BY date_trunc('month', transaction_date)
  ) INTO monthly_trend
  FROM dkegl_gst_summary gs
  WHERE gs.organization_id = _org_id
    AND gs.transaction_date BETWEEN start_period AND end_period
  GROUP BY date_trunc('month', transaction_date);

  -- Calculate vendor-wise GST for input tax credit
  SELECT jsonb_agg(
    jsonb_build_object(
      'vendor_name', v.vendor_name,
      'total_gst', SUM(gs.total_gst_amount),
      'taxable_amount', SUM(gs.taxable_amount),
      'transaction_count', COUNT(*)
    )
  ) INTO vendor_gst
  FROM dkegl_gst_summary gs
  LEFT JOIN dkegl_vendors v ON gs.vendor_id = v.id
  WHERE gs.organization_id = _org_id
    AND gs.transaction_type = 'purchase'
    AND gs.transaction_date BETWEEN start_period AND end_period
  GROUP BY v.vendor_name
  ORDER BY SUM(gs.total_gst_amount) DESC
  LIMIT 10;

  -- Calculate customer-wise GST for output tax
  SELECT jsonb_agg(
    jsonb_build_object(
      'customer_name', gs.customer_name,
      'total_gst', SUM(gs.total_gst_amount),
      'taxable_amount', SUM(gs.taxable_amount),
      'transaction_count', COUNT(*)
    )
  ) INTO customer_gst
  FROM dkegl_gst_summary gs
  WHERE gs.organization_id = _org_id
    AND gs.transaction_type = 'sale'
    AND gs.transaction_date BETWEEN start_period AND end_period
  GROUP BY gs.customer_name
  ORDER BY SUM(gs.total_gst_amount) DESC
  LIMIT 10;

  -- Return aggregated GST summary
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN transaction_type = 'sale' THEN total_gst_amount ELSE 0 END), 0) as total_gst_liability,
    COALESCE(SUM(CASE WHEN transaction_type = 'purchase' THEN total_gst_amount ELSE 0 END), 0) as total_input_tax_credit,
    COALESCE(SUM(CASE WHEN transaction_type = 'sale' THEN total_gst_amount ELSE 0 END) - 
             SUM(CASE WHEN transaction_type = 'purchase' THEN total_gst_amount ELSE 0 END), 0) as net_gst_payable,
    COALESCE(SUM(cgst_amount), 0) as cgst_amount,
    COALESCE(SUM(sgst_amount), 0) as sgst_amount,
    COALESCE(SUM(igst_amount), 0) as igst_amount,
    COALESCE(SUM(taxable_amount), 0) as total_taxable_turnover,
    COALESCE(gst_breakdown, '[]'::jsonb) as gst_rate_wise_breakdown,
    COALESCE(monthly_trend, '[]'::jsonb) as monthly_gst_trend,
    COALESCE(vendor_gst, '[]'::jsonb) as vendor_wise_gst,
    COALESCE(customer_gst, '[]'::jsonb) as customer_wise_gst
  FROM dkegl_gst_summary gs
  WHERE gs.organization_id = _org_id
    AND gs.transaction_date BETWEEN start_period AND end_period;
END;
$function$;

-- Create GSTR returns generation function
CREATE OR REPLACE FUNCTION public.dkegl_generate_gstr_returns(_org_id uuid, _return_type text, _month integer, _year integer)
RETURNS TABLE(
  return_data jsonb,
  summary jsonb,
  validation_errors jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  start_date date := make_date(_year, _month, 1);
  end_date date := (start_date + interval '1 month' - interval '1 day')::date;
  gstr_data jsonb := '{"outward_supplies": [], "inward_supplies": [], "summary": {}}'::jsonb;
  validation_issues jsonb := '[]'::jsonb;
  summary_data jsonb := '{}'::jsonb;
BEGIN
  IF _return_type = 'GSTR1' THEN
    -- Generate GSTR-1 outward supplies
    SELECT jsonb_build_object(
      'outward_supplies', jsonb_agg(
        jsonb_build_object(
          'gstin', COALESCE(customer_gstin, 'UNREGISTERED'),
          'invoice_number', invoice_number,
          'invoice_date', invoice_date,
          'invoice_value', taxable_amount + total_gst_amount,
          'place_of_supply', place_of_supply,
          'reverse_charge', 'N',
          'invoice_type', 'Regular',
          'rate', gst_rate,
          'taxable_value', taxable_amount,
          'igst_amount', igst_amount,
          'cgst_amount', cgst_amount,
          'sgst_amount', sgst_amount,
          'cess_amount', 0
        )
      ),
      'summary', jsonb_build_object(
        'total_invoices', COUNT(*),
        'total_taxable_value', SUM(taxable_amount),
        'total_tax_amount', SUM(total_gst_amount)
      )
    ) INTO gstr_data
    FROM dkegl_gst_summary
    WHERE organization_id = _org_id
      AND transaction_type = 'sale'
      AND transaction_date BETWEEN start_date AND end_date;

  ELSIF _return_type = 'GSTR3B' THEN
    -- Generate GSTR-3B monthly return
    SELECT jsonb_build_object(
      'outward_supplies', jsonb_build_object(
        'inter_state', SUM(CASE WHEN igst_amount > 0 THEN taxable_amount ELSE 0 END),
        'intra_state', SUM(CASE WHEN cgst_amount > 0 OR sgst_amount > 0 THEN taxable_amount ELSE 0 END),
        'zero_rated', 0,
        'exempted', 0
      ),
      'inward_supplies', jsonb_build_object(
        'itc_available', SUM(CASE WHEN transaction_type = 'purchase' THEN total_gst_amount ELSE 0 END),
        'itc_reversed', 0,
        'ineligible_itc', 0
      ),
      'tax_liability', jsonb_build_object(
        'igst', SUM(CASE WHEN transaction_type = 'sale' THEN igst_amount ELSE 0 END),
        'cgst', SUM(CASE WHEN transaction_type = 'sale' THEN cgst_amount ELSE 0 END),
        'sgst', SUM(CASE WHEN transaction_type = 'sale' THEN sgst_amount ELSE 0 END),
        'cess', 0
      ),
      'tax_paid', jsonb_build_object(
        'igst', SUM(CASE WHEN transaction_type = 'sale' THEN igst_amount ELSE 0 END),
        'cgst', SUM(CASE WHEN transaction_type = 'sale' THEN cgst_amount ELSE 0 END),
        'sgst', SUM(CASE WHEN transaction_type = 'sale' THEN sgst_amount ELSE 0 END),
        'cess', 0
      )
    ) INTO gstr_data
    FROM dkegl_gst_summary
    WHERE organization_id = _org_id
      AND transaction_date BETWEEN start_date AND end_date;
  END IF;

  -- Generate summary
  SELECT jsonb_build_object(
    'period', _month || '/' || _year,
    'return_type', _return_type,
    'total_transactions', COUNT(*),
    'total_tax_liability', SUM(CASE WHEN transaction_type = 'sale' THEN total_gst_amount ELSE 0 END),
    'total_input_credit', SUM(CASE WHEN transaction_type = 'purchase' THEN total_gst_amount ELSE 0 END),
    'net_tax_payable', SUM(CASE WHEN transaction_type = 'sale' THEN total_gst_amount ELSE 0 END) -
                       SUM(CASE WHEN transaction_type = 'purchase' THEN total_gst_amount ELSE 0 END)
  ) INTO summary_data
  FROM dkegl_gst_summary
  WHERE organization_id = _org_id
    AND transaction_date BETWEEN start_date AND end_date;

  RETURN QUERY SELECT gstr_data, summary_data, validation_issues;
END;
$function$;

-- Create GST compliance tracking function
CREATE OR REPLACE FUNCTION public.dkegl_track_gst_compliance(_org_id uuid)
RETURNS TABLE(
  compliance_score numeric,
  pending_returns jsonb,
  upcoming_deadlines jsonb,
  penalty_calculations jsonb,
  recommendations jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_month integer := EXTRACT(month FROM CURRENT_DATE);
  current_year integer := EXTRACT(year FROM CURRENT_DATE);
  score numeric := 100;
  pending jsonb := '[]'::jsonb;
  deadlines jsonb := '[]'::jsonb;
  penalties jsonb := '[]'::jsonb;
  tips jsonb := '[]'::jsonb;
BEGIN
  -- Calculate compliance score and generate recommendations
  SELECT jsonb_agg(
    jsonb_build_object(
      'month', generate_series_month,
      'year', generate_series_year,
      'gstr1_due', (make_date(generate_series_year, generate_series_month, 1) + interval '1 month' + interval '10 days')::date,
      'gstr3b_due', (make_date(generate_series_year, generate_series_month, 1) + interval '1 month' + interval '19 days')::date,
      'status', 'pending'
    )
  ) INTO pending
  FROM (
    SELECT 
      EXTRACT(month FROM generate_series) as generate_series_month,
      EXTRACT(year FROM generate_series) as generate_series_year
    FROM generate_series(
      CURRENT_DATE - interval '6 months',
      CURRENT_DATE,
      interval '1 month'
    )
  ) months;

  -- Generate upcoming deadlines
  SELECT jsonb_agg(
    jsonb_build_object(
      'deadline_type', deadline_type,
      'due_date', due_date,
      'days_remaining', (due_date - CURRENT_DATE),
      'priority', CASE WHEN (due_date - CURRENT_DATE) <= 3 THEN 'high' 
                      WHEN (due_date - CURRENT_DATE) <= 7 THEN 'medium' 
                      ELSE 'low' END
    )
  ) INTO deadlines
  FROM (
    VALUES 
      ('GSTR-1', (date_trunc('month', CURRENT_DATE) + interval '1 month' + interval '10 days')::date),
      ('GSTR-3B', (date_trunc('month', CURRENT_DATE) + interval '1 month' + interval '19 days')::date),
      ('Annual Return', make_date(current_year + 1, 12, 31))
  ) AS d(deadline_type, due_date)
  WHERE due_date > CURRENT_DATE;

  -- Generate recommendations
  tips := jsonb_build_array(
    jsonb_build_object(
      'category', 'Filing',
      'recommendation', 'Enable automatic GSTR-1 and GSTR-3B generation for timely compliance',
      'priority', 'high'
    ),
    jsonb_build_object(
      'category', 'Input Tax Credit',
      'recommendation', 'Reconcile purchase invoices monthly to maximize ITC claims',
      'priority', 'medium'
    ),
    jsonb_build_object(
      'category', 'HSN Compliance',
      'recommendation', 'Ensure all items have correct HSN codes for accurate tax calculation',
      'priority', 'medium'
    )
  );

  RETURN QUERY SELECT score, pending, deadlines, penalties, tips;
END;
$function$;