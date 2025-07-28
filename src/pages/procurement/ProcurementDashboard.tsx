import React from 'react';
import { InventoryLayout } from '@/components/layout/InventoryLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useProcurementAnalytics } from '@/hooks/useProcurementAnalytics';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText
} from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const ProcurementDashboard = () => {
  const { 
    analytics,
    spendByPeriod,
    spendByVendor,
    topPerformers,
    loading
  } = useProcurementAnalytics();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <InventoryLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Procurement Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive view of vendor performance and procurement analytics
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.total_vendors || 0}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">{analytics?.active_vendors || 0}</span> active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics?.total_spend || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg: {formatCurrency(analytics?.average_order_value || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPercentage(analytics?.on_time_delivery_rate || 0)}
              </div>
              <Progress 
                value={analytics?.on_time_delivery_rate || 0} 
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active RFQs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.pending_rfqs || 0}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-blue-600">{analytics?.active_pos || 0}</span> active POs
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Spend by Period */}
          <Card>
            <CardHeader>
              <CardTitle>Spend Trend</CardTitle>
              <CardDescription>Monthly procurement spend over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={spendByPeriod}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Vendors by Spend */}
          <Card>
            <CardHeader>
              <CardTitle>Top Vendors by Spend</CardTitle>
              <CardDescription>Highest spending vendors this period</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={spendByVendor.slice(0, 5)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                  <YAxis dataKey="vendor_name" type="category" width={100} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Bar dataKey="amount" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Vendor Performance & Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Top Performing Vendors */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Top Performing Vendors</CardTitle>
              <CardDescription>Based on delivery, quality, and pricing scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPerformers.slice(0, 5).map((vendor, index) => (
                  <div key={vendor.vendor_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{vendor.vendor_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {vendor.total_orders} orders • {formatCurrency(vendor.total_order_value)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {vendor.overall_score.toFixed(1)}/5
                      </Badge>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>D: {vendor.delivery_score.toFixed(1)}</div>
                        <div>Q: {vendor.quality_score.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common procurement tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Create RFQ</span>
                </div>
                <Badge variant="outline">Quick</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <Users className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Add Vendor</span>
                </div>
                <Badge variant="outline">New</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <ShoppingCart className="h-4 w-4 text-purple-600" />
                  <span className="font-medium">Create PO</span>
                </div>
                <Badge variant="outline">Order</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                  <span className="font-medium">View Reports</span>
                </div>
                <Badge variant="outline">Analytics</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Procurement Activity</CardTitle>
            <CardDescription>Latest updates across procurement workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium">PO #PO-2024-001 approved</p>
                  <p className="text-sm text-muted-foreground">Order for Raw Materials - ABC Manufacturing</p>
                </div>
                <Badge variant="secondary">2h ago</Badge>
              </div>
              
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <div className="flex-1">
                  <p className="font-medium">RFQ #RFQ-2024-015 responses due</p>
                  <p className="text-sm text-muted-foreground">3 vendors yet to respond - Packaging Materials</p>
                </div>
                <Badge variant="outline">Due today</Badge>
              </div>
              
              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                <Users className="h-4 w-4 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium">New vendor approved</p>
                  <p className="text-sm text-muted-foreground">XYZ Chemicals Ltd - Adhesives & Chemicals</p>
                </div>
                <Badge variant="secondary">1d ago</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </InventoryLayout>
  );
};