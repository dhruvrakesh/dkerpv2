import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, CheckCircle, XCircle, RefreshCcw, TrendingUp, AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { useComprehensiveStockAnalytics } from '@/hooks/useComprehensiveStockAnalytics';

interface VarianceItem {
  item_code: string;
  item_name: string;
  category_name: string;
  current_qty: number;
  calculated_qty: number;
  variance_qty: number;
  variance_percentage: number;
  unit_cost: number;
  variance_value: number;
}

export const StockVarianceMonitor = () => {
  const { toast } = useToast();
  const { stockData, isLoading, refreshData, runStockReconciliation } = useComprehensiveStockAnalytics();
  const [reconciling, setReconciling] = useState(false);

  // Calculate variance items with significant discrepancies
  const varianceItems: VarianceItem[] = stockData
    .filter(item => Math.abs(item.variance_qty) > 0.01) // Only items with actual variance
    .map(item => ({
      item_code: item.item_code,
      item_name: item.item_name,
      category_name: item.category_name,
      current_qty: item.current_qty,
      calculated_qty: item.calculated_qty,
      variance_qty: item.variance_qty,
      variance_percentage: item.calculated_qty !== 0 
        ? (Math.abs(item.variance_qty) / Math.abs(item.calculated_qty)) * 100 
        : 0,
      unit_cost: item.unit_cost,
      variance_value: item.variance_qty * item.unit_cost,
    }))
    .sort((a, b) => Math.abs(b.variance_value) - Math.abs(a.variance_value));

  // Categorize variances by severity
  const criticalVariances = varianceItems.filter(item => item.variance_percentage > 50);
  const highVariances = varianceItems.filter(item => item.variance_percentage > 20 && item.variance_percentage <= 50);
  const mediumVariances = varianceItems.filter(item => item.variance_percentage > 5 && item.variance_percentage <= 20);

  const totalVarianceValue = varianceItems.reduce((sum, item) => sum + Math.abs(item.variance_value), 0);

  const handleReconciliation = async () => {
    setReconciling(true);
    try {
      const result = await runStockReconciliation();
      
      if (result?.status === 'perfect_reconciliation') {
        toast({
          title: "Perfect Reconciliation",
          description: "All stock variances have been resolved!",
        });
      } else if (result?.status === 'good_reconciliation') {
        toast({
          title: "Reconciliation Complete", 
          description: `Stock reconciled with minimal remaining variance: ₹${result.total_variance_remaining?.toFixed(2)}`,
        });
      } else {
        toast({
          title: "Reconciliation Completed",
          description: `${result?.items_corrected || 0} items corrected. Please review remaining variances.`,
          variant: "destructive",
        });
      }
      
      // Refresh data after reconciliation
      refreshData();
    } catch (error) {
      console.error('Reconciliation failed:', error);
      toast({
        title: "Reconciliation Failed",
        description: "Unable to complete stock reconciliation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setReconciling(false);
    }
  };

  const getVarianceBadge = (percentage: number) => {
    if (percentage > 50) return <Badge variant="destructive">Critical</Badge>;
    if (percentage > 20) return <Badge variant="destructive">High</Badge>;
    if (percentage > 5) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <LoadingSpinner className="h-8 w-8" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium">Critical Variances</p>
                <p className="text-2xl font-bold">{criticalVariances.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">High Priority</p>
                <p className="text-2xl font-bold">{highVariances.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Medium Priority</p>
                <p className="text-2xl font-bold">{mediumVariances.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Total Variance</p>
                <p className="text-lg font-bold">{formatCurrency(totalVarianceValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Variance Monitor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Stock Variance Monitor
              </CardTitle>
              <CardDescription>
                Monitor and resolve stock calculation variances across all items
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={refreshData} disabled={isLoading}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button 
                onClick={handleReconciliation} 
                disabled={reconciling || varianceItems.length === 0}
                className="bg-gradient-to-r from-primary to-primary/80"
              >
                {reconciling ? (
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                {reconciling ? 'Reconciling...' : 'Auto-Reconcile'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {varianceItems.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Stock Variances Detected</h3>
              <p className="text-muted-foreground">All stock calculations are accurate and up to date.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Stock Calculation Formula</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>Current Stock = Opening Stock + Total GRN - Total Issues</strong>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Variance = Current Stock (System) - Calculated Stock (Formula)
                </p>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Current Qty</TableHead>
                      <TableHead className="text-right">Calculated Qty</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead className="text-right">Variance %</TableHead>
                      <TableHead className="text-right">Value Impact</TableHead>
                      <TableHead>Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {varianceItems.map((item) => (
                      <TableRow key={item.item_code}>
                        <TableCell className="font-medium">{item.item_code}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={item.item_name}>
                          {item.item_name}
                        </TableCell>
                        <TableCell>{item.category_name}</TableCell>
                        <TableCell className="text-right">{item.current_qty.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{item.calculated_qty.toLocaleString()}</TableCell>
                        <TableCell className={`text-right font-medium ${
                          item.variance_qty > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {item.variance_qty > 0 ? '+' : ''}{item.variance_qty.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.variance_percentage.toFixed(1)}%
                        </TableCell>
                        <TableCell className={`text-right font-medium ${
                          item.variance_value > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(Math.abs(item.variance_value))}
                        </TableCell>
                        <TableCell>
                          {getVarianceBadge(item.variance_percentage)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};