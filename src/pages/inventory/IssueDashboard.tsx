import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InventoryLayout } from '@/components/layout/InventoryLayout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingDown, 
  Package2, 
  Building, 
  AlertTriangle,
  BarChart3,
  Calendar,
  FileText,
  Plus,
  Download,
  ArrowRight
} from 'lucide-react';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';
import { useEnterpriseExport } from '@/hooks/useEnterpriseExport';
import IssueManagement from './IssueManagement';

interface IssueMetrics {
  totalIssues: number;
  totalQuantity: number;
  monthlyIssues: number;
  monthlyQuantity: number;
  topDepartments: Array<{ name: string; count: number; quantity: number }>;
  topItems: Array<{ item_code: string; count: number; quantity: number }>;
  recentIssues: any[];
  consumptionTrends: any[];
}

export default function IssueDashboard() {
  const { organization } = useDKEGLAuth();
  const { toast } = useToast();
  const { exportData, isExporting } = useEnterpriseExport();
  const [metrics, setMetrics] = useState<IssueMetrics>({
    totalIssues: 0,
    totalQuantity: 0,
    monthlyIssues: 0,
    monthlyQuantity: 0,
    topDepartments: [],
    topItems: [],
    recentIssues: [],
    consumptionTrends: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (organization?.id) {
      loadMetrics();
    }
  }, [organization?.id]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      
      // Get total issue metrics
      const { data: totalData } = await supabase
        .from('dkegl_issue_log')
        .select('qty_issued, department, purpose, created_at, item_code')
        .eq('organization_id', organization?.id)
        .order('created_at', { ascending: false });

      if (totalData) {
        const totalIssues = totalData.length;
        const totalQuantity = totalData.reduce((sum, issue) => sum + (issue.qty_issued || 0), 0);
        
        // Monthly metrics
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyData = totalData.filter(issue => 
          issue.created_at?.startsWith(currentMonth)
        );
        const monthlyIssues = monthlyData.length;
        const monthlyQuantity = monthlyData.reduce((sum, issue) => sum + (issue.qty_issued || 0), 0);
        
        // Department analysis
        const departmentStats = totalData.reduce((acc, issue) => {
          if (!issue.department) return acc;
          if (!acc[issue.department]) {
            acc[issue.department] = { count: 0, quantity: 0 };
          }
          acc[issue.department].count++;
          acc[issue.department].quantity += issue.qty_issued || 0;
          return acc;
        }, {} as Record<string, { count: number; quantity: number }>);
        
        const topDepartments = Object.entries(departmentStats)
          .map(([name, stats]) => ({ name, ...stats }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5);

        // Item analysis
        const itemStats = totalData.reduce((acc, issue) => {
          if (!issue.item_code) return acc;
          if (!acc[issue.item_code]) {
            acc[issue.item_code] = { count: 0, quantity: 0 };
          }
          acc[issue.item_code].count++;
          acc[issue.item_code].quantity += issue.qty_issued || 0;
          return acc;
        }, {} as Record<string, { count: number; quantity: number }>);
        
        const topItems = Object.entries(itemStats)
          .map(([item_code, stats]) => ({ item_code, ...stats }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5);

        setMetrics({
          totalIssues,
          totalQuantity,
          monthlyIssues,
          monthlyQuantity,
          topDepartments,
          topItems,
          recentIssues: totalData.slice(0, 10),
          consumptionTrends: [] // Placeholder for future implementation
        });
      }
    } catch (error) {
      console.error('Error loading issue metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load issue metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    if (!organization?.id) return;
    
    await exportData('issue', 'excel', {
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 90 days
      endDate: new Date().toISOString().split('T')[0]
    }, organization.id);
  };

  if (loading) {
    return (
      <InventoryLayout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </InventoryLayout>
    );
  }

  return (
    <InventoryLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Issue Management</h1>
            <p className="text-muted-foreground">
              Material consumption tracking and analytics
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportReport}
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export Report'}
            </Button>
            <Button size="sm" onClick={() => setActiveTab('management')}>
              <Plus className="h-4 w-4 mr-2" />
              New Issue
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="management">Issue Management</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Issues</p>
                      <p className="text-2xl font-bold">{metrics.totalIssues}</p>
                    </div>
                    <Package2 className="h-8 w-8 text-primary" />
                  </div>
                  <div className="mt-2 flex items-center text-sm">
                    <TrendingDown className="h-4 w-4 text-orange-500 mr-1" />
                    <span className="text-orange-500">+{metrics.monthlyIssues} this month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Quantity</p>
                      <p className="text-2xl font-bold">{metrics.totalQuantity.toLocaleString()}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-primary" />
                  </div>
                  <div className="mt-2 flex items-center text-sm">
                    <TrendingDown className="h-4 w-4 text-orange-500 mr-1" />
                    <span className="text-orange-500">{metrics.monthlyQuantity.toLocaleString()} this month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Departments</p>
                      <p className="text-2xl font-bold">{metrics.topDepartments.length}</p>
                    </div>
                    <Building className="h-8 w-8 text-primary" />
                  </div>
                  <div className="mt-2 flex items-center text-sm">
                    <span className="text-muted-foreground">Consuming materials</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Daily Issues</p>
                      <p className="text-2xl font-bold">{Math.round(metrics.monthlyIssues / 30)}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-primary" />
                  </div>
                  <div className="mt-2 flex items-center text-sm">
                    <span className="text-muted-foreground">Based on monthly data</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Department and Item Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Consuming Departments</CardTitle>
                  <CardDescription>Departments with highest material consumption</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metrics.topDepartments.map((dept, index) => (
                      <div key={dept.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{dept.name}</p>
                            <p className="text-sm text-muted-foreground">{dept.count} issues</p>
                          </div>
                        </div>
                        <p className="font-medium">{dept.quantity.toLocaleString()} units</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Most Issued Items</CardTitle>
                  <CardDescription>Items with highest consumption rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metrics.topItems.map((item, index) => (
                      <div key={item.item_code} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{item.item_code}</p>
                            <p className="text-sm text-muted-foreground">{item.count} issues</p>
                          </div>
                        </div>
                        <p className="font-medium">{item.quantity.toLocaleString()} units</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Issues */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Issues</CardTitle>
                <CardDescription>Latest material issues and consumption</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.recentIssues.slice(0, 8).map((issue) => (
                    <div key={issue.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Package2 className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{issue.item_code}</p>
                          <p className="text-sm text-muted-foreground">{issue.department} • {issue.purpose}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{issue.qty_issued} units</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(issue.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Consumption Analytics</CardTitle>
                <CardDescription>Detailed consumption patterns and trends coming soon...</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Advanced consumption analytics dashboard under development</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="management">
            <IssueManagement />
          </TabsContent>
        </Tabs>
      </div>
    </InventoryLayout>
  );
}