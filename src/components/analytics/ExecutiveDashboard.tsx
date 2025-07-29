import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Target, 
  PieChart,
  Calendar,
  Download,
  RefreshCw,
  Users,
  Package
} from 'lucide-react';
import { useEnterpriseAnalytics } from '@/hooks/useEnterpriseAnalytics';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart } from 'recharts';

export const ExecutiveDashboard: React.FC = () => {
  const { executiveSummary, loading, fetchExecutiveSummary } = useEnterpriseAnalytics();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    // Set default date range (last 12 months)
    const today = new Date();
    const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    
    setStartDate(lastYear.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      handleRefresh();
    }
  }, [startDate, endDate]);

  const handleRefresh = async () => {
    await fetchExecutiveSummary(startDate, endDate);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  if (loading && !executiveSummary) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Executive Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            High-level business performance and strategic insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={handleRefresh} disabled={loading}>
              <Calendar className="h-4 w-4 mr-2" />
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {executiveSummary ? formatCurrency(executiveSummary.total_revenue) : '₹0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {executiveSummary && (
                <span className={executiveSummary.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatPercentage(executiveSummary.revenue_growth)} from last period
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {executiveSummary ? formatCurrency(executiveSummary.total_expenses) : '₹0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {executiveSummary && (
                <span className={executiveSummary.expense_growth <= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatPercentage(executiveSummary.expense_growth)} from last period
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${executiveSummary && executiveSummary.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {executiveSummary ? formatCurrency(executiveSummary.net_profit) : '₹0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue minus expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${executiveSummary && executiveSummary.profit_margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {executiveSummary ? `${executiveSummary.profit_margin.toFixed(1)}%` : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              Profitability ratio
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue vs Expenses Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue vs Expenses Trend</CardTitle>
          <CardDescription>Monthly financial performance comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={executiveSummary?.key_metrics?.monthly_trends || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenue" />
              <Bar dataKey="expenses" fill="hsl(var(--destructive))" name="Expenses" />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="hsl(var(--chart-2))" 
                strokeWidth={3}
                name="Profit"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Top Selling Products
            </CardTitle>
            <CardDescription>Best performing products by revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {executiveSummary?.key_metrics?.top_selling_products?.slice(0, 5).map((product: any, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{product.product_name || 'Unknown Product'}</div>
                    <div className="text-sm text-muted-foreground">
                      {product.quantity || 0} units sold
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(product.total_value || 0)}</div>
                  </div>
                </div>
              )) || (
                <div className="text-center py-4 text-muted-foreground">
                  No product data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Customers
            </CardTitle>
            <CardDescription>Highest value customers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {executiveSummary?.key_metrics?.top_customers?.slice(0, 5).map((customer: any, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{customer.customer_name || 'Unknown Customer'}</div>
                    <div className="text-sm text-muted-foreground">
                      {customer.transaction_count || 0} transactions
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(customer.total_value || 0)}</div>
                  </div>
                </div>
              )) || (
                <div className="text-center py-4 text-muted-foreground">
                  No customer data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Vendors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Top Vendors
            </CardTitle>
            <CardDescription>Highest spend vendors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {executiveSummary?.key_metrics?.top_vendors?.slice(0, 5).map((vendor: any, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{vendor.vendor_name || 'Unknown Vendor'}</div>
                    <div className="text-sm text-muted-foreground">
                      {vendor.transaction_count || 0} orders
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(vendor.total_amount || 0)}</div>
                  </div>
                </div>
              )) || (
                <div className="text-center py-4 text-muted-foreground">
                  No vendor data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Comparison */}
      {executiveSummary?.period_comparison && (
        <Card>
          <CardHeader>
            <CardTitle>Period Comparison</CardTitle>
            <CardDescription>Current vs Previous period performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-center">Current Period</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Revenue:</span>
                    <span className="font-medium">
                      {formatCurrency(executiveSummary.period_comparison.current_period?.revenue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expenses:</span>
                    <span className="font-medium">
                      {formatCurrency(executiveSummary.period_comparison.current_period?.expenses || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Profit:</span>
                    <span className="font-medium">
                      {formatCurrency(executiveSummary.period_comparison.current_period?.profit || 0)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-center">Previous Period</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Revenue:</span>
                    <span className="font-medium">
                      {formatCurrency(executiveSummary.period_comparison.previous_period?.revenue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expenses:</span>
                    <span className="font-medium">
                      {formatCurrency(executiveSummary.period_comparison.previous_period?.expenses || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Profit:</span>
                    <span className="font-medium">
                      {formatCurrency(executiveSummary.period_comparison.previous_period?.profit || 0)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-center">Variance</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Revenue:</span>
                    <span className={`font-medium ${(executiveSummary.period_comparison.variance?.revenue || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercentage(executiveSummary.period_comparison.variance?.revenue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expenses:</span>
                    <span className={`font-medium ${(executiveSummary.period_comparison.variance?.expenses || 0) <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercentage(executiveSummary.period_comparison.variance?.expenses || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Profit:</span>
                    <span className={`font-medium ${(executiveSummary.period_comparison.variance?.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercentage(executiveSummary.period_comparison.variance?.profit || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};