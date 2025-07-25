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

  console.log('Auto-progress workflow request:', { organizationId, orderId });

  if (!organizationId || !orderId) {
    throw new Error('Organization ID and Order ID are required');
  }

  // Get current workflow progress (in_progress and completed stages)
  const { data: currentProgress, error: progressError } = await supabase
    .from('dkegl_workflow_progress')
    .select(`
      *,
      dkegl_workflow_stages!inner(
        id,
        stage_name,
        sequence_order,
        is_active
      )
    `)
    .eq('organization_id', organizationId)
    .eq('order_id', orderId)
    .in('status', ['completed', 'in_progress'])
    .eq('dkegl_workflow_stages.is_active', true);

  if (progressError) {
    console.error('Error fetching current progress:', progressError);
    throw progressError;
  }

  console.log('Current progress stages:', currentProgress?.length || 0);

  // Get all available workflow stages for this organization
  const { data: allStages, error: stagesError } = await supabase
    .from('dkegl_workflow_stages')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('sequence_order', { ascending: true });

  if (stagesError) {
    console.error('Error fetching workflow stages:', stagesError);
    throw stagesError;
  }

  console.log('Available workflow stages:', allStages?.length || 0);

  if (!allStages || allStages.length === 0) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'No active workflow stages found for this organization',
        error: 'NO_STAGES_CONFIGURED'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Find completed and in-progress stage orders
  const processedStageOrders = (currentProgress || [])
    .map(p => p.dkegl_workflow_stages?.sequence_order)
    .filter(order => order !== null && order !== undefined);

  console.log('Processed stage orders:', processedStageOrders);

  // Find the next stage that hasn't been started yet
  const nextStage = allStages.find(stage => 
    !processedStageOrders.includes(stage.sequence_order)
  );

  if (!nextStage) {
    // Check if there are any incomplete stages
    const incompleteStages = (currentProgress || []).filter(p => p.status !== 'completed');
    
    if (incompleteStages.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Please complete current stage before progressing',
          currentStage: incompleteStages[0].dkegl_workflow_stages?.stage_name,
          error: 'INCOMPLETE_CURRENT_STAGE'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'All workflow stages completed',
        error: 'WORKFLOW_COMPLETE'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('Creating next stage:', nextStage.stage_name);

  // Create next workflow progress entry with retry logic
  let retryCount = 0;
  const maxRetries = 3;
  let newProgress = null;

  while (retryCount < maxRetries) {
    try {
      const { data, error: createError } = await supabase
        .from('dkegl_workflow_progress')
        .insert({
          organization_id: organizationId,
          order_id: orderId,
          stage_id: nextStage.id,
          status: 'pending',
          progress_percentage: 0,
          stage_data: {},
          quality_status: 'pending',
          notes: `Auto-generated from workflow automation at ${new Date().toISOString()}`,
        })
        .select()
        .single();

      if (createError) {
        console.error(`Create attempt ${retryCount + 1} failed:`, createError);
        if (retryCount === maxRetries - 1) throw createError;
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        continue;
      }

      newProgress = data;
      break;
    } catch (error) {
      console.error(`Retry ${retryCount + 1} failed:`, error);
      retryCount++;
      if (retryCount >= maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
    }
  }

  console.log('Successfully created workflow progress:', newProgress?.id);

  // Log the auto-progression action for audit trail
  await supabase
    .from('dkegl_audit_log')
    .insert({
      organization_id: organizationId,
      table_name: 'dkegl_workflow_progress',
      record_id: newProgress.id,
      action: 'auto_progress',
      old_values: null,
      new_values: newProgress,
      user_id: null, // System action
      metadata: {
        order_id: orderId,
        auto_progressed_to: nextStage.stage_name,
        sequence_order: nextStage.sequence_order
      }
    })
    .then(({ error }) => {
      if (error) console.error('Audit log error:', error);
    });

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Progressed to ${nextStage.stage_name}`,
      nextStage: nextStage.stage_name,
      progressId: newProgress.id,
      sequenceOrder: nextStage.sequence_order
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