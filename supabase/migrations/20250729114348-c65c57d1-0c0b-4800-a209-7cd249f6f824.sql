-- Create GST master tables and functions for enterprise-grade GST management

-- GST Rate Master Table
CREATE TABLE IF NOT EXISTS public.dkegl_gst_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.dkegl_organizations(id),
  hsn_code TEXT NOT NULL,
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  cgst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  sgst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  igst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  cess_rate NUMERIC(5,2) DEFAULT 0,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GST Transaction Log
CREATE TABLE IF NOT EXISTS public.dkegl_gst_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.dkegl_organizations(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'purchase', 'credit_note', 'debit_note')),
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  party_gstin TEXT,
  party_name TEXT NOT NULL,
  place_of_supply TEXT NOT NULL,
  item_code TEXT,
  hsn_code TEXT NOT NULL,
  taxable_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  cgst_amount NUMERIC(15,2) DEFAULT 0,
  sgst_amount NUMERIC(15,2) DEFAULT 0,
  igst_amount NUMERIC(15,2) DEFAULT 0,
  cess_amount NUMERIC(15,2) DEFAULT 0,
  total_tax_amount NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  reverse_charge BOOLEAN DEFAULT FALSE,
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GST Compliance Tracking
CREATE TABLE IF NOT EXISTS public.dkegl_gst_compliance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.dkegl_organizations(id),
  compliance_month INTEGER NOT NULL,
  compliance_year INTEGER NOT NULL,
  return_type TEXT NOT NULL CHECK (return_type IN ('GSTR1', 'GSTR3B', 'GSTR2A', 'GSTR9')),
  filing_status TEXT DEFAULT 'pending' CHECK (filing_status IN ('pending', 'filed', 'late', 'revised')),
  due_date DATE NOT NULL,
  filed_date DATE,
  late_fee_paid NUMERIC(10,2) DEFAULT 0,
  interest_paid NUMERIC(10,2) DEFAULT 0,
  penalty_paid NUMERIC(10,2) DEFAULT 0,
  compliance_score NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, compliance_year, compliance_month, return_type)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_gst_rates_org_hsn ON public.dkegl_gst_rates(organization_id, hsn_code);
CREATE INDEX IF NOT EXISTS idx_gst_transactions_org_date ON public.dkegl_gst_transactions(organization_id, invoice_date);
CREATE INDEX IF NOT EXISTS idx_gst_compliance_org_period ON public.dkegl_gst_compliance(organization_id, compliance_year, compliance_month);

-- Enable RLS
ALTER TABLE public.dkegl_gst_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkegl_gst_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkegl_gst_compliance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organization members can access GST rates" 
ON public.dkegl_gst_rates FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "Organization members can access GST transactions" 
ON public.dkegl_gst_transactions FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

CREATE POLICY "Organization members can access GST compliance" 
ON public.dkegl_gst_compliance FOR ALL 
USING (organization_id = dkegl_get_current_user_org())
WITH CHECK (organization_id = dkegl_get_current_user_org());

-- GST Summary Function
CREATE OR REPLACE FUNCTION public.dkegl_get_gst_summary(
  _org_id UUID,
  _start_date DATE DEFAULT NULL,
  _end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  total_gst_liability NUMERIC,
  total_input_tax_credit NUMERIC,
  net_gst_payable NUMERIC,
  cgst_amount NUMERIC,
  sgst_amount NUMERIC,
  igst_amount NUMERIC,
  total_taxable_turnover NUMERIC,
  gst_rate_wise_breakdown JSONB,
  monthly_gst_trend JSONB,
  vendor_wise_gst JSONB,
  customer_wise_gst JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  start_date DATE := COALESCE(_start_date, DATE_TRUNC('month', CURRENT_DATE));
  end_date DATE := COALESCE(_end_date, CURRENT_DATE);
  output_liability NUMERIC := 0;
  input_credit NUMERIC := 0;
  total_cgst NUMERIC := 0;
  total_sgst NUMERIC := 0;
  total_igst NUMERIC := 0;
  total_turnover NUMERIC := 0;
  rate_breakdown JSONB;
  monthly_trend JSONB;
  vendor_gst JSONB;
  customer_gst JSONB;
BEGIN
  -- Calculate output tax liability (sales)
  SELECT 
    COALESCE(SUM(total_tax_amount), 0),
    COALESCE(SUM(cgst_amount), 0),
    COALESCE(SUM(sgst_amount), 0),
    COALESCE(SUM(igst_amount), 0),
    COALESCE(SUM(taxable_amount), 0)
  INTO output_liability, total_cgst, total_sgst, total_igst, total_turnover
  FROM dkegl_gst_transactions
  WHERE organization_id = _org_id
    AND transaction_type IN ('sale')
    AND invoice_date BETWEEN start_date AND end_date;
  
  -- Calculate input tax credit (purchases)
  SELECT COALESCE(SUM(total_tax_amount), 0)
  INTO input_credit
  FROM dkegl_gst_transactions
  WHERE organization_id = _org_id
    AND transaction_type IN ('purchase')
    AND invoice_date BETWEEN start_date AND end_date;
  
  -- GST rate wise breakdown
  SELECT jsonb_agg(
    jsonb_build_object(
      'gst_rate', gst_rate,
      'taxable_amount', SUM(taxable_amount),
      'tax_amount', SUM(total_tax_amount),
      'transaction_count', COUNT(*)
    )
  )
  INTO rate_breakdown
  FROM dkegl_gst_transactions
  WHERE organization_id = _org_id
    AND invoice_date BETWEEN start_date AND end_date
  GROUP BY gst_rate;
  
  -- Monthly trend (last 12 months)
  SELECT jsonb_agg(
    jsonb_build_object(
      'month', TO_CHAR(invoice_date, 'YYYY-MM'),
      'output_tax', COALESCE(SUM(CASE WHEN transaction_type = 'sale' THEN total_tax_amount END), 0),
      'input_tax', COALESCE(SUM(CASE WHEN transaction_type = 'purchase' THEN total_tax_amount END), 0),
      'net_payable', COALESCE(SUM(CASE WHEN transaction_type = 'sale' THEN total_tax_amount ELSE -total_tax_amount END), 0)
    ) ORDER BY invoice_date
  )
  INTO monthly_trend
  FROM dkegl_gst_transactions
  WHERE organization_id = _org_id
    AND invoice_date >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY DATE_TRUNC('month', invoice_date);
  
  -- Vendor wise GST (top 10)
  SELECT jsonb_agg(vendor_data)
  INTO vendor_gst
  FROM (
    SELECT jsonb_build_object(
      'party_name', party_name,
      'total_purchases', SUM(taxable_amount),
      'input_tax_credit', SUM(total_tax_amount)
    ) as vendor_data
    FROM dkegl_gst_transactions
    WHERE organization_id = _org_id
      AND transaction_type = 'purchase'
      AND invoice_date BETWEEN start_date AND end_date
    GROUP BY party_name
    ORDER BY SUM(total_tax_amount) DESC
    LIMIT 10
  ) t;
  
  -- Customer wise GST (top 10)
  SELECT jsonb_agg(customer_data)
  INTO customer_gst
  FROM (
    SELECT jsonb_build_object(
      'party_name', party_name,
      'total_sales', SUM(taxable_amount),
      'output_tax', SUM(total_tax_amount)
    ) as customer_data
    FROM dkegl_gst_transactions
    WHERE organization_id = _org_id
      AND transaction_type = 'sale'
      AND invoice_date BETWEEN start_date AND end_date
    GROUP BY party_name
    ORDER BY SUM(total_tax_amount) DESC
    LIMIT 10
  ) t;
  
  RETURN QUERY SELECT 
    output_liability,
    input_credit,
    output_liability - input_credit,
    total_cgst,
    total_sgst,
    total_igst,
    total_turnover,
    COALESCE(rate_breakdown, '[]'::jsonb),
    COALESCE(monthly_trend, '[]'::jsonb),
    COALESCE(vendor_gst, '[]'::jsonb),
    COALESCE(customer_gst, '[]'::jsonb);
END;
$$;

-- GST Returns Generation Function
CREATE OR REPLACE FUNCTION public.dkegl_generate_gstr_returns(
  _org_id UUID,
  _return_type TEXT,
  _month INTEGER,
  _year INTEGER
)
RETURNS TABLE(
  return_data JSONB,
  summary JSONB,
  validation_errors JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  start_date DATE;
  end_date DATE;
  return_json JSONB;
  summary_json JSONB;
  errors_json JSONB := '[]'::jsonb;
  total_transactions INTEGER := 0;
  total_taxable NUMERIC := 0;
  total_tax NUMERIC := 0;
BEGIN
  -- Calculate period dates
  start_date := MAKE_DATE(_year, _month, 1);
  end_date := (start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- Validate inputs
  IF _month < 1 OR _month > 12 THEN
    errors_json := errors_json || '["Invalid month specified"]'::jsonb;
  END IF;
  
  IF _year < 2017 OR _year > EXTRACT(YEAR FROM CURRENT_DATE) THEN
    errors_json := errors_json || '["Invalid year specified"]'::jsonb;
  END IF;
  
  -- Generate return data based on type
  IF _return_type = 'GSTR1' THEN
    -- GSTR1 - Outward supplies
    SELECT 
      jsonb_build_object(
        'b2b', jsonb_agg(
          jsonb_build_object(
            'ctin', party_gstin,
            'inv', jsonb_build_array(
              jsonb_build_object(
                'inum', invoice_number,
                'idt', invoice_date,
                'val', SUM(total_amount),
                'pos', place_of_supply,
                'rchrg', reverse_charge,
                'itms', jsonb_build_array(
                  jsonb_build_object(
                    'num', 1,
                    'itm_det', jsonb_build_object(
                      'txval', SUM(taxable_amount),
                      'rt', gst_rate,
                      'iamt', SUM(igst_amount),
                      'camt', SUM(cgst_amount),
                      'samt', SUM(sgst_amount),
                      'csamt', SUM(cess_amount)
                    )
                  )
                )
              )
            )
          )
        )
      ),
      COUNT(*),
      SUM(taxable_amount),
      SUM(total_tax_amount)
    INTO return_json, total_transactions, total_taxable, total_tax
    FROM dkegl_gst_transactions
    WHERE organization_id = _org_id
      AND transaction_type = 'sale'
      AND invoice_date BETWEEN start_date AND end_date
      AND party_gstin IS NOT NULL
    GROUP BY party_gstin, invoice_number, invoice_date, place_of_supply, reverse_charge, gst_rate;
    
  ELSIF _return_type = 'GSTR3B' THEN
    -- GSTR3B - Monthly return
    SELECT 
      jsonb_build_object(
        'sup_det', jsonb_build_object(
          'osup_zero', jsonb_build_object(
            'txval', COALESCE(SUM(CASE WHEN gst_rate = 0 THEN taxable_amount END), 0),
            'iamt', 0, 'camt', 0, 'samt', 0, 'csamt', 0
          ),
          'osup_nil_exmp', jsonb_build_object(
            'txval', 0
          ),
          'osup_nongst', jsonb_build_object(
            'txval', 0
          )
        ),
        'inter_sup', jsonb_build_object(
          'comp_sup', 0,
          'uin_sup', 0
        ),
        'itc_elg', jsonb_build_object(
          'itc_avl', jsonb_build_array(
            jsonb_build_object(
              'ty', 'IMPG',
              'iamt', COALESCE(SUM(CASE WHEN transaction_type = 'purchase' THEN igst_amount END), 0),
              'camt', COALESCE(SUM(CASE WHEN transaction_type = 'purchase' THEN cgst_amount END), 0),
              'samt', COALESCE(SUM(CASE WHEN transaction_type = 'purchase' THEN sgst_amount END), 0),
              'csamt', COALESCE(SUM(CASE WHEN transaction_type = 'purchase' THEN cess_amount END), 0)
            )
          )
        )
      ),
      COUNT(*),
      SUM(taxable_amount),
      SUM(total_tax_amount)
    INTO return_json, total_transactions, total_taxable, total_tax
    FROM dkegl_gst_transactions
    WHERE organization_id = _org_id
      AND invoice_date BETWEEN start_date AND end_date;
  END IF;
  
  -- Create summary
  summary_json := jsonb_build_object(
    'period', jsonb_build_object(
      'month', _month,
      'year', _year,
      'start_date', start_date,
      'end_date', end_date
    ),
    'totals', jsonb_build_object(
      'total_transactions', total_transactions,
      'total_taxable_amount', total_taxable,
      'total_tax_amount', total_tax,
      'net_payable', total_tax
    )
  );
  
  RETURN QUERY SELECT 
    COALESCE(return_json, '{}'::jsonb),
    summary_json,
    errors_json;
END;
$$;

-- GST Compliance Tracking Function
CREATE OR REPLACE FUNCTION public.dkegl_track_gst_compliance(
  _org_id UUID
)
RETURNS TABLE(
  compliance_score NUMERIC,
  pending_returns JSONB,
  upcoming_deadlines JSONB,
  penalty_calculations JSONB,
  recommendations JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_score NUMERIC := 0;
  pending_json JSONB;
  deadlines_json JSONB;
  penalties_json JSONB;
  recommendations_json JSONB;
  current_month INTEGER := EXTRACT(MONTH FROM CURRENT_DATE);
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  -- Calculate compliance score (based on filing history)
  SELECT AVG(
    CASE 
      WHEN filing_status = 'filed' AND filed_date <= due_date THEN 100
      WHEN filing_status = 'filed' AND filed_date > due_date THEN 75
      WHEN filing_status = 'late' THEN 50
      ELSE 0
    END
  )
  INTO total_score
  FROM dkegl_gst_compliance
  WHERE organization_id = _org_id
    AND compliance_year >= current_year - 1;
  
  -- Get pending returns
  SELECT jsonb_agg(
    jsonb_build_object(
      'return_type', return_type,
      'month', compliance_month,
      'year', compliance_year,
      'due_date', due_date,
      'days_overdue', CURRENT_DATE - due_date,
      'status', filing_status
    )
  )
  INTO pending_json
  FROM dkegl_gst_compliance
  WHERE organization_id = _org_id
    AND filing_status IN ('pending', 'late')
    AND due_date >= CURRENT_DATE - INTERVAL '6 months';
  
  -- Get upcoming deadlines (next 3 months)
  SELECT jsonb_agg(
    jsonb_build_object(
      'return_type', return_type,
      'month', compliance_month,
      'year', compliance_year,
      'due_date', due_date,
      'days_remaining', due_date - CURRENT_DATE
    )
  )
  INTO deadlines_json
  FROM dkegl_gst_compliance
  WHERE organization_id = _org_id
    AND filing_status = 'pending'
    AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 months';
  
  -- Calculate penalties for late filings
  SELECT jsonb_agg(
    jsonb_build_object(
      'return_type', return_type,
      'month', compliance_month,
      'year', compliance_year,
      'days_late', CURRENT_DATE - due_date,
      'estimated_penalty', 
        CASE 
          WHEN CURRENT_DATE - due_date > 15 THEN 10000
          WHEN CURRENT_DATE - due_date > 0 THEN 200 * (CURRENT_DATE - due_date)
          ELSE 0
        END
    )
  )
  INTO penalties_json
  FROM dkegl_gst_compliance
  WHERE organization_id = _org_id
    AND filing_status IN ('pending', 'late')
    AND due_date < CURRENT_DATE;
  
  -- Generate recommendations
  recommendations_json := jsonb_build_array(
    jsonb_build_object(
      'type', 'filing',
      'priority', 'high',
      'message', 'File pending GST returns to avoid penalties'
    ),
    jsonb_build_object(
      'type', 'automation',
      'priority', 'medium', 
      'message', 'Set up automated GST return filing reminders'
    ),
    jsonb_build_object(
      'type', 'reconciliation',
      'priority', 'medium',
      'message', 'Reconcile input tax credit with purchase records'
    )
  );
  
  RETURN QUERY SELECT 
    COALESCE(total_score, 0),
    COALESCE(pending_json, '[]'::jsonb),
    COALESCE(deadlines_json, '[]'::jsonb),
    COALESCE(penalties_json, '[]'::jsonb),
    recommendations_json;
END;
$$;