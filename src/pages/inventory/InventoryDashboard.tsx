import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { 
  Package, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  BarChart3,
  FileText,
  ArrowRight,
  Warehouse,
  Calendar,
  DollarSign
} from 'lucide-react';

interface DashboardData {
  totalItems: number;
  totalStockValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  recentGrns: any[];
  recentIssues: any[];
  topMovingItems: any[];
  stockAlerts: any[];
}

export default function InventoryDashboard() {
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalItems: 0,
    totalStockValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    recentGrns: [],
    recentIssues: [],
    topMovingItems: [],
    stockAlerts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get current user's organization
      const { data: userProfile } = await supabase
        .from('dkegl_user_profiles')
        .select('organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!userProfile?.organization_id) {
        throw new Error('Organization not found');
      }

      // Load stock summary
      const { data: stockData, error: stockError } = await supabase
        .from('dkegl_stock')
        .select(`
          *,
          dkegl_item_master!fk_stock_item_master(
            item_name,
            reorder_level,
            dkegl_categories(category_name)
          )
        `)
        .eq('organization_id', userProfile.organization_id);

      if (stockError) throw stockError;

      // Calculate stock metrics
      const totalItems = stockData?.length || 0;
      const totalStockValue = stockData?.reduce((sum, item) => sum + (item.current_qty * (item.unit_cost || 0)), 0) || 0;
      const lowStockItems = stockData?.filter(item => 
        item.current_qty <= (item.dkegl_item_master?.reorder_level || 0) && item.current_qty > 0
      ).length || 0;
      const outOfStockItems = stockData?.filter(item => item.current_qty <= 0).length || 0;

      // Stock alerts
      const stockAlerts = stockData?.filter(item => 
        item.current_qty <= (item.dkegl_item_master?.reorder_level || 0)
      ).map(item => ({
        ...item,
        item_name: item.dkegl_item_master?.item_name,
        category_name: item.dkegl_item_master?.dkegl_categories?.category_name,
        reorder_level: item.dkegl_item_master?.reorder_level
      })).slice(0, 10) || [];

      // Recent GRNs
      const { data: grnData, error: grnError } = await supabase
        .from('dkegl_grn_log')
        .select(`
          *,
          dkegl_item_master!fk_grn_item_master(item_name)
        `)
        .eq('organization_id', userProfile.organization_id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (grnError) throw grnError;

      const recentGrns = grnData?.map(grn => ({
        ...grn,
        item_name: grn.dkegl_item_master?.item_name
      })) || [];

      // Recent Issues
      const { data: issueData, error: issueError } = await supabase
        .from('dkegl_issue_log')
        .select(`
          *,
          dkegl_item_master!fk_issue_item_master(item_name)
        `)
        .eq('organization_id', userProfile.organization_id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (issueError) throw issueError;

      const recentIssues = issueData?.map(issue => ({
        ...issue,
        item_name: issue.dkegl_item_master?.item_name
      })) || [];

      // Top moving items (simplified - based on recent issues)
      const topMovingItems = issueData?.reduce((acc, issue) => {
        const existing = acc.find(item => item.item_code === issue.item_code);
        if (existing) {
          existing.total_issued += issue.qty_issued;
        } else {
          acc.push({
            item_code: issue.item_code,
            item_name: issue.dkegl_item_master?.item_name,
            total_issued: issue.qty_issued
          });
        }
        return acc;
      }, [] as any[])?.sort((a, b) => b.total_issued - a.total_issued).slice(0, 5) || [];

      setDashboardData({
        totalItems,
        totalStockValue,
        lowStockItems,
        outOfStockItems,
        recentGrns,
        recentIssues,
        topMovingItems,
        stockAlerts
      });

    } catch (error: any) {
      toast({
        title: "Error loading dashboard data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStockStatusColor = (currentQty: number, reorderLevel: number) => {
    if (currentQty <= 0) return 'destructive';
    if (currentQty <= reorderLevel) return 'warning';
    return 'default';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your inventory operations and stock levels
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/inventory/stock">
              <Warehouse className="h-4 w-4 mr-2" />
              Manage Stock
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-semibold">{dashboardData.totalItems.toLocaleString()}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stock Value</p>
                <p className="text-2xl font-semibold">₹{dashboardData.totalStockValue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-semibold text-yellow-600">{dashboardData.lowStockItems}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-semibold text-red-600">{dashboardData.outOfStockItems}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent GRNs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Recent GRNs
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/inventory/grn">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GRN Number</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.recentGrns.map((grn) => (
                    <TableRow key={grn.id}>
                      <TableCell className="font-mono text-sm">{grn.grn_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{grn.item_code}</div>
                          <div className="text-sm text-muted-foreground">{grn.item_name}</div>
                        </div>
                      </TableCell>
                      <TableCell>+{grn.qty_received.toLocaleString()}</TableCell>
                      <TableCell>{new Date(grn.date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {dashboardData.recentGrns.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No recent GRNs found
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Issues */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Recent Issues
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/inventory/issues">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.recentIssues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{issue.item_code}</div>
                          <div className="text-sm text-muted-foreground">{issue.item_name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-red-600">-{issue.qty_issued.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{issue.department}</Badge>
                      </TableCell>
                      <TableCell>{new Date(issue.date).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {dashboardData.recentIssues.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No recent issues found
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stock Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardData.stockAlerts.map((alert) => (
                <div 
                  key={alert.id}
                  className="p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{alert.item_code}</div>
                      <div className="text-xs text-muted-foreground">{alert.item_name}</div>
                      <div className="text-xs mt-1">
                        Stock: {alert.current_qty} | Reorder: {alert.reorder_level}
                      </div>
                    </div>
                    <Badge variant={getStockStatusColor(alert.current_qty, alert.reorder_level) as any} className="text-xs">
                      {alert.current_qty <= 0 ? 'Out' : 'Low'}
                    </Badge>
                  </div>
                </div>
              ))}
              {dashboardData.stockAlerts.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No stock alerts
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Moving Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Top Moving Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardData.topMovingItems.map((item, index) => (
                <div key={item.item_code} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{item.item_code}</div>
                      <div className="text-xs text-muted-foreground">{item.item_name}</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium">{item.total_issued.toLocaleString()}</div>
                </div>
              ))}
              {dashboardData.topMovingItems.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  No movement data
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/inventory/items">
                  <Package className="h-4 w-4 mr-2" />
                  Manage Items
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/inventory/grn">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Create GRN
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/inventory/issues">
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Issue Items
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/inventory/stock">
                  <Warehouse className="h-4 w-4 mr-2" />
                  Stock Overview
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}