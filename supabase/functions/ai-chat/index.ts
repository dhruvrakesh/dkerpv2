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

    // Build conversation context
    const systemPrompt = buildSystemPrompt(contextType, contextData);
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

    // Call OpenAI API
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
      const assistantMessage = data.choices[0].message.content;

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

function buildSystemPrompt(contextType: string, contextData: any): string {
  const basePrompt = `You are an AI assistant integrated into the DKEGL Enterprise ERP system. You help users with manufacturing, inventory, analytics, and general business operations.

Current context: ${contextType}
Context data: ${JSON.stringify(contextData)}

Guidelines:
- Be helpful, accurate, and concise
- Focus on ERP-related tasks and manufacturing processes
- When discussing data, refer to the current context when available
- Ask clarifying questions when needed
- Provide actionable insights and recommendations`;

  switch (contextType) {
    case 'inventory':
      return `${basePrompt}

You are currently in the Inventory context. Help with stock management, item masters, pricing, GRN logs, and inventory analysis.`;

    case 'manufacturing':
      return `${basePrompt}

You are currently in the Manufacturing context. Help with production planning, workflow management, order tracking, and manufacturing processes.`;

    case 'analytics':
      return `${basePrompt}

You are currently in the Analytics context. Help with data analysis, KPI interpretation, trend analysis, and business intelligence.`;

    default:
      return basePrompt;
  }
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