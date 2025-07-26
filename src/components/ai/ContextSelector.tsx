import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Package2, 
  Factory, 
  BarChart3, 
  Shield, 
  MessageSquare, 
  Bot 
} from 'lucide-react';

export interface AIContext {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: {
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
    color: string;
  };
  capabilities: string[];
}

export const AI_CONTEXTS: AIContext[] = [
  {
    id: 'general',
    label: 'General Assistant',
    description: 'General ERP questions and guidance',
    icon: Bot,
    badge: { variant: 'default', color: 'hsl(var(--primary))' },
    capabilities: ['General questions', 'System navigation', 'Basic help']
  },
  {
    id: 'inventory',
    label: 'Inventory Expert',
    description: 'Stock management, item masters, pricing analysis',
    icon: Package2,
    badge: { variant: 'secondary', color: 'hsl(var(--chart-1))' },
    capabilities: ['Stock analysis', 'Reorder alerts', 'ABC analysis', 'Inventory optimization']
  },
  {
    id: 'manufacturing',
    label: 'Production Specialist',
    description: 'Production planning, workflow optimization, bottleneck analysis',
    icon: Factory,
    badge: { variant: 'outline', color: 'hsl(var(--chart-2))' },
    capabilities: ['Production status', 'Workflow analysis', 'Capacity planning', 'Efficiency metrics']
  },
  {
    id: 'quality',
    label: 'Quality Controller',
    description: 'Quality metrics, inspection data, defect analysis',
    icon: Shield,
    badge: { variant: 'destructive', color: 'hsl(var(--chart-3))' },
    capabilities: ['Quality metrics', 'Defect analysis', 'Inspection reports', 'Compliance tracking']
  },
  {
    id: 'analytics',
    label: 'Analytics Advisor',
    description: 'KPI interpretation, trend analysis, business intelligence',
    icon: BarChart3,
    badge: { variant: 'outline', color: 'hsl(var(--chart-4))' },
    capabilities: ['KPI analysis', 'Trend forecasting', 'Cost analysis', 'Performance insights']
  }
];

interface ContextSelectorProps {
  selectedContext: string;
  onContextChange: (context: string) => void;
  className?: string;
}

export function ContextSelector({ selectedContext, onContextChange, className }: ContextSelectorProps) {
  const currentContext = AI_CONTEXTS.find(ctx => ctx.id === selectedContext) || AI_CONTEXTS[0];
  
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">AI Assistant Mode</span>
      </div>
      
      <Select value={selectedContext} onValueChange={onContextChange}>
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            {React.createElement(currentContext.icon, { className: "h-4 w-4 text-primary" })}
            <SelectValue />
            <Badge variant={currentContext.badge.variant} className="ml-auto">
              {currentContext.label}
            </Badge>
          </div>
        </SelectTrigger>
        
        <SelectContent>
          {AI_CONTEXTS.map((context) => (
            <SelectItem key={context.id} value={context.id}>
              <div className="flex items-start gap-3 py-2">
                {React.createElement(context.icon, { className: "h-4 w-4 mt-0.5 text-primary" })}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{context.label}</span>
                    <Badge variant={context.badge.variant} className="text-xs">
                      {context.id}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {context.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {context.capabilities.slice(0, 2).map((capability) => (
                      <span 
                        key={capability}
                        className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground"
                      >
                        {capability}
                      </span>
                    ))}
                    {context.capabilities.length > 2 && (
                      <span className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                        +{context.capabilities.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <div className="text-xs text-muted-foreground">
        <strong>Capabilities:</strong> {currentContext.capabilities.join(', ')}
      </div>
    </div>
  );
}