import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingUp, TrendingDown, Package, DollarSign, Clock, RefreshCw } from 'lucide-react';
import { useAdvancedStockAnalytics } from '@/hooks/useAdvancedStockAnalytics';
import { useToast } from '@/hooks/use-toast';
import { StockMovementChart } from '@/components/analytics/StockMovementChart';
import { StockAgingChart } from '@/components/analytics/StockAgingChart';
import { cn } from '@/lib/utils';

export const EnhancedStockAnalyticsDashboard = () => {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  
  const {
    realTimeStock,
    stockLoading,
    agingAnalysis,
    agingLoading,
    reorderRecommendations,
    reorderLoading,
    getStockMovements,
    calculateABCAnalysis,
    calculateValuationMetrics,
    setRefreshInterval,
  } = useAdvancedStockAnalytics();

  const [stockMovements, setStockMovements] = useState<any[]>([]);
  const [abcAnalysis, setAbcAnalysis] = useState<any[]>([]);
  const [valuationMetrics, setValuationMetrics] = useState<any>(null);

  // Load additional data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [movements, abc, valuation] = await Promise.all([
          getStockMovements(undefined, 30),
          calculateABCAnalysis(),
          calculateValuationMetrics(),
        ]);
        
        setStockMovements(movements);
        setAbcAnalysis(abc);
        setValuationMetrics(valuation);
      } catch (error) {
        toast({
          title: "Error Loading Analytics",
          description: "Failed to load some analytics data. Please try again.",
          variant: "destructive",
        });
      }
    };

    loadData();
  }, [refreshKey, getStockMovements, calculateABCAnalysis, calculateValuationMetrics, toast]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Calculate summary metrics
  const totalStockValue = realTimeStock?.reduce((sum, item) => sum + item.total_value, 0) || 0;
  const criticalStockItems = realTimeStock?.filter(item => item.critical_stock).length || 0;
  const totalItems = realTimeStock?.length || 0;

  const criticalRecommendations = reorderRecommendations?.filter(
    item => item.urgency === 'critical'
  ).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stock Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time inventory insights and recommendations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={stockLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", stockLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{totalStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {totalItems} items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Items below reorder level
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reorder Alerts</CardTitle>
            <Package className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{criticalRecommendations}</div>
            <p className="text-xs text-muted-foreground">
              Critical reorder recommendations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Stock Age</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agingAnalysis?.length 
                ? Math.round(agingAnalysis.reduce((sum, item) => sum + item.days_since_movement, 0) / agingAnalysis.length)
                : 0
              } days
            </div>
            <p className="text-xs text-muted-foreground">
              Average days since last movement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
          <TabsTrigger value="aging">Aging Analysis</TabsTrigger>
          <TabsTrigger value="abc">ABC Analysis</TabsTrigger>
          <TabsTrigger value="reorder">Reorder</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Real-time Stock Levels */}
            <Card>
              <CardHeader>
                <CardTitle>Real-time Stock Levels</CardTitle>
                <CardDescription>Current inventory status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {stockLoading ? (
                    <div className="text-center py-8">Loading stock data...</div>
                  ) : realTimeStock?.slice(0, 10).map((item) => (
                    <div key={item.item_code} className="flex items-center justify-between py-2 border-b">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground">{item.item_code}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{item.current_qty.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          ₹{item.total_value.toLocaleString('en-IN')}
                        </div>
                        {item.critical_stock && (
                          <Badge variant="destructive" className="text-xs">Critical</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Valuation Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Valuation Breakdown</CardTitle>
                <CardDescription>Inventory valuation by method</CardDescription>
              </CardHeader>
              <CardContent>
                {valuationMetrics ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Standard Cost</span>
                        <span className="font-medium">
                          ₹{valuationMetrics.method_breakdown.standard_cost_value.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Weighted Average</span>
                        <span className="font-medium">
                          ₹{valuationMetrics.method_breakdown.weighted_avg_value.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">FIFO</span>
                        <span className="font-medium">
                          ₹{valuationMetrics.method_breakdown.fifo_value.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Cost Variance</span>
                        <span className={cn(
                          "font-medium",
                          valuationMetrics.variance_analysis.cost_variance > 0 ? "text-warning" : "text-green-600"
                        )}>
                          ₹{valuationMetrics.variance_analysis.cost_variance.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">Loading valuation data...</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Movement Analysis</CardTitle>
              <CardDescription>Track inventory transactions and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <StockMovementChart data={stockMovements} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Aging Analysis</CardTitle>
              <CardDescription>Identify slow-moving and dead stock</CardDescription>
            </CardHeader>
            <CardContent>
              {agingLoading ? (
                <div className="text-center py-8">Loading aging analysis...</div>
              ) : (
                <StockAgingChart data={agingAnalysis || []} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abc" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ABC Analysis</CardTitle>
              <CardDescription>Categorize items by value and usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {abcAnalysis.slice(0, 20).map((item) => (
                  <div key={item.item_code} className="flex items-center justify-between py-2 border-b">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{item.item_name}</p>
                      <p className="text-xs text-muted-foreground">{item.control_strategy}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge 
                        variant={
                          item.abc_category === 'A' ? 'destructive' :
                          item.abc_category === 'B' ? 'secondary' : 'outline'
                        }
                      >
                        {item.abc_category}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        {item.usage_percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reorder" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reorder Recommendations</CardTitle>
              <CardDescription>Smart reorder suggestions based on consumption patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reorderLoading ? (
                  <div className="text-center py-8">Loading recommendations...</div>
                ) : reorderRecommendations?.map((item) => (
                  <div key={item.item_code} className="flex items-center justify-between py-3 border rounded-lg px-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{item.item_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Avg consumption: {item.avg_consumption.toFixed(1)}/month
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge 
                        variant={
                          item.urgency === 'critical' ? 'destructive' :
                          item.urgency === 'high' ? 'secondary' :
                          item.urgency === 'medium' ? 'outline' : 'outline'
                        }
                      >
                        {item.urgency}
                      </Badge>
                      <div className="text-sm font-medium">
                        Recommend: {item.recommended_qty.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};