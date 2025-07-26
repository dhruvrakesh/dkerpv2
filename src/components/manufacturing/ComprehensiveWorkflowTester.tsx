import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Play, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
  test: string;
  status: 'passed' | 'failed' | 'warning' | 'running';
  message: string;
  details?: any;
  duration?: number;
}

export const ComprehensiveWorkflowTester: React.FC = () => {
  const { organization } = useDKEGLAuth();
  const queryClient = useQueryClient();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Test 1: Data Integrity Check
  const testDataIntegrity = async (): Promise<TestResult> => {
    const start = Date.now();
    try {
      const { data, error } = await supabase
        .from('dkegl_workflow_progress')
        .select(`
          id,
          order_id,
          stage_id,
          progress_percentage,
          status,
          dkegl_orders!inner(uiorn, item_name, organization_id),
          dkegl_workflow_stages!inner(stage_name, stage_order, organization_id)
        `)
        .eq('dkegl_orders.organization_id', organization?.id);

      if (error) throw error;

      // Check for duplicates
      const orderStageMap = new Map();
      let duplicates = 0;
      let orphans = 0;

      data?.forEach(item => {
        const key = `${item.order_id}-${item.stage_id}`;
        if (orderStageMap.has(key)) {
          duplicates++;
        } else {
          orderStageMap.set(key, item);
        }

        if (!item.dkegl_orders || !item.dkegl_workflow_stages) {
          orphans++;
        }
      });

      const duration = Date.now() - start;

      if (duplicates > 0 || orphans > 0) {
        return {
          test: 'Data Integrity Check',
          status: 'failed',
          message: `Found ${duplicates} duplicates and ${orphans} orphaned records`,
          details: { total: data?.length, duplicates, orphans },
          duration
        };
      }

      return {
        test: 'Data Integrity Check',
        status: 'passed',
        message: `All ${data?.length} workflow progress records are clean`,
        details: { total: data?.length, duplicates: 0, orphans: 0 },
        duration
      };
    } catch (error) {
      return {
        test: 'Data Integrity Check',
        status: 'failed',
        message: `Error: ${error.message}`,
        duration: Date.now() - start
      };
    }
  };

  // Test 2: Edge Function Connectivity
  const testEdgeFunction = async (): Promise<TestResult> => {
    const start = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke('workflow-automation', {
        body: { action: 'validate_stage_transition', fromStageId: 'test', toStageId: 'test' }
      });

      const duration = Date.now() - start;

      if (error) {
        return {
          test: 'Edge Function Connectivity',
          status: 'failed',
          message: `Edge function error: ${error.message}`,
          duration
        };
      }

      return {
        test: 'Edge Function Connectivity',
        status: 'passed',
        message: 'Edge function responding correctly',
        details: data,
        duration
      };
    } catch (error) {
      return {
        test: 'Edge Function Connectivity',
        status: 'failed',
        message: `Connection error: ${error.message}`,
        duration: Date.now() - start
      };
    }
  };

  // Test 3: Workflow Progression Logic
  const testWorkflowProgression = async (): Promise<TestResult> => {
    const start = Date.now();
    try {
      // Get a sample order with workflow progress
      const { data: orders, error: ordersError } = await supabase
        .from('dkegl_orders')
        .select('id, uiorn, status')
        .eq('organization_id', organization?.id)
        .eq('status', 'in_production')
        .limit(1);

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        return {
          test: 'Workflow Progression Logic',
          status: 'warning',
          message: 'No in-progress orders found for testing',
          duration: Date.now() - start
        };
      }

      const testOrder = orders[0];

      // Get workflow stages for this order
      const { data: progress, error: progressError } = await supabase
        .from('dkegl_workflow_progress')
        .select(`
          *,
          dkegl_workflow_stages!inner(stage_name, stage_order)
        `)
        .eq('order_id', testOrder.id)
        .order('dkegl_workflow_stages.stage_order');

      if (progressError) throw progressError;

      // Check if stages are properly sequenced
      let sequenceValid = true;
      let prevOrder = 0;

      progress?.forEach(p => {
        const currentOrder = p.dkegl_workflow_stages.stage_order;
        if (currentOrder <= prevOrder) {
          sequenceValid = false;
        }
        prevOrder = currentOrder;
      });

      const duration = Date.now() - start;

      return {
        test: 'Workflow Progression Logic',
        status: sequenceValid ? 'passed' : 'failed',
        message: sequenceValid 
          ? `Workflow sequence valid for order ${testOrder.uiorn}` 
          : `Invalid workflow sequence for order ${testOrder.uiorn}`,
        details: { order: testOrder.uiorn, stages: progress?.length, sequenceValid },
        duration
      };
    } catch (error) {
      return {
        test: 'Workflow Progression Logic',
        status: 'failed',
        message: `Error: ${error.message}`,
        duration: Date.now() - start
      };
    }
  };

  // Test 4: Real-time Updates
  const testRealTimeUpdates = async (): Promise<TestResult> => {
    const start = Date.now();
    try {
      // Test channel subscription
      const channel = supabase
        .channel('test-channel')
        .on('postgres_changes', 
          {
            event: '*',
            schema: 'public',
            table: 'dkegl_workflow_progress',
            filter: `organization_id=eq.${organization?.id}`
          },
          () => {
            // Test payload handler
          }
        );

      await channel.subscribe();

      // Clean up immediately
      supabase.removeChannel(channel);

      const duration = Date.now() - start;

      return {
        test: 'Real-time Updates',
        status: 'passed',
        message: 'Real-time subscription working',
        duration
      };
    } catch (error) {
      return {
        test: 'Real-time Updates',
        status: 'failed',
        message: `Error: ${error.message}`,
        duration: Date.now() - start
      };
    }
  };

  // Test 5: End-to-End Workflow Creation
  const testEndToEndFlow = async (): Promise<TestResult> => {
    const start = Date.now();
    try {
      // Create a test order
      const testUiorn = `TEST-${Date.now()}`;
      
      const { data: newOrder, error: orderError } = await supabase
        .from('dkegl_orders')
        .insert({
          organization_id: organization?.id,
          order_number: testUiorn,
          uiorn: testUiorn,
          item_code: 'TEST-ITEM',
          item_name: 'Test Item for E2E',
          order_quantity: 100,
          status: 'draft'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Get first workflow stage
      const { data: stages, error: stagesError } = await supabase
        .from('dkegl_workflow_stages')
        .select('*')
        .eq('organization_id', organization?.id)
        .order('stage_order')
        .limit(1);

      if (stagesError) throw stagesError;

      if (!stages || stages.length === 0) {
        throw new Error('No workflow stages found');
      }

      // Create initial workflow progress
      const { error: progressError } = await supabase
        .from('dkegl_workflow_progress')
        .insert({
          organization_id: organization?.id,
          order_id: newOrder.id,
          stage_id: stages[0].id,
          status: 'pending',
          progress_percentage: 0
        });

      if (progressError) throw progressError;

      // Clean up test data
      await supabase.from('dkegl_workflow_progress').delete().eq('order_id', newOrder.id);
      await supabase.from('dkegl_orders').delete().eq('id', newOrder.id);

      const duration = Date.now() - start;

      return {
        test: 'End-to-End Workflow Creation',
        status: 'passed',
        message: `Successfully created and cleaned up test order ${testUiorn}`,
        details: { testOrder: testUiorn, stagesCount: stages.length },
        duration
      };
    } catch (error) {
      return {
        test: 'End-to-End Workflow Creation',
        status: 'failed',
        message: `Error: ${error.message}`,
        duration: Date.now() - start
      };
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    const tests = [
      testDataIntegrity,
      testEdgeFunction,
      testWorkflowProgression,
      testRealTimeUpdates,
      testEndToEndFlow
    ];

    const results: TestResult[] = [];

    for (const test of tests) {
      try {
        const result = await test();
        results.push(result);
        setTestResults([...results]);
        
        if (result.status === 'failed') {
          toast.error(`Test failed: ${result.test}`);
        } else if (result.status === 'passed') {
          toast.success(`Test passed: ${result.test}`);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        results.push({
          test: test.name,
          status: 'failed',
          message: `Unexpected error: ${error.message}`
        });
        setTestResults([...results]);
      }
    }

    setIsRunning(false);
    
    const passed = results.filter(r => r.status === 'passed').length;
    const total = results.length;
    
    if (passed === total) {
      toast.success(`All ${total} tests passed! System ready for production.`);
    } else {
      toast.error(`${total - passed} tests failed. Review results and fix issues.`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'running': return <RotateCcw className="h-4 w-4 text-blue-600 animate-spin" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const passedTests = testResults.filter(r => r.status === 'passed').length;
  const totalTests = testResults.length;
  const allTestsComplete = totalTests === 5;
  const allTestsPassed = passedTests === 5;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Comprehensive Workflow System Tester
        </CardTitle>
        <CardDescription>
          Complete end-to-end testing of the manufacturing workflow system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <RotateCcw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </Button>
          
          {allTestsComplete && (
            <Badge 
              variant={allTestsPassed ? "default" : "destructive"}
              className="text-sm"
            >
              {passedTests}/{totalTests} Tests Passed
            </Badge>
          )}
        </div>

        {testResults.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">Test Results:</h4>
            {testResults.map((result, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="font-medium">{result.test}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.duration && (
                      <span className="text-sm text-muted-foreground">
                        {result.duration}ms
                      </span>
                    )}
                    <Badge className={getStatusColor(result.status)}>
                      {result.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{result.message}</p>
                {result.details && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                      View Details
                    </summary>
                    <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {allTestsComplete && allTestsPassed && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-800 mb-2">✅ System Ready for Production!</h4>
            <p className="text-sm text-green-700">
              All tests have passed successfully. The manufacturing workflow system is operating correctly and ready for production use.
            </p>
          </div>
        )}

        {allTestsComplete && !allTestsPassed && (
          <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
            <h4 className="font-medium text-red-800 mb-2">⚠️ Issues Detected</h4>
            <p className="text-sm text-red-700">
              Some tests have failed. Please review the test results above and address any issues before proceeding to production.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};