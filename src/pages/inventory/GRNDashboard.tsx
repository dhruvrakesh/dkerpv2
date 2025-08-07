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
  TrendingUp, 
  Package, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  BarChart3,
  Calendar,
  FileText,
  Plus,
  Download
} from 'lucide-react';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';
import { useEnterpriseExport } from '@/hooks/useEnterpriseExport';
import GRNManagement from './GRNManagement';

interface GRNMetrics {
  totalGRNs: number;
  totalValue: number;
  monthlyGRNs: number;
  monthlyValue: number;
  avgProcessingTime: number;
  qualityFailureRate: number;
  topSuppliers: Array<{ name: string; count: number; value: number }>;
  recentGRNs: any[];
}

export default function GRNDashboard() {
  const { organization } = useDKEGLAuth();
  const { toast } = useToast();
  const { exportData, isExporting } = useEnterpriseExport();
  const [metrics, setMetrics] = useState<GRNMetrics>({
    totalGRNs: 0,
    totalValue: 0,
    monthlyGRNs: 0,
    monthlyValue: 0,
    avgProcessingTime: 0,
    qualityFailureRate: 0,
    topSuppliers: [],
    recentGRNs: []
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
      
      // Get total GRN metrics
      const { data: totalData } = await supabase
        .from('dkegl_grn_log')
        .select('qty_received, unit_rate, total_amount, quality_status, created_at, supplier_name')
        .eq('organization_id', organization?.id)
        .order('created_at', { ascending: false });

      if (totalData) {
        const totalGRNs = totalData.length;
        const totalValue = totalData.reduce((sum, grn) => sum + (grn.total_amount || 0), 0);
        
        // Monthly metrics
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyData = totalData.filter(grn => 
          grn.created_at?.startsWith(currentMonth)
        );
        const monthlyGRNs = monthlyData.length;
        const monthlyValue = monthlyData.reduce((sum, grn) => sum + (grn.total_amount || 0), 0);
        
        // Quality metrics
        const qualityFailures = totalData.filter(grn => grn.quality_status === 'failed').length;
        const qualityFailureRate = totalGRNs > 0 ? (qualityFailures / totalGRNs) * 100 : 0;
        
        // Top suppliers
        const supplierStats = totalData.reduce((acc, grn) => {
          if (!grn.supplier_name) return acc;
          if (!acc[grn.supplier_name]) {
            acc[grn.supplier_name] = { count: 0, value: 0 };
          }
          acc[grn.supplier_name].count++;
          acc[grn.supplier_name].value += grn.total_amount || 0;
          return acc;
        }, {} as Record<string, { count: number; value: number }>);
        
        const topSuppliers = Object.entries(supplierStats)
          .map(([name, stats]) => ({ name, ...stats }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        setMetrics({
          totalGRNs,
          totalValue,
          monthlyGRNs,
          monthlyValue,
          avgProcessingTime: 2.5, // Placeholder
          qualityFailureRate,
          topSuppliers,
          recentGRNs: totalData.slice(0, 10)
        });
      }
    } catch (error) {
      console.error('Error loading GRN metrics:', error);
      toast({
        title: "Error",
        description: "Failed to load GRN metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    if (!organization?.id) return;
    
    await exportData('grn', 'excel', {
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 90 days
      endDate: new Date().toISOString().split('T')[0]
    }, organization.id);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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
            <h1 className="text-3xl font-bold tracking-tight">GRN Management</h1>
            <p className="text-muted-foreground">
              Goods Receipt Note processing and analytics
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
              New GRN
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="management">GRN Management</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total GRNs</p>
                      <p className="text-2xl font-bold">{metrics.totalGRNs}</p>
                    </div>
                    <Package className="h-8 w-8 text-primary" />
                  </div>
                  <div className="mt-2 flex items-center text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-500">+{metrics.monthlyGRNs} this month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                      <p className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-primary" />
                  </div>
                  <div className="mt-2 flex items-center text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-green-500">{formatCurrency(metrics.monthlyValue)} this month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Quality Pass Rate</p>
                      <p className="text-2xl font-bold">{(100 - metrics.qualityFailureRate).toFixed(1)}%</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <Progress value={100 - metrics.qualityFailureRate} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Processing Time</p>
                      <p className="text-2xl font-bold">{metrics.avgProcessingTime} days</p>
                    </div>
                    <Clock className="h-8 w-8 text-primary" />
                  </div>
                  <div className="mt-2 flex items-center text-sm">
                    <span className="text-muted-foreground">Industry avg: 3.2 days</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Suppliers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Suppliers by Value</CardTitle>
                  <CardDescription>Most valuable supplier partnerships</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metrics.topSuppliers.map((supplier, index) => (
                      <div key={supplier.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{supplier.name}</p>
                            <p className="text-sm text-muted-foreground">{supplier.count} GRNs</p>
                          </div>
                        </div>
                        <p className="font-medium">{formatCurrency(supplier.value)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent GRNs</CardTitle>
                  <CardDescription>Latest goods receipt notes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.recentGRNs.slice(0, 5).map((grn) => (
                      <div key={grn.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{grn.item_code}</p>
                          <p className="text-sm text-muted-foreground">{grn.supplier_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(grn.total_amount || 0)}</p>
                          <Badge 
                            variant={
                              grn.quality_status === 'approved' ? 'default' :
                              grn.quality_status === 'failed' ? 'destructive' : 'secondary'
                            }
                            className="text-xs"
                          >
                            {grn.quality_status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>GRN Analytics</CardTitle>
                <CardDescription>Detailed analytics and trends coming soon...</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Advanced analytics dashboard under development</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="management">
            <GRNManagement />
          </TabsContent>
        </Tabs>
      </div>
    </InventoryLayout>
  );
}