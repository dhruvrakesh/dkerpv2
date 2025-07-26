import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  sessionId?: string;
  message: string;
  contextType?: string;
  contextData?: any;
  model?: string;
  streaming?: boolean;
}

interface ERPFunctionCall {
  name: string;
  arguments: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { sessionId, message, contextType = 'general', contextData = {}, model = 'gpt-4o-mini', streaming = false }: ChatRequest = await req.json();

    console.log('AI Chat request:', { sessionId, contextType, model, streaming });

    // Get user's organization for ERP queries
    const { data: userOrg, error: orgError } = await supabase
      .rpc('dkegl_get_current_user_org');
    
    if (orgError) {
      console.error('Failed to get user organization:', orgError);
    }

    // Get or create session
    let session;
    if (sessionId) {
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        throw new Error('Session not found');
      }
      session = data;
    } else {
      // Create new session
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .insert({
          user_id: user.id,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          context_type: contextType,
          context_data: contextData,
          model_settings: { model }
        })
        .select()
        .single();
      
      if (error) {
        throw new Error('Failed to create session');
      }
      session = data;
    }

    // Get conversation history
    const { data: messages, error: messagesError } = await supabase
      .from('ai_chat_messages')
      .select('role, content')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      throw new Error('Failed to load conversation history');
    }

    // Build conversation context with enhanced ERP data
    const systemPrompt = await buildSystemPrompt(contextType, contextData, userOrg, supabase);
    const conversationMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
      { role: 'user', content: message }
    ];

    // Save user message
    await supabase
      .from('ai_chat_messages')
      .insert({
        session_id: session.id,
        role: 'user',
        content: message,
        token_count: Math.ceil(message.length / 4) // Rough estimate
      });

    // Call OpenAI API with function calling
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: conversationMessages,
        stream: streaming,
        temperature: 0.7,
        max_tokens: 2000,
        functions: getERPFunctions(),
        function_call: 'auto',
      }),
    });

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.statusText}`);
    }

    if (streaming) {
      // Handle streaming response
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      let assistantMessage = '';
      
      const stream = new ReadableStream({
        async start(controller) {
          const reader = openAIResponse.body?.getReader();
          if (!reader) return;

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.substring(6);
                  if (data === '[DONE]') {
                    // Save assistant message
                    await supabase
                      .from('ai_chat_messages')
                      .insert({
                        session_id: session.id,
                        role: 'assistant',
                        content: assistantMessage,
                        token_count: Math.ceil(assistantMessage.length / 4)
                      });

                    // Log usage
                    await logUsage(user.id, session.id, model, 'chat_completion', 
                      Math.ceil(conversationMessages.join(' ').length / 4),
                      Math.ceil(assistantMessage.length / 4));

                    controller.close();
                    return;
                  }

                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                      assistantMessage += content;
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content, sessionId: session.id })}\n\n`));
                    }
                  } catch (e) {
                    // Skip invalid JSON
                  }
                }
              }
            }
          } catch (error) {
            console.error('Streaming error:', error);
            controller.error(error);
          }
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Handle non-streaming response
      const data = await openAIResponse.json();
      const choice = data.choices[0];
      let assistantMessage = choice.message.content || '';

      // Handle function calls
      if (choice.message.function_call) {
        const functionResult = await handleFunctionCall(
          choice.message.function_call,
          userOrg,
          supabase
        );
        
        // Make another call to OpenAI with the function result
        const functionMessages = [
          ...conversationMessages,
          { role: 'assistant', content: null, function_call: choice.message.function_call },
          { role: 'function', name: choice.message.function_call.name, content: JSON.stringify(functionResult) }
        ];

        const finalResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: functionMessages,
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        const finalData = await finalResponse.json();
        assistantMessage = finalData.choices[0].message.content;
      }

      // Save assistant message
      await supabase
        .from('ai_chat_messages')
        .insert({
          session_id: session.id,
          role: 'assistant',
          content: assistantMessage,
          token_count: data.usage?.completion_tokens || Math.ceil(assistantMessage.length / 4)
        });

      // Log usage
      await logUsage(user.id, session.id, model, 'chat_completion',
        data.usage?.prompt_tokens || 0,
        data.usage?.completion_tokens || 0);

      return new Response(JSON.stringify({
        message: assistantMessage,
        sessionId: session.id,
        usage: data.usage
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('AI Chat error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'An error occurred while processing your request'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function buildSystemPrompt(contextType: string, contextData: any, userOrg: string | null, supabase: any): Promise<string> {
  const basePrompt = `You are an AI assistant integrated into the DKEGL Enterprise ERP system. You help users with manufacturing, inventory, analytics, and general business operations.

You have access to real-time ERP data through function calls. Use these functions to provide accurate, data-driven responses:
- get_inventory_status: Get current stock levels and inventory data
- get_production_summary: Get production status and manufacturing data  
- get_quality_issues: Get quality control issues and metrics
- analyze_cost_trends: Analyze cost trends and financial data

Current context: ${contextType}
Context data: ${JSON.stringify(contextData)}

Guidelines:
- Use function calls to get real-time data when users ask about specific metrics
- Be helpful, accurate, and concise
- Focus on ERP-related tasks and manufacturing processes
- Provide actionable insights and recommendations based on actual data
- When discussing trends, always use recent data from function calls`;

  // Inject recent context data based on type
  let contextualData = '';
  if (userOrg && contextType !== 'general') {
    try {
      switch (contextType) {
        case 'inventory':
          const { data: stockSummary } = await supabase
            .from('dkegl_stock_summary')
            .select('item_code, current_qty, reorder_suggested')
            .eq('organization_id', userOrg)
            .limit(5);
          
          if (stockSummary?.length) {
            contextualData = `\n\nRecent inventory status: ${JSON.stringify(stockSummary)}`;
          }
          break;

        case 'manufacturing':
          const { data: orders } = await supabase
            .from('dkegl_orders')
            .select('order_number, status, item_name')
            .eq('organization_id', userOrg)
            .order('created_at', { ascending: false })
            .limit(5);
          
          if (orders?.length) {
            contextualData = `\n\nRecent orders: ${JSON.stringify(orders)}`;
          }
          break;
      }
    } catch (error) {
      console.error('Failed to get contextual data:', error);
    }
  }

  switch (contextType) {
    case 'inventory':
      return `${basePrompt}

You are currently in the Inventory context. Help with stock management, item masters, pricing, GRN logs, and inventory analysis.${contextualData}`;

    case 'manufacturing':
      return `${basePrompt}

You are currently in the Manufacturing context. Help with production planning, workflow management, order tracking, and manufacturing processes.${contextualData}`;

    case 'analytics':
      return `${basePrompt}

You are currently in the Analytics context. Help with data analysis, KPI interpretation, trend analysis, and business intelligence.${contextualData}`;

    default:
      return basePrompt;
  }
}

function getERPFunctions() {
  return [
    {
      name: 'get_inventory_status',
      description: 'Get current inventory status, stock levels, and reorder recommendations',
      parameters: {
        type: 'object',
        properties: {
          item_code: {
            type: 'string',
            description: 'Specific item code to check (optional)'
          },
          low_stock_only: {
            type: 'boolean',
            description: 'Only return items with low stock levels'
          },
          category: {
            type: 'string',
            description: 'Filter by item category (optional)'
          }
        }
      }
    },
    {
      name: 'get_production_summary',
      description: 'Get production status, workflow progress, and manufacturing metrics',
      parameters: {
        type: 'object',
        properties: {
          date_range: {
            type: 'string',
            description: 'Date range for analysis (e.g., "last_7_days", "current_month")'
          },
          stage: {
            type: 'string',
            description: 'Specific production stage to analyze (optional)'
          },
          status: {
            type: 'string',
            description: 'Filter by order status (optional)'
          }
        }
      }
    },
    {
      name: 'get_quality_issues',
      description: 'Get quality control issues, inspection results, and quality metrics',
      parameters: {
        type: 'object',
        properties: {
          severity: {
            type: 'string',
            description: 'Filter by severity level (critical, high, medium, low)'
          },
          recent_only: {
            type: 'boolean',
            description: 'Only return recent issues (last 30 days)'
          },
          stage_type: {
            type: 'string',
            description: 'Filter by production stage (optional)'
          }
        }
      }
    },
    {
      name: 'analyze_cost_trends',
      description: 'Analyze cost trends, pricing variances, and financial metrics',
      parameters: {
        type: 'object',
        properties: {
          item_codes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific items to analyze (optional)'
          },
          time_period: {
            type: 'string',
            description: 'Time period for analysis (e.g., "last_3_months", "current_year")'
          },
          analysis_type: {
            type: 'string',
            description: 'Type of cost analysis (pricing_variance, trend_analysis, cost_breakdown)'
          }
        }
      }
    }
  ];
}

async function handleFunctionCall(functionCall: any, userOrg: string | null, supabase: any) {
  if (!userOrg) {
    return { error: 'No organization context available' };
  }

  const { name, arguments: args } = functionCall;
  const parsedArgs = JSON.parse(args);

  console.log(`Executing function: ${name} with args:`, parsedArgs);

  try {
    switch (name) {
      case 'get_inventory_status':
        return await getInventoryStatus(parsedArgs, userOrg, supabase);
      
      case 'get_production_summary':
        return await getProductionSummary(parsedArgs, userOrg, supabase);
      
      case 'get_quality_issues':
        return await getQualityIssues(parsedArgs, userOrg, supabase);
      
      case 'analyze_cost_trends':
        return await analyzeCostTrends(parsedArgs, userOrg, supabase);
      
      default:
        return { error: `Unknown function: ${name}` };
    }
  } catch (error) {
    console.error(`Error in function ${name}:`, error);
    return { error: `Failed to execute ${name}: ${error.message}` };
  }
}

async function getInventoryStatus(args: any, userOrg: string, supabase: any) {
  let query = supabase
    .from('dkegl_stock_summary')
    .select('item_code, item_name, category_name, current_qty, reorder_level, reorder_suggested, days_of_cover, last_transaction_date')
    .eq('organization_id', userOrg);

  if (args.item_code) {
    query = query.eq('item_code', args.item_code);
  }

  if (args.low_stock_only) {
    query = query.eq('reorder_suggested', true);
  }

  if (args.category) {
    query = query.ilike('category_name', `%${args.category}%`);
  }

  query = query.order('current_qty', { ascending: true }).limit(20);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Inventory query failed: ${error.message}`);
  }

  return {
    inventory_data: data,
    summary: {
      total_items: data?.length || 0,
      low_stock_items: data?.filter(item => item.reorder_suggested).length || 0,
      zero_stock_items: data?.filter(item => item.current_qty <= 0).length || 0
    }
  };
}

async function getProductionSummary(args: any, userOrg: string, supabase: any) {
  let dateFilter = '';
  
  switch (args.date_range) {
    case 'last_7_days':
      dateFilter = `created_at >= NOW() - INTERVAL '7 days'`;
      break;
    case 'current_month':
      dateFilter = `created_at >= DATE_TRUNC('month', NOW())`;
      break;
    default:
      dateFilter = `created_at >= NOW() - INTERVAL '30 days'`;
  }

  let query = supabase
    .from('dkegl_orders')
    .select('order_number, uiorn, item_name, status, order_quantity, delivery_date, created_at')
    .eq('organization_id', userOrg);

  if (args.status) {
    query = query.eq('status', args.status);
  }

  query = query.order('created_at', { ascending: false }).limit(20);

  const { data: orders, error } = await query;

  if (error) {
    throw new Error(`Production query failed: ${error.message}`);
  }

  // Get workflow progress data
  const { data: workflow, error: workflowError } = await supabase
    .from('dkegl_workflow_progress')
    .select('order_id, stage_id, status, started_at, completed_at, efficiency_percentage')
    .eq('organization_id', userOrg)
    .order('started_at', { ascending: false })
    .limit(10);

  return {
    orders: orders,
    workflow_progress: workflow || [],
    summary: {
      total_orders: orders?.length || 0,
      completed_orders: orders?.filter(o => o.status === 'completed').length || 0,
      pending_orders: orders?.filter(o => o.status === 'pending' || o.status === 'in_progress').length || 0
    }
  };
}

async function getQualityIssues(args: any, userOrg: string, supabase: any) {
  // Since we don't have a quality issues table yet, we'll use pricing variance alerts as a proxy
  let query = supabase
    .from('dkegl_pricing_variance_alerts')
    .select('item_code, alert_type, alert_severity, variance_percentage, status, created_at, grn_reference')
    .eq('organization_id', userOrg);

  if (args.severity) {
    query = query.eq('alert_severity', args.severity);
  }

  if (args.recent_only) {
    query = query.gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  }

  query = query.order('created_at', { ascending: false }).limit(20);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Quality issues query failed: ${error.message}`);
  }

  return {
    quality_alerts: data,
    summary: {
      total_alerts: data?.length || 0,
      critical_alerts: data?.filter(a => a.alert_severity === 'critical').length || 0,
      open_alerts: data?.filter(a => a.status === 'open').length || 0
    }
  };
}

async function analyzeCostTrends(args: any, userOrg: string, supabase: any) {
  let query = supabase
    .from('dkegl_grn_log')
    .select('item_code, date, qty_received, unit_rate, total_amount, supplier_name')
    .eq('organization_id', userOrg);

  if (args.item_codes && args.item_codes.length > 0) {
    query = query.in('item_code', args.item_codes);
  }

  // Apply time period filter
  switch (args.time_period) {
    case 'last_3_months':
      query = query.gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
      break;
    case 'current_year':
      query = query.gte('date', new Date(new Date().getFullYear(), 0, 1).toISOString());
      break;
    default:
      query = query.gte('date', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());
  }

  query = query.order('date', { ascending: false }).limit(100);

  const { data: grnData, error } = await query;

  if (error) {
    throw new Error(`Cost analysis query failed: ${error.message}`);
  }

  // Basic cost trend analysis
  const itemTrends = {};
  grnData?.forEach(grn => {
    if (!itemTrends[grn.item_code]) {
      itemTrends[grn.item_code] = {
        prices: [],
        quantities: [],
        suppliers: new Set()
      };
    }
    itemTrends[grn.item_code].prices.push({
      date: grn.date,
      rate: grn.unit_rate,
      quantity: grn.qty_received
    });
    itemTrends[grn.item_code].suppliers.add(grn.supplier_name);
  });

  // Calculate trends
  const trends = Object.keys(itemTrends).map(itemCode => {
    const item = itemTrends[itemCode];
    const sortedPrices = item.prices.sort((a, b) => new Date(a.date) - new Date(b.date));
    const avgPrice = item.prices.reduce((sum, p) => sum + p.rate, 0) / item.prices.length;
    const latestPrice = sortedPrices[sortedPrices.length - 1]?.rate || 0;
    const earliestPrice = sortedPrices[0]?.rate || 0;
    const trend = earliestPrice > 0 ? ((latestPrice - earliestPrice) / earliestPrice * 100) : 0;

    return {
      item_code: itemCode,
      average_price: avgPrice,
      latest_price: latestPrice,
      price_trend_percentage: trend,
      supplier_count: item.suppliers.size,
      transaction_count: item.prices.length
    };
  });

  return {
    cost_trends: trends,
    raw_data: grnData,
    summary: {
      items_analyzed: trends.length,
      total_transactions: grnData?.length || 0,
      avg_price_change: trends.reduce((sum, t) => sum + t.price_trend_percentage, 0) / trends.length || 0
    }
  };
}

async function logUsage(userId: string, sessionId: string, model: string, operationType: string, promptTokens: number, completionTokens: number) {
  try {
    // Calculate cost (rough estimates for GPT-4o-mini)
    const promptCost = promptTokens * 0.00015 / 1000; // $0.15 per 1K tokens
    const completionCost = completionTokens * 0.0006 / 1000; // $0.60 per 1K tokens
    const totalCost = promptCost + completionCost;

    await supabase
      .from('ai_usage_logs')
      .insert({
        user_id: userId,
        session_id: sessionId,
        model_used: model,
        operation_type: operationType,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        cost_usd: totalCost,
        metadata: { prompt_cost: promptCost, completion_cost: completionCost }
      });
  } catch (error) {
    console.error('Failed to log usage:', error);
  }
}