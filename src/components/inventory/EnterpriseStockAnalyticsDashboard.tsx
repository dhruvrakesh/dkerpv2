import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  TrendingDown,
  Package, 
  AlertTriangle,
  BarChart3,
  PieChart,
  Target,
  Timer,
  RefreshCw,
  Download
} from 'lucide-react';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';

interface StockAgingData {
  item_code: string;
  item_name: string;
  category_name: string;
  current_qty: number;
  last_movement_date: string;
  days_since_movement: number;
  aging_category: string;
  estimated_value: number;
}

interface ABCAnalysisData {
  item_code: string;
  item_name: string;
  annual_consumption_value: number;
  consumption_percentage: number;
  abc_category: 'A' | 'B' | 'C';
  movement_frequency: number;
}

interface ReorderAnalysis {
  item_code: string;
  item_name: string;
  current_qty: number;
  reorder_level: number;
  avg_monthly_consumption: number;
  recommended_order_qty: number;
  days_of_cover: number;
  status: 'critical' | 'low' | 'optimal' | 'excess';
}

interface StockMetrics {
  totalValue: number;
  totalItems: number;
  criticalItems: number;
  excessItems: number;
  stockTurnover: number;
  avgStockAge: number;
}

export function EnterpriseStockAnalyticsDashboard() {
  const { organization } = useDKEGLAuth();
  const { toast } = useToast();
  
  const [metrics, setMetrics] = useState<StockMetrics>({
    totalValue: 0,
    totalItems: 0,
    criticalItems: 0,
    excessItems: 0,
    stockTurnover: 0,
    avgStockAge: 0
  });
  
  const [agingData, setAgingData] = useState<StockAgingData[]>([]);
  const [abcAnalysis, setAbcAnalysis] = useState<ABCAnalysisData[]>([]);
  const [reorderAnalysis, setReorderAnalysis] = useState<ReorderAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (organization?.id) {
      loadAnalyticsData();
    }
  }, [organization?.id]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadStockMetrics(),
        loadStockAging(),
        loadABCAnalysis(),
        loadReorderAnalysis()
      ]);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load stock analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStockMetrics = async () => {
    const { data } = await supabase.rpc('dkegl_get_stock_metrics', {
      _org_id: organization?.id
    });
    
    if (data && data.length > 0) {
      const result = data[0];
      setMetrics({
        totalValue: result.total_value || 0,
        totalItems: result.total_items || 0,
        criticalItems: result.low_stock_count || 0,
        excessItems: 0, // Calculated separately
        stockTurnover: 0, // Placeholder
        avgStockAge: result.avg_stock_age || 0
      });
    }
  };

  const loadStockAging = async () => {
    const { data } = await supabase.rpc('dkegl_get_stock_aging', {
      _org_id: organization?.id
    });
    
    if (data) {
      setAgingData(data);
    }
  };

  const loadABCAnalysis = async () => {
    const { data } = await supabase.rpc('dkegl_analyze_consumption_patterns', {
      _org_id: organization?.id
    });
    
    if (data) {
      // Simulate ABC categorization based on consumption value
      const sortedData = data
        .sort((a, b) => b.avg_monthly_consumption - a.avg_monthly_consumption)
        .map((item, index, array) => {
          const percentile = (index / array.length) * 100;
          let abc_category: 'A' | 'B' | 'C' = 'C';
          
          if (percentile <= 20) abc_category = 'A';
          else if (percentile <= 50) abc_category = 'B';
          
          return {
            item_code: item.item_code,
            item_name: item.item_name,
            annual_consumption_value: item.avg_monthly_consumption * 12,
            consumption_percentage: percentile,
            abc_category,
            movement_frequency: item.avg_monthly_consumption
          };
        });
      
      setAbcAnalysis(sortedData);
    }
  };

  const loadReorderAnalysis = async () => {
    const { data } = await supabase.rpc('dkegl_analyze_consumption_patterns', {
      _org_id: organization?.id
    });
    
    if (data) {
      const reorderData = data.map(item => {
        const current_qty = 0; // Get from stock table
        const reorder_level = item.recommended_reorder_level || 0;
        const avg_monthly = item.avg_monthly_consumption || 0;
        const days_cover = avg_monthly > 0 ? (current_qty / (avg_monthly / 30)) : 999;
        
        let status: 'critical' | 'low' | 'optimal' | 'excess' = 'optimal';
        if (current_qty <= reorder_level * 0.5) status = 'critical';
        else if (current_qty <= reorder_level) status = 'low';
        else if (days_cover > 90) status = 'excess';
        
        return {
          item_code: item.item_code,
          item_name: item.item_name,
          current_qty,
          reorder_level,
          avg_monthly_consumption: avg_monthly,
          recommended_order_qty: item.recommended_reorder_quantity || 0,
          days_of_cover: Math.round(days_cover),
          status
        };
      });
      
      setReorderAnalysis(reorderData);
    }
  };

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
      case 'critical': return 'destructive';
      case 'low': return 'secondary';
      case 'optimal': return 'default';
      case 'excess': return 'outline';
      default: return 'secondary';
    }
  };

  const agingCategories = agingData.reduce((acc, item) => {
    if (!acc[item.aging_category]) acc[item.aging_category] = 0;
    acc[item.aging_category]++;
    return acc;
  }, {} as Record<string, number>);

  const abcBreakdown = abcAnalysis.reduce((acc, item) => {
    if (!acc[item.abc_category]) acc[item.abc_category] = { count: 0, value: 0 };
    acc[item.abc_category].count++;
    acc[item.abc_category].value += item.annual_consumption_value;
    return acc;
  }, {} as Record<string, { count: number; value: number }>);

  if (loading) {
    return (
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock Analytics</h1>
          <p className="text-muted-foreground">
            Enterprise-grade inventory analytics and insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadAnalyticsData} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{metrics.totalItems}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Items</p>
                <p className="text-2xl font-bold text-red-600">{metrics.criticalItems}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Stock Age</p>
                <p className="text-2xl font-bold">{Math.round(metrics.avgStockAge)} days</p>
              </div>
              <Timer className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stock Turnover</p>
                <p className="text-2xl font-bold">{metrics.stockTurnover.toFixed(1)}x</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Excess Items</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.excessItems}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="aging">Stock Aging</TabsTrigger>
          <TabsTrigger value="abc">ABC Analysis</TabsTrigger>
          <TabsTrigger value="reorder">Reorder Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Aging Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Stock Aging Distribution</CardTitle>
                <CardDescription>Items categorized by movement frequency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(agingCategories).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          category.includes('Fresh') ? 'bg-green-500' :
                          category.includes('Good') ? 'bg-blue-500' :
                          category.includes('Aging') ? 'bg-yellow-500' :
                          category.includes('Old') ? 'bg-orange-500' : 'bg-red-500'
                        }`} />
                        <span className="font-medium">{category}</span>
                      </div>
                      <Badge variant="secondary">{count} items</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ABC Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>ABC Analysis Summary</CardTitle>
                <CardDescription>Inventory classification by consumption value</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['A', 'B', 'C'].map(category => {
                    const data = abcBreakdown[category] || { count: 0, value: 0 };
                    const totalValue = Object.values(abcBreakdown).reduce((sum, item) => sum + item.value, 0);
                    const percentage = totalValue > 0 ? (data.value / totalValue) * 100 : 0;
                    
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Category {category}</span>
                          <div className="text-right">
                            <p className="text-sm">{data.count} items</p>
                            <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% value</p>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="aging" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Aging Analysis</CardTitle>
              <CardDescription>Items sorted by days since last movement</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Current Qty</TableHead>
                    <TableHead>Last Movement</TableHead>
                    <TableHead className="text-right">Days Idle</TableHead>
                    <TableHead>Aging Category</TableHead>
                    <TableHead className="text-right">Est. Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agingData.slice(0, 20).map((item) => (
                    <TableRow key={item.item_code}>
                      <TableCell className="font-medium">{item.item_code}</TableCell>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell>{item.category_name}</TableCell>
                      <TableCell className="text-right">{item.current_qty.toLocaleString()}</TableCell>
                      <TableCell>{new Date(item.last_movement_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">{item.days_since_movement}</TableCell>
                      <TableCell>
                        <Badge variant={
                          item.aging_category.includes('Fresh') ? 'default' :
                          item.aging_category.includes('Good') ? 'secondary' :
                          item.aging_category.includes('Aging') ? 'outline' :
                          'destructive'
                        }>
                          {item.aging_category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.estimated_value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abc" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>ABC Analysis Details</CardTitle>
              <CardDescription>Items classified by annual consumption value</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Annual Consumption</TableHead>
                    <TableHead className="text-right">Monthly Avg</TableHead>
                    <TableHead>ABC Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abcAnalysis.slice(0, 20).map((item) => (
                    <TableRow key={item.item_code}>
                      <TableCell className="font-medium">{item.item_code}</TableCell>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell>
                        <Badge variant={
                          item.abc_category === 'A' ? 'destructive' :
                          item.abc_category === 'B' ? 'default' : 'secondary'
                        }>
                          {item.abc_category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.annual_consumption_value)}</TableCell>
                      <TableCell className="text-right">{item.movement_frequency.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          item.abc_category === 'A' ? 'destructive' :
                          item.abc_category === 'B' ? 'default' : 'secondary'
                        }>
                          Category {item.abc_category}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reorder" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reorder Point Analysis</CardTitle>
              <CardDescription>Items requiring attention for procurement planning</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">Current Qty</TableHead>
                    <TableHead className="text-right">Reorder Level</TableHead>
                    <TableHead className="text-right">Monthly Consumption</TableHead>
                    <TableHead className="text-right">Days Cover</TableHead>
                    <TableHead className="text-right">Recommended Order</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reorderAnalysis.slice(0, 20).map((item) => (
                    <TableRow key={item.item_code}>
                      <TableCell className="font-medium">{item.item_code}</TableCell>
                      <TableCell>{item.item_name}</TableCell>
                      <TableCell className="text-right">{item.current_qty.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{item.reorder_level.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{item.avg_monthly_consumption.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{item.days_of_cover}</TableCell>
                      <TableCell className="text-right">{item.recommended_order_qty.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(item.status) as any}>
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}