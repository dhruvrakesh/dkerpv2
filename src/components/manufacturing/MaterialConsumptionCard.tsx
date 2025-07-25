import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useMaterialTracking } from '@/hooks/useMaterialTracking';
import { Package, TrendingUp, AlertTriangle, Calculator } from 'lucide-react';

interface MaterialConsumptionCardProps {
  workflowProgressId: string;
  stageName: string;
  orderId: string;
}

export const MaterialConsumptionCard: React.FC<MaterialConsumptionCardProps> = ({
  workflowProgressId,
  stageName,
  orderId
}) => {
  const {
    loading,
    trackMaterialConsumption,
    getMaterialConsumption,
    getWasteTracking,
    calculateStageCost,
    updateWasteTracking
  } = useMaterialTracking();

  const [materialData, setMaterialData] = useState({
    itemCode: '',
    plannedQty: 0,
    actualQty: 0,
    unitCost: 0,
    notes: ''
  });

  const [consumption, setConsumption] = useState<any[]>([]);
  const [wasteData, setWasteData] = useState<any[]>([]);
  const [stageCost, setStageCost] = useState(0);
  const [showAddMaterial, setShowAddMaterial] = useState(false);

  useEffect(() => {
    loadData();
  }, [workflowProgressId]);

  const loadData = async () => {
    try {
      const [consumptionData, wasteTracking, costData] = await Promise.all([
        getMaterialConsumption(workflowProgressId),
        getWasteTracking(workflowProgressId),
        calculateStageCost(workflowProgressId)
      ]);

      setConsumption(consumptionData);
      setWasteData(wasteTracking);
      setStageCost(costData || 0);
    } catch (error) {
      console.error('Error loading material data:', error);
    }
  };

  const handleAddMaterial = async () => {
    try {
      await trackMaterialConsumption(
        workflowProgressId,
        materialData.itemCode,
        materialData.plannedQty,
        materialData.actualQty,
        materialData.unitCost
      );

      // Reset form
      setMaterialData({
        itemCode: '',
        plannedQty: 0,
        actualQty: 0,
        unitCost: 0,
        notes: ''
      });
      setShowAddMaterial(false);
      
      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error adding material:', error);
    }
  };

  const calculateWastePercentage = () => {
    const totalPlanned = consumption.reduce((sum, item) => sum + item.planned_quantity, 0);
    const totalWaste = consumption.reduce((sum, item) => sum + item.waste_quantity, 0);
    return totalPlanned > 0 ? (totalWaste / totalPlanned) * 100 : 0;
  };

  const getTotalCost = () => {
    return consumption.reduce((sum, item) => sum + item.total_cost, 0);
  };

  const wastePercentage = calculateWastePercentage();
  const totalCost = getTotalCost();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Material Consumption - {stageName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cost Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-primary/5 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Total Cost</span>
            </div>
            <p className="text-2xl font-bold text-primary">${totalCost.toFixed(2)}</p>
          </div>
          
          <div className="bg-destructive/5 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Waste %</span>
            </div>
            <p className="text-2xl font-bold text-destructive">{wastePercentage.toFixed(1)}%</p>
          </div>
          
          <div className="bg-accent/20 p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent-foreground" />
              <span className="text-sm font-medium">Efficiency</span>
            </div>
            <p className="text-2xl font-bold text-accent-foreground">
              {(100 - wastePercentage).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Material List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Materials Used</h3>
            <Button
              onClick={() => setShowAddMaterial(!showAddMaterial)}
              variant="outline"
              size="sm"
            >
              {showAddMaterial ? 'Cancel' : 'Add Material'}
            </Button>
          </div>

          {showAddMaterial && (
            <Card className="p-4 bg-muted/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="itemCode">Item Code</Label>
                  <Input
                    id="itemCode"
                    value={materialData.itemCode}
                    onChange={(e) => setMaterialData(prev => ({ ...prev, itemCode: e.target.value }))}
                    placeholder="Enter item code"
                  />
                </div>
                
                <div>
                  <Label htmlFor="unitCost">Unit Cost ($)</Label>
                  <Input
                    id="unitCost"
                    type="number"
                    value={materialData.unitCost}
                    onChange={(e) => setMaterialData(prev => ({ ...prev, unitCost: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <Label htmlFor="plannedQty">Planned Quantity</Label>
                  <Input
                    id="plannedQty"
                    type="number"
                    value={materialData.plannedQty}
                    onChange={(e) => setMaterialData(prev => ({ ...prev, plannedQty: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <Label htmlFor="actualQty">Actual Quantity</Label>
                  <Input
                    id="actualQty"
                    type="number"
                    value={materialData.actualQty}
                    onChange={(e) => setMaterialData(prev => ({ ...prev, actualQty: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={materialData.notes}
                    onChange={(e) => setMaterialData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes..."
                    className="h-20"
                  />
                </div>
              </div>
              
              <div className="flex justify-end mt-4">
                <Button onClick={handleAddMaterial} disabled={loading || !materialData.itemCode}>
                  {loading ? 'Adding...' : 'Add Material'}
                </Button>
              </div>
            </Card>
          )}

          {consumption.length > 0 ? (
            <div className="space-y-3">
              {consumption.map((item) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{item.item_code}</h4>
                      <p className="text-sm text-muted-foreground">
                        Unit Cost: ${item.unit_cost.toFixed(2)}
                      </p>
                    </div>
                    <Badge variant={item.waste_quantity > 0 ? "destructive" : "secondary"}>
                      ${item.total_cost.toFixed(2)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Planned:</span>
                      <p className="font-medium">{item.planned_quantity}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Actual:</span>
                      <p className="font-medium">{item.actual_quantity}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Waste:</span>
                      <p className="font-medium text-destructive">{item.waste_quantity}</p>
                    </div>
                  </div>
                  
                  {item.waste_quantity > 0 && (
                    <div className="mt-2">
                      <Progress 
                        value={(item.waste_quantity / item.planned_quantity) * 100} 
                        className="h-2"
                      />
                      <p className="text-xs text-destructive mt-1">
                        {((item.waste_quantity / item.planned_quantity) * 100).toFixed(1)}% waste
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No materials tracked yet</p>
              <p className="text-sm">Add materials to track consumption and costs</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};