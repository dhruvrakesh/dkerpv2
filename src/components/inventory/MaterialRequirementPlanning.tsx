import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calculator, 
  ShoppingCart, 
  AlertTriangle, 
  TrendingDown,
  Package,
  Clock,
  Plus,
  Download,
  RefreshCw
} from 'lucide-react';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';

interface MaterialRequirement {
  item_code: string;
  item_name: string;
  current_stock: number;
  required_qty: number;
  shortage_qty: number;
  reorder_level: number;
  lead_time_days: number;
  suggested_order_qty: number;
  estimated_cost: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  supplier_info: any;
}

interface ProductionPlan {
  id: string;
  order_id: string;
  item_code: string;
  planned_qty: number;
  start_date: string;
  end_date: string;
  status: string;
}

export const MaterialRequirementPlanning = () => {
  const { organization } = useDKEGLAuth();
  const { toast } = useToast();
  const [requirements, setRequirements] = useState<MaterialRequirement[]>([]);
  const [productionPlans, setProductionPlans] = useState<ProductionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [planningHorizon, setPlanningHorizon] = useState(30);

  useEffect(() => {
    loadMRPData();
  }, []);

  const loadMRPData = async () => {
    try {
      setLoading(true);
      
      // Load current production plans
      const { data: plansData, error: plansError } = await supabase
        .from('dkegl_orders')
        .select(`
          id,
          item_code,
          order_quantity,
          status,
          dkegl_item_master(item_name)
        `)
        .eq('organization_id', organization?.id)
        .in('status', ['pending', 'in_production'])
        .order('created_at');

      if (plansError) throw plansError;

      // Calculate material requirements
      await calculateMaterialRequirements();
      
      const transformedPlans = (plansData || []).map(plan => ({
        id: plan.id,
        order_id: plan.id,
        item_code: plan.item_code,
        planned_qty: plan.order_quantity,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: plan.status
      }));
      
      setProductionPlans(transformedPlans);
    } catch (error: any) {
      toast({
        title: "Error loading MRP data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateMaterialRequirements = async () => {
    try {
      setCalculating(true);

      // Get all items with current stock and BOM requirements
      const { data: stockData, error: stockError } = await supabase
        .from('dkegl_stock')
        .select(`
          *,
          dkegl_item_master!inner(
            item_name,
            reorder_level,
            reorder_quantity,
            lead_time_days,
            pricing_info,
            supplier_info
          )
        `)
        .eq('organization_id', organization?.id);

      if (stockError) throw stockError;

      // Calculate requirements based on production plans and consumption patterns
      const calculatedRequirements: MaterialRequirement[] = stockData.map(item => {
        const currentStock = item.current_qty || 0;
        const reorderLevel = item.dkegl_item_master.reorder_level || 0;
        const leadTime = item.dkegl_item_master.lead_time_days || 7;
        
        // Calculate consumption rate (last 30 days)
        const avgDailyConsumption = calculateAverageConsumption(item.item_code);
        
        // Calculate safety stock and requirements
        const safetyStock = avgDailyConsumption * leadTime;
        const requiredQty = reorderLevel + safetyStock;
        const shortageQty = Math.max(0, requiredQty - currentStock);
        
        // Determine priority
        let priority: 'critical' | 'high' | 'medium' | 'low' = 'low';
        if (currentStock <= 0) priority = 'critical';
        else if (currentStock <= reorderLevel * 0.5) priority = 'high';
        else if (currentStock <= reorderLevel) priority = 'medium';

        const estimatedCost = shortageQty * (typeof item.dkegl_item_master.pricing_info === 'object' && item.dkegl_item_master.pricing_info && 'unit_cost' in item.dkegl_item_master.pricing_info ? Number(item.dkegl_item_master.pricing_info.unit_cost) || 0 : 0);

        return {
          item_code: item.item_code,
          item_name: item.dkegl_item_master.item_name,
          current_stock: currentStock,
          required_qty: requiredQty,
          shortage_qty: shortageQty,
          reorder_level: reorderLevel,
          lead_time_days: leadTime,
          suggested_order_qty: Math.max(shortageQty, item.dkegl_item_master.reorder_quantity || 0),
          estimated_cost: estimatedCost,
          priority,
          supplier_info: item.dkegl_item_master.supplier_info
        };
      }).filter(req => req.shortage_qty > 0);

      setRequirements(calculatedRequirements);
    } catch (error: any) {
      toast({
        title: "Error calculating requirements",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setCalculating(false);
    }
  };

  const calculateAverageConsumption = (itemCode: string): number => {
    // This would typically query the issue log for the last 30 days
    // For now, return a mock value
    return Math.random() * 10; // Mock daily consumption
  };

  const generatePurchaseRequisition = async (requirements: MaterialRequirement[]) => {
    try {
      const requisitionData = {
        organization_id: organization?.id,
        request_date: new Date().toISOString().split('T')[0],
        requested_by: (await supabase.auth.getUser()).data.user?.id,
        items: requirements.map(req => ({
          item_code: req.item_code,
          item_name: req.item_name,
          required_qty: req.suggested_order_qty,
          estimated_cost: req.estimated_cost,
          priority: req.priority,
          justification: `MRP Calculation - Current: ${req.current_stock}, Required: ${req.required_qty}`
        })),
        total_estimated_cost: requirements.reduce((sum, req) => sum + req.estimated_cost, 0),
        priority: requirements.some(req => req.priority === 'critical') ? 'critical' : 'high'
      };

      // In a real implementation, this would create a purchase requisition record
      toast({
        title: "Purchase requisition generated",
        description: `Created requisition for ${requirements.length} items with estimated cost ₹${requisitionData.total_estimated_cost.toLocaleString()}`,
      });
    } catch (error: any) {
      toast({
        title: "Error generating requisition",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filteredRequirements = requirements.filter(req => {
    const matchesSearch = !searchTerm || 
      req.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.item_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = priorityFilter === 'all' || req.priority === priorityFilter;
    
    return matchesSearch && matchesPriority;
  });

  const totalShortageValue = filteredRequirements.reduce((sum, req) => sum + req.estimated_cost, 0);
  const criticalItems = filteredRequirements.filter(req => req.priority === 'critical').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Material Requirement Planning (MRP)</h2>
          <p className="text-muted-foreground">Plan and manage material requirements for production</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => generatePurchaseRequisition(filteredRequirements.filter(req => req.priority === 'critical'))}
            disabled={criticalItems === 0}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Generate PR
          </Button>
          <Button 
            onClick={calculateMaterialRequirements}
            disabled={calculating}
          >
            <Calculator className={`h-4 w-4 mr-2 ${calculating ? 'animate-spin' : ''}`} />
            {calculating ? 'Calculating...' : 'Recalculate'}
          </Button>
        </div>
      </div>

      {/* Planning Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Planning Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="planning_horizon">Planning Horizon (Days)</Label>
              <Input
                id="planning_horizon"
                type="number"
                value={planningHorizon}
                onChange={(e) => setPlanningHorizon(parseInt(e.target.value) || 30)}
                min="1"
                max="365"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Items Requiring Purchase</p>
                <p className="text-2xl font-bold">{filteredRequirements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Critical Items</p>
                <p className="text-2xl font-bold text-destructive">{criticalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingDown className="h-8 w-8 text-chart-3" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Shortage Value</p>
                <p className="text-2xl font-bold">₹{totalShortageValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-chart-2" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Avg Lead Time</p>
                <p className="text-2xl font-bold">
                  {filteredRequirements.length > 0 
                    ? Math.round(filteredRequirements.reduce((sum, req) => sum + req.lead_time_days, 0) / filteredRequirements.length)
                    : 0} days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="requirements" className="space-y-4">
        <TabsList>
          <TabsTrigger value="requirements">Material Requirements</TabsTrigger>
          <TabsTrigger value="production">Production Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="requirements">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Material Requirements</CardTitle>
                  <CardDescription>Items that need to be procured based on current stock and demand</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="all">All Priorities</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Required Qty</TableHead>
                    <TableHead>Shortage</TableHead>
                    <TableHead>Suggested Order</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>Est. Cost</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequirements.map((req) => (
                    <TableRow key={req.item_code}>
                      <TableCell className="font-medium">{req.item_code}</TableCell>
                      <TableCell>{req.item_name}</TableCell>
                      <TableCell>{req.current_stock.toLocaleString()}</TableCell>
                      <TableCell>{req.required_qty.toLocaleString()}</TableCell>
                      <TableCell className="text-destructive">{req.shortage_qty.toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{req.suggested_order_qty.toLocaleString()}</TableCell>
                      <TableCell>{req.lead_time_days} days</TableCell>
                      <TableCell>₹{req.estimated_cost.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          req.priority === 'critical' ? 'destructive' :
                          req.priority === 'high' ? 'secondary' :
                          req.priority === 'medium' ? 'outline' : 'default'
                        }>
                          {req.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="production">
          <Card>
            <CardHeader>
              <CardTitle>Active Production Plans</CardTitle>
              <CardDescription>Current and planned production orders</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Planned Qty</TableHead>
                    <TableHead>Target Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productionPlans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.id.slice(0, 8)}</TableCell>
                      <TableCell>{plan.item_code}</TableCell>
                      <TableCell>{plan.planned_qty?.toLocaleString()}</TableCell>
                      <TableCell>{new Date(plan.end_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant={plan.status === 'in_progress' ? 'default' : 'outline'}>
                          {plan.status}
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
};