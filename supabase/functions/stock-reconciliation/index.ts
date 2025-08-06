import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface StockReconciliationRequest {
  trigger_type?: 'manual' | 'opening_stock_upload' | 'scheduled';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body for additional parameters
    let requestData: StockReconciliationRequest = {};
    if (req.method === 'POST') {
      try {
        requestData = await req.json();
      } catch (e) {
        console.log('No request body or invalid JSON, using defaults');
      }
    }

    // Get the organization ID for the current user
    const { data: orgData, error: orgError } = await supabase.rpc('dkegl_get_current_user_org')
    
    if (orgError || !orgData) {
      console.error('Error getting organization:', orgError)
      return new Response(
        JSON.stringify({ error: 'Failed to get organization' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Running CORRECTED stock reconciliation for organization: ${orgData}, trigger: ${requestData.trigger_type || 'manual'}`)

    // Call the CORRECTED stock reconciliation function that actually updates stock records
    const { data: reconciliationResult, error: reconciliationError } = await supabase.rpc(
      'dkegl_reconcile_stock_data',
      { _org_id: orgData }
    )

    if (reconciliationError) {
      console.error('Stock reconciliation error:', reconciliationError)
      return new Response(
        JSON.stringify({ 
          error: 'Stock reconciliation failed', 
          details: reconciliationError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Stock reconciliation completed successfully:', reconciliationResult)

    // Get a sample of updated stock to verify the correction
    const { data: stockSample, error: sampleError } = await supabase.rpc(
      'dkegl_get_comprehensive_stock_summary',
      { _org_id: orgData }
    )

    if (sampleError) {
      console.error('Error getting stock sample:', sampleError)
    }

    // Log the first few items to verify corrections
    const sampleItems = stockSample?.slice(0, 3) || [];
    console.log('Sample corrected stock items:', sampleItems);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Stock reconciliation completed successfully with actual database updates',
        reconciliation: reconciliationResult,
        trigger_type: requestData.trigger_type || 'manual',
        timestamp: new Date().toISOString(),
        verification_sample: sampleItems.map((item: any) => ({
          item_code: item.item_code,
          current_qty: item.current_qty,
          calculated_qty: item.calculated_qty,
          variance: item.variance_qty,
          opening_qty: item.opening_qty,
          total_grn: item.total_grn_qty,
          total_issued: item.total_issued_qty
        }))
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error during stock reconciliation:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Unexpected error occurred', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})