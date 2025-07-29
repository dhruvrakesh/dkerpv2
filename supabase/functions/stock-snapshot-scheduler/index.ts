// Edge Function to schedule daily stock snapshots at 4 PM IST
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Functions: {
      dkegl_capture_daily_stock_snapshot: {
        Args: { _org_id?: string }
        Returns: any
      }
    }
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting daily stock snapshot capture...');

    // Get all active organizations
    const { data: organizations, error: orgError } = await supabase
      .from('dkegl_organizations')
      .select('id, code, name')
      .eq('is_active', true);

    if (orgError) {
      console.error('Error fetching organizations:', orgError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch organizations' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const results = [];

    // Capture snapshot for each organization
    for (const org of organizations || []) {
      try {
        console.log(`Capturing snapshot for organization: ${org.code} (${org.name})`);
        
        const { data: result, error: snapError } = await supabase
          .rpc('dkegl_capture_daily_stock_snapshot', {
            _org_id: org.id
          });

        if (snapError) {
          console.error(`Error capturing snapshot for ${org.code}:`, snapError);
          results.push({
            organization: org.code,
            success: false,
            error: snapError.message
          });
        } else {
          console.log(`Snapshot captured successfully for ${org.code}:`, result);
          results.push({
            organization: org.code,
            success: true,
            result: result
          });
        }
      } catch (error) {
        console.error(`Exception capturing snapshot for ${org.code}:`, error);
        results.push({
          organization: org.code,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    console.log(`Snapshot capture completed: ${successCount}/${totalCount} successful`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Daily stock snapshots captured for ${successCount}/${totalCount} organizations`,
        timestamp: new Date().toISOString(),
        results: results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in stock snapshot scheduler:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});