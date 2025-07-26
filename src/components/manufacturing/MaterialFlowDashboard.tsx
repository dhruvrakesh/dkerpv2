import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStageMaterialFlow } from '@/hooks/useStageMaterialFlow';
import { useMaterialRequirementCalculator } from '@/hooks/useMaterialRequirementCalculator';
import { ArrowRight, Package, AlertTriangle, TrendingUp, Factory } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MaterialFlowDashboardProps {
  orderId: string;
}

export function MaterialFlowDashboard({ orderId }: MaterialFlowDashboardProps) {
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const { setSelectedOrderId, orderRequirements, calculateMaterialFlow } = useMaterialRequirementCalculator();
  const { getStageMaterialCategories } = useStageMaterialFlow();

  // Set the order ID when component mounts
  React.useEffect(() => {
    setSelectedOrderId(orderId);
  }, [orderId, setSelectedOrderId]);

  const stageCategoriesQuery = getStageMaterialCategories(selectedStageId);
  const materialFlow = calculateMaterialFlow(orderRequirements || []);

  const getStageStatusColor = (stage: any) => {
    const hasShortages = stage.total_shortage_quantity > 0;
    const isComplete = stage.materials.every((m: any) => m.current_stock >= m.adjusted_quantity);
    
    if (isComplete) return 'bg-green-500';
    if (hasShortages) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const getStageStatusText = (stage: any) => {
    const hasShortages = stage.total_shortage_quantity > 0;
    const isComplete = stage.materials.every((m: any) => m.current_stock >= m.adjusted_quantity);
    
    if (isComplete) return 'Ready';
    if (hasShortages) return 'Shortages';
    return 'Partial';
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stages</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderRequirements?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Manufacturing stages</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Material Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{materialFlow?.total_unique_materials || 0}</div>
            <p className="text-xs text-muted-foreground">Unique materials required</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{materialFlow?.total_cost?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">Estimated material cost</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shortages</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{materialFlow?.total_shortage_items || 0}</div>
            <p className="text-xs text-muted-foreground">Items with shortages</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="flow" className="space-y-4">
        <TabsList>
          <TabsTrigger value="flow">Material Flow</TabsTrigger>
          <TabsTrigger value="stages">Stage Details</TabsTrigger>
          <TabsTrigger value="categories">Material Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="flow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manufacturing Stage Flow</CardTitle>
              <CardDescription>
                Material flow across all manufacturing stages for this order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orderRequirements?.map((stage, index) => (
                  <div key={stage.stage_id} className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        getStageStatusColor(stage)
                      )} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium">{stage.stage_name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {stage.total_materials} materials • ₹{stage.total_cost.toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={stage.total_shortage_quantity > 0 ? "destructive" : "default"}>
                          {getStageStatusText(stage)}
                        </Badge>
                      </div>
                      
                      {stage.total_shortage_quantity > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs">
                            <span>Material Availability</span>
                            <span>{Math.round(((stage.total_materials - stage.total_shortage_items) / stage.total_materials) * 100)}%</span>
                          </div>
                          <Progress 
                            value={((stage.total_materials - stage.total_shortage_items) / stage.total_materials) * 100} 
                            className="h-2 mt-1" 
                          />
                        </div>
                      )}
                    </div>
                    
                    {index < (orderRequirements?.length || 0) - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
              
              {materialFlow?.critical_path && materialFlow.critical_path.length > 0 && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h5 className="text-sm font-medium text-yellow-800 mb-2">Critical Path Items</h5>
                  <div className="space-y-1">
                    {materialFlow.critical_path.map((item, index) => (
                      <div key={index} className="text-xs text-yellow-700">
                        {item.component_item_name} - Shortage: {item.shortage_quantity} {item.uom}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stages" className="space-y-4">
          <div className="flex items-center space-x-4 mb-4">
            <Select value={selectedStageId} onValueChange={setSelectedStageId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a stage to view details" />
              </SelectTrigger>
              <SelectContent>
                {orderRequirements?.map((stage) => (
                  <SelectItem key={stage.stage_id} value={stage.stage_id}>
                    {stage.stage_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStageId && (
            <Card>
              <CardHeader>
                <CardTitle>Stage Material Requirements</CardTitle>
                <CardDescription>
                  Detailed material breakdown for the selected stage
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  const selectedStage = orderRequirements?.find(s => s.stage_id === selectedStageId);
                  if (!selectedStage) return <p>No stage selected</p>;

                  return (
                    <div className="space-y-4">
                      {selectedStage.materials.map((material) => (
                        <div key={material.item_code} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h5 className="font-medium">{material.item_name}</h5>
                              <Badge variant="outline">{material.material_category}</Badge>
                              {material.is_critical && (
                                <Badge variant="destructive" className="text-xs">Critical</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Required: {material.adjusted_quantity} {material.uom} • 
                              Stock: {material.current_stock} {material.uom}
                              {material.shortage_quantity > 0 && (
                                <span className="text-red-600 ml-2">
                                  Shortage: {material.shortage_quantity} {material.uom}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">₹{material.total_cost.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">
                              @₹{material.unit_cost}/{material.uom}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          {selectedStageId && stageCategoriesQuery.data && (
            <Card>
              <CardHeader>
                <CardTitle>Stage Material Categories</CardTitle>
                <CardDescription>
                  Material categories required for this stage type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stageCategoriesQuery.data.map((category) => (
                    <div key={category.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium">{category.category_name}</h5>
                        <Badge variant={category.is_required ? "default" : "secondary"}>
                          {category.is_required ? "Required" : "Optional"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Type: {category.category_type}</div>
                        <div>Waste Allowance: {category.waste_allowance_percentage}%</div>
                        <div>Allocation: {category.cost_allocation_method}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}