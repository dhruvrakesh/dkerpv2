import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Calculator, 
  Download, 
  Upload, 
  TrendingUp, 
  AlertTriangle,
  FileSpreadsheet,
  DollarSign,
  Package2,
  Calendar,
  Activity
} from 'lucide-react';
import { useStockValuation } from '@/hooks/useStockValuation';
import { StockValuationTable } from './StockValuationTable';
import { CustomPricingUpload } from './CustomPricingUpload';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const StockValuationDashboard: React.FC = () => {
  const {
    valuationData,
    valuationMethods,
    selectedMethod,
    loading,
    uploading,
    fetchValuationMethods,
    fetchStockValuationData,
    setSelectedMethod,
    uploadCustomPricing,
    exportValuationComparison,
  } = useStockValuation();

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Initialize data on component mount
  useEffect(() => {
    fetchValuationMethods();
    fetchStockValuationData();
  }, [fetchValuationMethods, fetchStockValuationData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success text-success-foreground';
      case 'partial': return 'bg-warning text-warning-foreground';
      case 'inactive': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const selectedMethodData = valuationMethods.find(m => m.id === selectedMethod);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Valuation Master</h1>
          <p className="text-muted-foreground">
            Unified dashboard for managing multiple stock valuation methods and pricing sources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setUploadDialogOpen(true)}
            disabled={loading}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Custom Pricing
          </Button>
          <Button
            variant="outline"
            onClick={exportValuationComparison}
            disabled={loading || valuationData.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Comparison
          </Button>
        </div>
      </div>

      {/* Valuation Methods Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {valuationMethods.map((method) => (
          <Card 
            key={method.id} 
            className={`cursor-pointer transition-all ${
              selectedMethod === method.id 
                ? 'ring-2 ring-primary border-primary' 
                : 'hover:border-primary/50'
            }`}
            onClick={() => setSelectedMethod(method.id)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{method.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(method.status)} variant="secondary">
                  {method.status}
                </Badge>
                {method.id === 'grn_average' && <TrendingUp className="h-4 w-4" />}
                {method.id === 'standard_cost' && <Calculator className="h-4 w-4" />}
                {method.id === 'opening_stock' && <Package2 className="h-4 w-4" />}
                {method.id === 'custom_upload' && <FileSpreadsheet className="h-4 w-4" />}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(method.totalValue)}</div>
              <p className="text-xs text-muted-foreground">
                {method.itemCount.toLocaleString()} items
                {method.lastUpdated && (
                  <span className="block">
                    Updated: {new Date(method.lastUpdated).toLocaleDateString()}
                  </span>
                )}
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                {method.description}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Current Method Details */}
      {selectedMethodData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {selectedMethodData.name} - Detailed Analysis
            </CardTitle>
            <CardDescription>
              {selectedMethodData.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Total Valuation</Label>
                <div className="text-2xl font-bold">
                  {formatCurrency(selectedMethodData.totalValue)}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Items Covered</Label>
                <div className="text-2xl font-bold">
                  {selectedMethodData.itemCount.toLocaleString()}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Last Updated</Label>
                <div className="text-lg">
                  {selectedMethodData.lastUpdated 
                    ? new Date(selectedMethodData.lastUpdated).toLocaleDateString()
                    : 'Never'
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variance Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Price Variance Analysis
          </CardTitle>
          <CardDescription>
            Items with significant price differences between valuation methods
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-4">
              {/* High variance items summary */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-destructive">
                    {valuationData.filter(item => Math.abs(item.variance_percentage) > 50).length}
                  </div>
                  <p className="text-sm text-muted-foreground">Items with &gt;50% variance</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-warning">
                    {valuationData.filter(item => Math.abs(item.variance_percentage) > 25 && Math.abs(item.variance_percentage) <= 50).length}
                  </div>
                  <p className="text-sm text-muted-foreground">Items with 25-50% variance</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-success">
                    {valuationData.filter(item => Math.abs(item.variance_percentage) <= 25).length}
                  </div>
                  <p className="text-sm text-muted-foreground">Items with &lt;25% variance</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Valuation Data */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Valuation Details</CardTitle>
          <CardDescription>
            Comprehensive view of all valuation methods for each item
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StockValuationTable
            data={valuationData}
            selectedMethod={selectedMethod}
            loading={loading}
          />
        </CardContent>
      </Card>

      {/* Custom Pricing Upload Dialog */}
      <CustomPricingUpload
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUpload={uploadCustomPricing}
        uploading={uploading}
        onSuccess={() => {
          fetchValuationMethods();
          fetchStockValuationData();
        }}
      />
    </div>
  );
};