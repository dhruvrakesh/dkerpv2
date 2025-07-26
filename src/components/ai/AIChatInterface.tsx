import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, MessageSquare, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ContextSelector, AI_CONTEXTS } from './ContextSelector';
import { FunctionCallIndicator } from './FunctionCallIndicator';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  functionCalls?: Array<{
    name: string;
    status: 'pending' | 'success' | 'error';
    description?: string;
    result?: any;
    error?: string;
  }>;
}

interface AIChatInterfaceProps {
  contextType?: string;
  contextData?: any;
  className?: string;
}

export function AIChatInterface({ contextType = 'general', contextData = {}, className }: AIChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedContext, setSelectedContext] = useState(contextType);
  const [showContextSelector, setShowContextSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message immediately
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Authentication required');
      }

      const response = await supabase.functions.invoke('ai-chat', {
        body: {
          sessionId,
          message: userMessage,
          contextType: selectedContext,
          contextData,
          model: 'gpt-4o-mini',
          streaming: false
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to get AI response');
      }

      const { message: assistantMessage, sessionId: newSessionId } = response.data;

      // Update session ID if this was the first message
      if (!sessionId && newSessionId) {
        setSessionId(newSessionId);
      }

      // Add assistant message
      const assistantResponse: Message = {
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantResponse]);

    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });

      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const getCurrentContext = () => {
    return AI_CONTEXTS.find(ctx => ctx.id === selectedContext) || AI_CONTEXTS[0];
  };

  const handleContextChange = (newContext: string) => {
    setSelectedContext(newContext);
    // Reset session to start fresh with new context
    setSessionId(null);
    setMessages([]);
    
    const context = AI_CONTEXTS.find(ctx => ctx.id === newContext);
    toast({
      title: "Context Switched",
      description: `Now using ${context?.label} mode`,
    });
  };

  return (
    <Card className={`flex flex-col h-[600px] ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Assistant
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={getCurrentContext().badge.variant}>
              {getCurrentContext().label}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowContextSelector(!showContextSelector)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Collapsible open={showContextSelector} onOpenChange={setShowContextSelector}>
          <CollapsibleContent>
            <ContextSelector
              selectedContext={selectedContext}
              onContextChange={handleContextChange}
              className="mt-3"
            />
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                {React.createElement(getCurrentContext().icon, { 
                  className: "h-8 w-8 mb-2 text-primary"
                })}
                <p className="font-medium">{getCurrentContext().label}</p>
                <p className="text-sm text-center">{getCurrentContext().description}</p>
                <div className="flex flex-wrap gap-1 mt-2 justify-center">
                  {getCurrentContext().capabilities.slice(0, 3).map((capability) => (
                    <span 
                      key={capability}
                      className="text-xs px-2 py-1 bg-muted rounded"
                    >
                      {capability}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div key={index} className="space-y-2">
                <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        {React.createElement(getCurrentContext().icon, { 
                          className: "h-4 w-4 text-primary"
                        })}
                      </div>
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>

                  {message.role === 'user' && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Function Call Indicators */}
                {message.functionCalls && message.functionCalls.length > 0 && (
                  <FunctionCallIndicator functionCalls={message.functionCalls} />
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask ${getCurrentContext().label.toLowerCase()} about ${getCurrentContext().description.toLowerCase()}...`}
            className="min-h-[60px] resize-none"
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            size="sm" 
            disabled={!input.trim() || isLoading}
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}