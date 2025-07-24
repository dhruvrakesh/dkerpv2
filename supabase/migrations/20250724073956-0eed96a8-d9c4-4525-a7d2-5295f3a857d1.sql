-- Fix column name issue in dkegl_get_stock_movements function
CREATE OR REPLACE FUNCTION public.dkegl_get_stock_movements(_org_id uuid, _item_code text DEFAULT NULL::text, _days integer DEFAULT 30)
 RETURNS TABLE(transaction_date date, transaction_type text, item_code text, item_name text, quantity numeric, running_balance numeric, source_reference text, unit_cost numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
      CASE WHEN g.total_amount > 0 AND g.qty_received > 0 
           THEN g.total_amount / g.qty_received 
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
$function$;