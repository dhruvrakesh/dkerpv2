import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, TrendingUp, TrendingDown, Equal, Plus, Minus, Database } from 'lucide-react';
import { toast } from 'sonner';

interface StockBreakdown {
  item_code: string;
  item_name: string;
  category_name: string;
  uom: string;
  opening_qty: number;
  total_grn_qty: number;
  total_issued_qty: number;
  current_qty: number;
  calculated_qty: number;
  variance_qty: number;
  unit_cost: number;
  total_value: number;
  last_transaction_date: string;
  reorder_level: number;
  reorder_quantity: number;
  days_since_last_movement: number;
  stock_status: string;
  location: string;
  is_low_stock: boolean;
}

interface SummaryTotals {
  total_opening: number;
  total_grn: number;
  total_issued: number;
  total_current: number;
  total_calculated: number;
  total_variance: number;
  total_items: number;
}

export const EnhancedStockSummary = () => {
  const { toast: showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isReconciling, setIsReconciling] = useState(false);
  const [breakdown, setBreakdown] = useState<StockBreakdown[]>([]);
  const [summaryTotals, setSummaryTotals] = useState<SummaryTotals>({
    total_opening: 0,
    total_grn: 0,
    total_issued: 0,
    total_current: 0,
    total_calculated: 0,
    total_variance: 0,
    total_items: 0,
  });

  const loadStockSummary = async () => {
    try {
      setLoading(true);
      
      const { data: orgId } = await supabase.rpc('dkegl_get_current_user_org');
      if (!orgId) {
        console.log('No organization found for user');
        throw new Error('Organization not found');
      }

      console.log('Loading comprehensive stock summary for org:', orgId);

      // Use the new comprehensive stock summary function
      const { data, error } = await supabase.rpc('dkegl_get_comprehensive_stock_summary', {
        _org_id: orgId
      });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Comprehensive stock summary data loaded:', data?.length || 0, 'records');
      const stockBreakdown = (data || []).map((item: any) => ({
        ...item,
        is_low_stock: item.stock_status === 'Low Stock' || item.stock_status === 'Out of Stock'
      }));
      setBreakdown(stockBreakdown);

      // Get aggregated totals using the new function
      const { data: totalsData, error: totalsError } = await supabase.rpc('dkegl_get_stock_analytics_totals', {
        _org_id: orgId
      });

      if (totalsError) {
        console.error('Error loading totals:', totalsError);
        throw totalsError;
      }

      const totals = totalsData[0] || {
        total_opening: 0,
        total_grn: 0,
        total_issued: 0,
        total_current: 0,
        total_calculated: 0,
        total_variance: 0,
        total_items: 0,
      };

      setSummaryTotals(totals);

      // If no data found, show informative message
      if (stockBreakdown.length === 0) {
        showToast({
          title: "No Stock Data",
          description: "No stock data found. Please check inventory records.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error loading stock summary:', error);
      showToast({
        title: "Error",
        description: `Failed to load stock summary: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshStockSummary = async () => {
    try {
      setRefreshing(true);
      
      const { data: orgId } = await supabase.rpc('dkegl_get_current_user_org');
      if (!orgId) throw new Error('Organization not found');

      // The comprehensive function doesn't need a refresh as it calculates real-time
      console.log('Stock summary will be refreshed on next load');

      showToast({
        title: "Success",
        description: "Stock summary refreshed successfully",
      });

      // Reload the data
      await loadStockSummary();
    } catch (error) {
      console.error('Error refreshing stock summary:', error);
      showToast({
        title: "Error",
        description: "Failed to refresh stock summary",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const runStockReconciliation = async () => {
    setIsReconciling(true);
    try {
      const { data, error } = await supabase.functions.invoke('stock-reconciliation', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success(`Stock reconciliation completed! ${data.result?.consolidations_count || 0} consolidations, ${data.result?.discrepancies_count || 0} discrepancies found.`);
        // Refresh data after reconciliation
        await loadStockSummary();
      }
    } catch (error) {
      toast.error('Failed to run stock reconciliation');
      console.error('Reconciliation error:', error);
    } finally {
      setIsReconciling(false);
    }
  };

  useEffect(() => {
    loadStockSummary();
  }, []);

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) < 0.01) return 'default';
    if (variance > 0) return 'destructive';
    return 'secondary';
  };

  const getVarianceIcon = (variance: number) => {
    if (Math.abs(variance) < 0.01) return <Equal className="h-3 w-3" />;
    if (variance > 0) return <TrendingUp className="h-3 w-3" />;
    return <TrendingDown className="h-3 w-3" />;
  };

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Enhanced Stock Summary</h2>
          <p className="text-muted-foreground">
            Complete stock calculation breakdown with variance analysis
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={runStockReconciliation} 
            disabled={isReconciling || loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Database className={`h-4 w-4 ${isReconciling ? 'animate-pulse' : ''}`} />
            {isReconciling ? 'Reconciling...' : 'Reconcile Stock'}
          </Button>
          <Button 
            onClick={refreshStockSummary} 
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Summary
          </Button>
        </div>
      </div>

      {/* Stock Formula Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Stock Calculation Formula
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center space-x-4 text-lg font-medium">
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 px-3 py-2 rounded-lg">
              <span>Opening Stock</span>
              <span className="text-sm text-muted-foreground">(Mar 31, 2025)</span>
            </div>
            <Plus className="h-5 w-5 text-green-600" />
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950 px-3 py-2 rounded-lg">
              <span>GRNs</span>
              <span className="text-sm text-muted-foreground">(Apr 1, 2025+)</span>
            </div>
            <Minus className="h-5 w-5 text-red-600" />
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950 px-3 py-2 rounded-lg">
              <span>Issues</span>
              <span className="text-sm text-muted-foreground">(Apr 1, 2025+)</span>
            </div>
            <Equal className="h-5 w-5 text-gray-600" />
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-2 rounded-lg">
              <span>Current Stock</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Totals */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Opening Stock</div>
            <div className="text-2xl font-bold text-blue-600">
              {summaryTotals.total_opening.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total GRNs</div>
            <div className="text-2xl font-bold text-green-600">
              +{summaryTotals.total_grn.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Issues</div>
            <div className="text-2xl font-bold text-red-600">
              -{summaryTotals.total_issued.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Calculated</div>
            <div className="text-2xl font-bold">
              {summaryTotals.total_calculated.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Current Stock</div>
            <div className="text-2xl font-bold text-primary">
              {summaryTotals.total_current.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Variance</div>
            <div className="text-2xl font-bold text-orange-600">
              {summaryTotals.total_variance.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Item-wise Stock Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading stock summary...
            </div>
          ) : breakdown.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No stock summary data available. Click refresh to generate summary.
              </p>
              <Button onClick={refreshStockSummary} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Generate Summary
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {breakdown.map((item, index) => (
                <div key={item.item_code} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium">{item.item_code}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {item.item_name}
                      </span>
                    </div>
                    <Badge 
                      variant={getVarianceColor(item.variance_qty || 0)}
                      className="flex items-center gap-1"
                    >
                      {getVarianceIcon(item.variance_qty || 0)}
                      {Math.abs(item.variance_qty || 0).toFixed(0)} variance
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-6 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-blue-600 font-medium">
                        {(item.opening_qty || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Opening</div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-600 font-medium">
                        +{(item.total_grn_qty || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">GRNs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-600 font-medium">
                        -{(item.total_issued_qty || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Issues</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">
                        {(item.calculated_qty || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Calculated</div>
                    </div>
                    <div className="text-center">
                      <div className="text-primary font-medium">
                        {(item.current_qty || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Current</div>
                    </div>
                    <div className="text-center">
                      <div className="text-orange-600 font-medium">
                        {Math.abs(item.variance_qty || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Variance</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};