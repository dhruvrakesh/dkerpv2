import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';
import { toast } from '@/hooks/use-toast';
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';

interface ReconciliationResult {
  success: boolean;
  message: string;
  verification_sample?: Array<{
    item_code: string;
    current_qty: number;
    calculated_qty: number;
    variance: number;
    opening_qty: number;
    total_grn: number;
    total_issued: number;
  }>;
}

export const AutoStockReconciliation = () => {
  const { organization } = useDKEGLAuth();
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconciliationDone, setReconciliationDone] = useState(false);
  const [result, setResult] = useState<ReconciliationResult | null>(null);

  const runReconciliation = async () => {
    if (!organization?.id) return;

    setIsReconciling(true);
    try {
      console.log('Running stock reconciliation to fix calculations...');
      
      const { data, error } = await supabase.functions.invoke('stock-reconciliation', {
        body: { trigger_type: 'manual' }
      });
      
      if (error) throw error;
      
      setResult(data);
      setReconciliationDone(true);
      
      toast({
        title: "Stock Reconciliation Complete",
        description: `Updated ${data?.verification_sample?.length || 0} items. BOP_650_kg_50 should now show correct quantity.`,
      });

      // Log sample results for verification
      if (data?.verification_sample) {
        console.log('Stock reconciliation results:', data.verification_sample);
        const bopItem = data.verification_sample.find((item: any) => item.item_code === 'BOP_650_kg_50');
        if (bopItem) {
          console.log('BOP_650_kg_50 reconciliation result:', bopItem);
        }
      }
      
    } catch (error) {
      console.error('Stock reconciliation failed:', error);
      toast({
        title: "Reconciliation Error", 
        description: `Failed to reconcile stock: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsReconciling(false);
    }
  };

  // Auto-run reconciliation on component mount
  useEffect(() => {
    if (organization?.id && !reconciliationDone && !isReconciling) {
      runReconciliation();
    }
  }, [organization?.id]);

  if (!reconciliationDone && !isReconciling) {
    return null; // Hide component until reconciliation starts
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {reconciliationDone ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <RefreshCw className={`h-5 w-5 ${isReconciling ? 'animate-spin' : ''}`} />
          )}
          Stock Reconciliation Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isReconciling ? (
          <Alert>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Running stock reconciliation to fix calculations and update current quantities...
            </AlertDescription>
          </Alert>
        ) : reconciliationDone && result ? (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {result.message} - Items with negative stock are normal until opening stock is uploaded.
              </AlertDescription>
            </Alert>
            
            {result.verification_sample && result.verification_sample.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Sample Updated Items:</h4>
                <div className="space-y-2">
                  {result.verification_sample.slice(0, 3).map((item) => (
                    <div key={item.item_code} className="text-sm border rounded p-2 space-y-1">
                      <div className="font-medium">{item.item_code}</div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>Current: <span className="font-medium">{item.current_qty} kg</span></div>
                        <div>GRN: <span className="text-green-600">+{item.total_grn}</span></div>
                        <div>Issues: <span className="text-red-600">-{item.total_issued}</span></div>
                        <div>Opening: <span className="text-blue-600">{item.opening_qty}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <Button
              onClick={runReconciliation}
              disabled={isReconciling}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isReconciling ? 'animate-spin' : ''}`} />
              Run Again
            </Button>
          </div>
        ) : (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Stock reconciliation failed. Some calculations may be incorrect.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};