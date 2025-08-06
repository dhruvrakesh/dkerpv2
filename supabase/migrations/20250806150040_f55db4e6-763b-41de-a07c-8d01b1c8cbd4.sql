-- Check the existing function signature
SELECT 
  p.proname as function_name,
  p.prosrc as function_body
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'dkegl_get_comprehensive_stock_summary'
LIMIT 1;