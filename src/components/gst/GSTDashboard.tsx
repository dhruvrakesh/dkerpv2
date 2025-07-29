import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Download, FileText, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useGSTAnalytics } from '@/hooks/useGSTAnalytics';
import { LoadingState } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';

export const GSTDashboard: React.FC = () => {
  const { 
    gstSummary, 
    compliance, 
    loading, 
    fetchGSTSummary, 
    fetchComplianceStatus,
    exportGSTData 
  } = useGSTAnalytics();
  
  const [dateRange, setDateRange] = useState('current_month');

  useEffect(() => {
    fetchGSTSummary();
    fetchComplianceStatus();
  }, []);

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    const now = new Date();
    let startDate: string | undefined;
    let endDate: string | undefined;

    switch (range) {
      case 'current_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        break;
      case 'quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        startDate = quarterStart.toISOString().split('T')[0];
        endDate = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0).toISOString().split('T')[0];
        break;
    }

    fetchGSTSummary(startDate, endDate);
  };

  if (loading && !gstSummary) {
    return <LoadingState message="Loading GST Dashboard..." />;
  }

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GST Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive GST management and compliance tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-[180px]">
              <CalendarIcon className="h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Current Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={() => gstSummary && exportGSTData('json', gstSummary)}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button 
            onClick={() => {
              fetchGSTSummary();
              fetchComplianceStatus();
            }}
            className="gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total GST Liability</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(gstSummary?.total_gst_liability || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Output tax on sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Input Tax Credit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(gstSummary?.total_input_tax_credit || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Available ITC
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net GST Payable</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(gstSummary?.net_gst_payable || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Amount to pay
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getComplianceColor(compliance?.compliance_score || 0)}`}>
              {compliance?.compliance_score || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall compliance rating
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* CGST/SGST/IGST Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Tax Component Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>CGST:</span>
                  <span className="font-medium">{formatCurrency(gstSummary?.cgst_amount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST:</span>
                  <span className="font-medium">{formatCurrency(gstSummary?.sgst_amount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IGST:</span>
                  <span className="font-medium">{formatCurrency(gstSummary?.igst_amount || 0)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Rate-wise Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>GST Rate-wise Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {gstSummary?.gst_rate_wise_breakdown?.map((rate: any, index: number) => (
                  <div key={index} className="flex justify-between">
                    <span>{rate.gst_rate}% GST:</span>
                    <span className="font-medium">{formatCurrency(rate.total_gst)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Upcoming Deadlines */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Deadlines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {compliance?.upcoming_deadlines?.map((deadline: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{deadline.deadline_type}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(deadline.due_date).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant={deadline.priority === 'high' ? 'destructive' : 'default'}>
                      {deadline.days_remaining} days
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="returns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>GST Returns Management</CardTitle>
              <CardDescription>
                Generate and manage GSTR-1, GSTR-3B returns automatically
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">GST Returns Generator</h3>
                <p className="text-muted-foreground mb-4">
                  Generate automated GST returns with one click
                </p>
                <div className="flex gap-2 justify-center">
                  <Button>Generate GSTR-1</Button>
                  <Button variant="outline">Generate GSTR-3B</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Tracking</CardTitle>
              <CardDescription>
                Monitor GST compliance and get recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recommendations */}
              <div>
                <h4 className="font-medium mb-3">Recommendations</h4>
                <div className="space-y-2">
                  {compliance?.recommendations?.map((rec: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div>
                        <div className="font-medium">{rec.category}</div>
                        <div className="text-sm text-muted-foreground">{rec.recommendation}</div>
                      </div>
                      <Badge variant="outline">{rec.priority}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Vendors by GST */}
            <Card>
              <CardHeader>
                <CardTitle>Top Vendors by Input Tax</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {gstSummary?.vendor_wise_gst?.slice(0, 5).map((vendor: any, index: number) => (
                  <div key={index} className="flex justify-between">
                    <span className="truncate">{vendor.vendor_name}</span>
                    <span className="font-medium">{formatCurrency(vendor.total_gst)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top Customers by GST */}
            <Card>
              <CardHeader>
                <CardTitle>Top Customers by Output Tax</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {gstSummary?.customer_wise_gst?.slice(0, 5).map((customer: any, index: number) => (
                  <div key={index} className="flex justify-between">
                    <span className="truncate">{customer.customer_name}</span>
                    <span className="font-medium">{formatCurrency(customer.total_gst)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};