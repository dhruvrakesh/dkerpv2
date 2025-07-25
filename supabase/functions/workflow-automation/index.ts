import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, organizationId, data } = await req.json();

    console.log('Workflow automation request:', { action, organizationId });

    switch (action) {
      case 'auto_progress_workflow':
        return await autoProgressWorkflow(supabase, organizationId, data);
      
      case 'create_quality_checkpoints':
        return await createQualityCheckpoints(supabase, organizationId, data);
      
      case 'validate_stage_transition':
        return await validateStageTransition(supabase, organizationId, data);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Workflow automation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function autoProgressWorkflow(supabase: any, organizationId: string, data: any) {
  const { orderId } = data;

  // Get current workflow progress
  const { data: currentProgress, error: progressError } = await supabase
    .from('dkegl_workflow_progress')
    .select(`
      *,
      dkegl_workflow_stages (*)
    `)
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .eq('status', 'completed');

  if (progressError) throw progressError;

  // Get all workflow stages for this organization
  const { data: allStages, error: stagesError } = await supabase
    .from('dkegl_workflow_stages')
    .select('*')
    .eq('organization_id', organizationId)
    .order('stage_order', { ascending: true });

  if (stagesError) throw stagesError;

  // Find next stage to create
  const completedStageOrders = currentProgress.map(p => p.dkegl_workflow_stages.stage_order);
  const nextStage = allStages.find(stage => 
    !completedStageOrders.includes(stage.stage_order) &&
    stage.stage_order > Math.min(...completedStageOrders)
  );

  if (!nextStage) {
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Workflow completed - no more stages to progress to' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create next workflow progress entry
  const { data: newProgress, error: createError } = await supabase
    .from('dkegl_workflow_progress')
    .insert({
      organization_id: organizationId,
      order_id: orderId,
      stage_id: nextStage.id,
      status: 'pending',
      progress_percentage: 0,
      stage_data: {},
      quality_status: 'pending',
      notes: `Auto-generated from workflow automation`,
    })
    .select()
    .single();

  if (createError) throw createError;

  return new Response(
    JSON.stringify({ 
      success: true, 
      nextStage: nextStage.stage_name,
      progressId: newProgress.id
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function createQualityCheckpoints(supabase: any, organizationId: string, data: any) {
  const { stageId, orderId, checkType = 'pre_stage' } = data;

  // Get quality template for this stage
  const { data: template, error: templateError } = await supabase
    .from('dkegl_quality_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('stage_id', stageId)
    .single();

  if (templateError) {
    console.log('No quality template found, creating basic checkpoint');
  }

  // Create quality inspection
  const { data: inspection, error: inspectionError } = await supabase
    .from('dkegl_quality_inspections')
    .insert({
      organization_id: organizationId,
      order_id: orderId,
      stage_id: stageId,
      template_id: template?.id,
      inspection_date: new Date().toISOString().split('T')[0],
      overall_result: 'pending',
      inspection_results: {},
      defects_found: [],
      corrective_actions: [],
      remarks: `${checkType} quality checkpoint created automatically`,
    })
    .select()
    .single();

  if (inspectionError) throw inspectionError;

  return new Response(
    JSON.stringify({ 
      success: true, 
      checkpointId: inspection.id,
      checkType 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function validateStageTransition(supabase: any, organizationId: string, data: any) {
  const { fromStageId, toStageId, orderId } = data;

  // Check if previous stage quality inspections are passed
  const { data: inspections, error: inspectionError } = await supabase
    .from('dkegl_quality_inspections')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .eq('stage_id', fromStageId)
    .order('created_at', { ascending: false });

  if (inspectionError) throw inspectionError;

  const hasPassedInspection = inspections.some(i => i.overall_result === 'passed');
  const hasPendingInspection = inspections.some(i => i.overall_result === 'pending');

  return new Response(
    JSON.stringify({ 
      canTransition: hasPassedInspection && !hasPendingInspection,
      reason: !hasPassedInspection ? 'No passed quality inspection' :
              hasPendingInspection ? 'Pending quality inspection exists' :
              'Transition allowed'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}