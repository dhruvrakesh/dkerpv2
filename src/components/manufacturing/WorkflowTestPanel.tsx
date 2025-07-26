import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';
import { AlertTriangle, CheckCircle, Play, RefreshCw } from 'lucide-react';

export const WorkflowTestPanel: React.FC = () => {
  const { organization } = useDKEGLAuth();
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const runWorkflowTests = async () => {
    if (!organization?.id) return;

    setTesting(true);
    setTestResults([]);

    try {
      // Test 1: Check edge function availability
      const test1 = await testEdgeFunction();
      setTestResults(prev => [...prev, test1]);

      // Test 2: Check data integrity
      const test2 = await testDataIntegrity();
      setTestResults(prev => [...prev, test2]);

      // Test 3: Test workflow progression
      const test3 = await testWorkflowProgression();
      setTestResults(prev => [...prev, test3]);

    } catch (error) {
      console.error('Test error:', error);
      toast.error('Test execution failed');
    } finally {
      setTesting(false);
    }
  };

  const testEdgeFunction = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('workflow-automation', {
        body: {
          action: 'validate_stage_transition',
          organizationId: organization?.id,
          data: { 
            fromStageId: 'test-stage',
            toStageId: 'test-stage-2',
            orderId: 'test-order'
          }
        }
      });

      return {
        name: 'Edge Function Connectivity',
        status: error ? 'failed' : 'passed',
        message: error ? `Error: ${error.message}` : 'Edge function is accessible',
        details: { data, error }
      };
    } catch (error: any) {
      return {
        name: 'Edge Function Connectivity',
        status: 'failed',
        message: `Edge function error: ${error.message}`,
        details: error
      };
    }
  };

  const testDataIntegrity = async () => {
    try {
      const { data: orders, error } = await supabase
        .from('dkegl_orders')
        .select(`
          id,
          uiorn,
          status,
          workflow_progress:dkegl_workflow_progress(
            id,
            stage_id,
            status,
            stage:dkegl_workflow_stages(stage_name, sequence_order)
          )
        `)
        .eq('organization_id', organization?.id)
        .limit(5);

      if (error) throw error;

      const issues = [];
      orders?.forEach(order => {
        const stageIds = new Set();
        order.workflow_progress?.forEach((progress: any) => {
          const key = `${progress.stage_id}-${progress.status}`;
          if (stageIds.has(key)) {
            issues.push(`Order ${order.uiorn}: Duplicate progress for stage ${progress.stage?.stage_name}`);
          }
          stageIds.add(key);
        });
      });

      return {
        name: 'Data Integrity Check',
        status: issues.length === 0 ? 'passed' : 'warning',
        message: issues.length === 0 
          ? 'No data integrity issues found' 
          : `Found ${issues.length} data issues`,
        details: issues
      };
    } catch (error: any) {
      return {
        name: 'Data Integrity Check',
        status: 'failed',
        message: `Data check failed: ${error.message}`,
        details: error
      };
    }
  };

  const testWorkflowProgression = async () => {
    try {
      // Get a test order
      const { data: testOrder } = await supabase
        .from('dkegl_orders')
        .select('id, uiorn')
        .eq('organization_id', organization?.id)
        .limit(1)
        .single();

      if (!testOrder) {
        return {
          name: 'Workflow Progression Test',
          status: 'skipped',
          message: 'No test orders available',
          details: null
        };
      }

      // Test edge function call
      const { data, error } = await supabase.functions.invoke('workflow-automation', {
        body: {
          action: 'auto_progress_workflow',
          organizationId: organization?.id,
          data: { orderId: testOrder.id }
        }
      });

      return {
        name: 'Workflow Progression Test',
        status: error ? 'failed' : 'passed',
        message: error 
          ? `Progression failed: ${error.message}`
          : data?.success 
            ? `Success: ${data.message}`
            : `Response: ${data?.message || 'Unknown response'}`,
        details: { data, error, testOrder: testOrder.uiorn }
      };
    } catch (error: any) {
      return {
        name: 'Workflow Progression Test',
        status: 'failed',
        message: `Test failed: ${error.message}`,
        details: error
      };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Play className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'text-green-700 bg-green-100 border-green-300';
      case 'failed':
        return 'text-red-700 bg-red-100 border-red-300';
      case 'warning':
        return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      default:
        return 'text-blue-700 bg-blue-100 border-blue-300';
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Workflow System Health Check</span>
          <Button 
            onClick={runWorkflowTests}
            disabled={testing}
            size="sm"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${testing ? 'animate-spin' : ''}`} />
            Run Tests
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {testResults.length === 0 && !testing ? (
          <p className="text-muted-foreground">Click "Run Tests" to check system health</p>
        ) : (
          <div className="space-y-3">
            {testResults.map((result, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border">
                {getStatusIcon(result.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{result.name}</span>
                    <Badge className={getStatusColor(result.status)}>
                      {result.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.message}
                  </p>
                  {result.details && Array.isArray(result.details) && result.details.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <details>
                        <summary className="cursor-pointer">View Details</summary>
                        <ul className="mt-1 ml-4">
                          {result.details.map((detail: string, idx: number) => (
                            <li key={idx}>• {detail}</li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {testing && (
              <div className="flex items-center space-x-3 p-3 rounded-lg border">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                <span>Running tests...</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};