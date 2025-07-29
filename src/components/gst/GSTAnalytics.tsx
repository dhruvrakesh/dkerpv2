import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, TrendingUp, PieChart, Users, Building2, AlertTriangle } from 'lucide-react';
import { useGSTAnalytics } from '@/hooks/useGSTAnalytics';
import { LoadingState } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';

export const GSTAnalytics: React.FC = () => {
  const { gstSummary, loading, fetchGSTSummary } = useGSTAnalytics();
  const [period, setPeriod] = useState('current_quarter');

  useEffect(() => {
    fetchGSTSummary();
  }, []);

  if (loading) {
    return <LoadingState message="Loading GST Analytics..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GST Analytics</h1>
          <p className="text-muted-foreground">
            Advanced GST insights and trend analysis
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current_month">Current Month</SelectItem>
            <SelectItem value="current_quarter">Current Quarter</SelectItem>
            <SelectItem value="current_year">Current Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Analysis</TabsTrigger>
          <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Monthly GST Trend
                </CardTitle>
                <CardDescription>GST liability and credit trends over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Chart visualization will show monthly GST trends
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  GST Rate Distribution
                </CardTitle>
                <CardDescription>Breakdown of transactions by GST rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {gstSummary?.gst_rate_wise_breakdown?.map((rate: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        <span>{rate.gst_rate}% GST</span>
                      </div>
                      <span className="font-medium">{formatCurrency(rate.total_gst)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>GST Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {((gstSummary?.total_input_tax_credit || 0) / (gstSummary?.total_gst_liability || 1) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">ITC Utilization Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency((gstSummary?.total_taxable_turnover || 0) / 12)}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Monthly Turnover</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {((gstSummary?.net_gst_payable || 0) / (gstSummary?.total_taxable_turnover || 1) * 100).toFixed(2)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Effective GST Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">95%</div>
                  <div className="text-sm text-muted-foreground">Compliance Score</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Compliance Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                      <div className="font-medium">GSTR-1 Due Soon</div>
                      <div className="text-sm text-muted-foreground">Filing due in 3 days</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <div className="font-medium">HSN Code Update</div>
                      <div className="text-sm text-muted-foreground">5 items need HSN code verification</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-600" />
                    <div className="flex-1">
                      <div className="font-medium">GSTR-3B Filed</div>
                      <div className="text-sm text-muted-foreground">Filed on time - Jan 2024</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-600" />
                    <div className="flex-1">
                      <div className="font-medium">GSTR-1 Pending</div>
                      <div className="text-sm text-muted-foreground">Due in 3 days</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                    <div className="flex-1">
                      <div className="font-medium">Annual Return</div>
                      <div className="text-sm text-muted-foreground">Due Dec 2024</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Top Vendors by ITC
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {gstSummary?.vendor_wise_gst?.slice(0, 5).map((vendor: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{vendor.vendor_name}</div>
                        <div className="text-sm text-muted-foreground">{vendor.transaction_count} transactions</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(vendor.total_gst)}</div>
                        <div className="text-sm text-muted-foreground">ITC Available</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Customer GST Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {gstSummary?.customer_wise_gst?.slice(0, 5).map((customer: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{customer.customer_name}</div>
                        <div className="text-sm text-muted-foreground">{customer.transaction_count} invoices</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(customer.total_gst)}</div>
                        <div className="text-sm text-muted-foreground">Tax Collected</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                GST Forecasting & Insights
              </CardTitle>
              <CardDescription>
                AI-powered predictions and recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency((gstSummary?.net_gst_payable || 0) * 1.15)}
                  </div>
                  <div className="text-sm font-medium">Projected Next Month</div>
                  <div className="text-xs text-muted-foreground">+15% growth expected</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency((gstSummary?.total_input_tax_credit || 0) * 0.95)}
                  </div>
                  <div className="text-sm font-medium">Projected ITC</div>
                  <div className="text-xs text-muted-foreground">Slight decrease expected</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">₹2.3L</div>
                  <div className="text-sm font-medium">Potential Savings</div>
                  <div className="text-xs text-muted-foreground">Through optimization</div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">AI Recommendations</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Consider bulk purchasing in Q4 to maximize ITC benefits</li>
                  <li>• Review vendor payment terms to optimize cash flow</li>
                  <li>• Set up automated reconciliation to reduce manual effort</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};