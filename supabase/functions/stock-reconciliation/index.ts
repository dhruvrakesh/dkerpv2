import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

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

    console.log('Running stock reconciliation for organization:', orgData)

    // Call the stock reconciliation function
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

    console.log('Stock reconciliation completed:', reconciliationResult)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Stock reconciliation completed successfully',
        result: reconciliationResult
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