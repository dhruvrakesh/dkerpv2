import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Database, 
  Factory, 
  Package2, 
  BarChart3, 
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface FunctionCall {
  name: string;
  status: 'pending' | 'success' | 'error';
  description?: string;
  result?: any;
  error?: string;
}

interface FunctionCallIndicatorProps {
  functionCalls: FunctionCall[];
  className?: string;
}

const FUNCTION_ICONS = {
  get_inventory_status: Package2,
  get_production_summary: Factory,
  get_quality_issues: Shield,
  analyze_cost_trends: BarChart3,
  default: Database
};

const FUNCTION_LABELS = {
  get_inventory_status: 'Inventory Check',
  get_production_summary: 'Production Status',
  get_quality_issues: 'Quality Analysis',
  analyze_cost_trends: 'Cost Analysis'
};

export function FunctionCallIndicator({ functionCalls, className }: FunctionCallIndicatorProps) {
  if (functionCalls.length === 0) return null;

  return (
    <Card className={`mb-4 ${className}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">AI Function Calls</span>
        </div>
        
        <div className="space-y-2">
          {functionCalls.map((call, index) => {
            const Icon = FUNCTION_ICONS[call.name as keyof typeof FUNCTION_ICONS] || FUNCTION_ICONS.default;
            const label = FUNCTION_LABELS[call.name as keyof typeof FUNCTION_LABELS] || call.name;
            
            return (
              <div key={index} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                <Icon className="h-3 w-3 text-muted-foreground" />
                
                <span className="text-xs font-medium flex-1">{label}</span>
                
                {call.status === 'pending' && (
                  <div className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                    <Badge variant="outline" className="text-xs">
                      Loading...
                    </Badge>
                  </div>
                )}
                
                {call.status === 'success' && (
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <Badge variant="secondary" className="text-xs">
                      Done
                    </Badge>
                  </div>
                )}
                
                {call.status === 'error' && (
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-red-500" />
                    <Badge variant="destructive" className="text-xs">
                      Error
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {functionCalls.some(call => call.error) && (
          <div className="mt-2 p-2 bg-red-50 rounded-md">
            <p className="text-xs text-red-700">
              Some data queries failed. Results may be incomplete.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}