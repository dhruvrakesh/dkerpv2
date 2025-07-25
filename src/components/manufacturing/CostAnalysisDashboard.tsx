import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMaterialTracking } from '@/hooks/useMaterialTracking';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  DollarSign,
  BarChart3,
  PieChart,
  Target
} from 'lucide-react';

interface OrderCostData {
  orderId: string;
  orderNumber: string;
  itemName: string;
  stages: Array<{
    stage_name: string;
    material_cost: number;
    labor_cost: number;
    overhead_cost: number;
    total_stage_cost: number;
    waste_percentage: number;
    efficiency_percentage: number;
  }>;
  totalCost: number;
  totalWaste: number;
  avgEfficiency: number;
}

export const CostAnalysisDashboard: React.FC = () => {
  const { organization } = useDKEGLAuth();
  const { getOrderCostSummary } = useMaterialTracking();
  const [selectedOrder, setSelectedOrder] = useState<string>('');
  const [costData, setCostData] = useState<OrderCostData[]>([]);

  // Fetch orders with cost data
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders-with-costs', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from('dkegl_orders')
        .select(`
          id,
          order_number,
          item_name,
          status,
          created_at
        `)
        .eq('organization_id', organization.id)
        .in('status', ['in_production', 'completed'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: !!organization?.id
  });

  useEffect(() => {
    if (orders.length > 0 && !selectedOrder) {
      setSelectedOrder(orders[0].id);
    }
  }, [orders]);

  useEffect(() => {
    loadCostData();
  }, [selectedOrder]);

  const loadCostData = async () => {
    if (!selectedOrder) return;

    try {
      const costSummary = await getOrderCostSummary(selectedOrder);
      
      const orderData: OrderCostData = {
        orderId: selectedOrder,
        orderNumber: orders.find(o => o.id === selectedOrder)?.order_number || '',
        itemName: orders.find(o => o.id === selectedOrder)?.item_name || '',
        stages: costSummary,
        totalCost: costSummary.reduce((sum, stage) => sum + stage.total_stage_cost, 0),
        totalWaste: costSummary.reduce((sum, stage) => sum + stage.waste_percentage, 0) / costSummary.length,
        avgEfficiency: costSummary.reduce((sum, stage) => sum + stage.efficiency_percentage, 0) / costSummary.length
      };

      setCostData([orderData]);
    } catch (error) {
      console.error('Error loading cost data:', error);
    }
  };

  const currentOrderData = costData.find(order => order.orderId === selectedOrder);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Cost Analysis Dashboard</h2>
          <p className="text-muted-foreground">Track manufacturing costs and efficiency</p>
        </div>
      </div>

      {/* Order Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Select Order for Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedOrder}
            onChange={(e) => setSelectedOrder(e.target.value)}
            className="w-full p-2 border rounded-md"
          >
            <option value="">Select an order...</option>
            {orders.map(order => (
              <option key={order.id} value={order.id}>
                {order.order_number} - {order.item_name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {currentOrderData && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stages">Stage Breakdown</TabsTrigger>
            <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
            <TabsTrigger value="waste">Waste Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Cost</p>
                      <p className="text-2xl font-bold text-primary">
                        ${currentOrderData.totalCost.toFixed(2)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Efficiency</p>
                      <p className="text-2xl font-bold text-primary">
                        {currentOrderData.avgEfficiency.toFixed(1)}%
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Waste</p>
                      <p className="text-2xl font-bold text-destructive">
                        {currentOrderData.totalWaste.toFixed(1)}%
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Stages</p>
                      <p className="text-2xl font-bold text-accent-foreground">
                        {currentOrderData.stages.length}
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-accent-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Cost Breakdown Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentOrderData.stages.map((stage, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{stage.stage_name}</span>
                        <Badge variant="outline">${stage.total_stage_cost.toFixed(2)}</Badge>
                      </div>
                      <Progress 
                        value={(stage.total_stage_cost / currentOrderData.totalCost) * 100} 
                        className="h-2"
                      />
                      <div className="grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                        <span>Material: ${stage.material_cost.toFixed(2)}</span>
                        <span>Labor: ${stage.labor_cost.toFixed(2)}</span>
                        <span>Overhead: ${stage.overhead_cost.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stages" className="space-y-4">
            <div className="grid gap-4">
              {currentOrderData.stages.map((stage, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-lg">{stage.stage_name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Material Cost</p>
                        <p className="text-xl font-bold text-blue-600">
                          ${stage.material_cost.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Labor Cost</p>
                        <p className="text-xl font-bold text-green-600">
                          ${stage.labor_cost.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Overhead</p>
                        <p className="text-xl font-bold text-purple-600">
                          ${stage.overhead_cost.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-xl font-bold text-primary">
                          ${stage.total_stage_cost.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="efficiency" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Efficiency by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentOrderData.stages.map((stage, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{stage.stage_name}</span>
                        <Badge variant={stage.efficiency_percentage >= 90 ? "default" : "secondary"}>
                          {stage.efficiency_percentage.toFixed(1)}%
                        </Badge>
                      </div>
                      <Progress 
                        value={stage.efficiency_percentage} 
                        className="h-3"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="waste" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Waste Analysis by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentOrderData.stages.map((stage, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{stage.stage_name}</span>
                        <Badge variant={stage.waste_percentage > 5 ? "destructive" : "secondary"}>
                          {stage.waste_percentage.toFixed(1)}% waste
                        </Badge>
                      </div>
                      <Progress 
                        value={Math.min(stage.waste_percentage, 100)} 
                        className="h-3"
                      />
                      {stage.waste_percentage > 10 && (
                        <p className="text-xs text-destructive">
                          ⚠️ High waste detected - investigate root causes
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};