-- Create DKEGL AI Chat Sessions table
CREATE TABLE public.dkegl_ai_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.dkegl_organizations(id),
  user_id UUID NOT NULL,
  context_type TEXT NOT NULL DEFAULT 'general',
  context_data JSONB DEFAULT '{}',
  title TEXT,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create DKEGL AI Chat Messages table
CREATE TABLE public.dkegl_ai_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.dkegl_ai_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  token_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create DKEGL AI Usage Logs table
CREATE TABLE public.dkegl_ai_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.dkegl_organizations(id),
  user_id UUID NOT NULL,
  session_id UUID REFERENCES public.dkegl_ai_chat_sessions(id),
  model_used TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.dkegl_ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkegl_ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dkegl_ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dkegl_ai_chat_sessions
CREATE POLICY "Users can manage their own chat sessions"
ON public.dkegl_ai_chat_sessions
FOR ALL
USING (
  user_id = auth.uid() AND 
  organization_id = dkegl_get_current_user_org()
)
WITH CHECK (
  user_id = auth.uid() AND 
  organization_id = dkegl_get_current_user_org()
);

-- RLS Policies for dkegl_ai_chat_messages
CREATE POLICY "Users can manage messages in their sessions"
ON public.dkegl_ai_chat_messages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.dkegl_ai_chat_sessions 
    WHERE id = session_id 
    AND user_id = auth.uid()
    AND organization_id = dkegl_get_current_user_org()
  )
);

-- RLS Policies for dkegl_ai_usage_logs
CREATE POLICY "Users can view their own usage logs"
ON public.dkegl_ai_usage_logs
FOR SELECT
USING (
  user_id = auth.uid() AND 
  organization_id = dkegl_get_current_user_org()
);

CREATE POLICY "System can insert usage logs"
ON public.dkegl_ai_usage_logs
FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_dkegl_ai_chat_sessions_user_org ON public.dkegl_ai_chat_sessions(user_id, organization_id);
CREATE INDEX idx_dkegl_ai_chat_sessions_activity ON public.dkegl_ai_chat_sessions(last_activity_at DESC);
CREATE INDEX idx_dkegl_ai_chat_messages_session ON public.dkegl_ai_chat_messages(session_id, created_at DESC);
CREATE INDEX idx_dkegl_ai_usage_logs_user_date ON public.dkegl_ai_usage_logs(user_id, created_at DESC);

-- Create trigger to update session activity
CREATE OR REPLACE FUNCTION public.dkegl_update_chat_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.dkegl_ai_chat_sessions 
  SET last_activity_at = now(), updated_at = now()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dkegl_update_session_activity_trigger
  AFTER INSERT ON public.dkegl_ai_chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.dkegl_update_chat_session_activity();