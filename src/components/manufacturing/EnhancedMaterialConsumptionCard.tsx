import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, Plus, Package, AlertTriangle, TrendingUp, Zap, Clock, CheckCircle2, BarChart3, Activity } from 'lucide-react';
import { useMaterialTracking } from '@/hooks/useMaterialTracking';
import { useMaterialRequirementCalculator } from '@/hooks/useMaterialRequirementCalculator';
import { useStageMaterialFlow } from '@/hooks/useStageMaterialFlow';

interface EnhancedMaterialConsumptionCardProps {
  workflowProgressId: string;
  stageName: string;
  orderId: string;
  stageId?: string;
}

export const EnhancedMaterialConsumptionCard: React.FC<EnhancedMaterialConsumptionCardProps> = ({
  workflowProgressId,
  stageName,
  orderId,
  stageId
}) => {
  // State management
  const [materialInput, setMaterialInput] = useState({
    itemCode: '',
    plannedQty: 0,
    actualQty: 0,
    unitCost: 0,
    materialCategory: '',
    inputType: 'fresh_material' as 'fresh_material' | 'bom_component' | 'substrate_carryforward'
  });
  const [consumptionData, setConsumptionData] = useState([]);
  const [wasteData, setWasteData] = useState([]);
  const [stageCost, setStageCost] = useState(0);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [materialCategories, setMaterialCategories] = useState([]);
  const [materialBalance, setMaterialBalance] = useState({
    totalIncoming: 0,
    totalConsumed: 0,
    totalOutgoing: 0,
    variance: 0
  });

  // Hooks
  const {
    trackMaterialConsumption,
    getMaterialConsumption,
    getWasteTracking,
    calculateStageCost
  } = useMaterialTracking();

  const {
    setSelectedOrderId,
    setSelectedStageId,
    stageRequirements,
    isLoadingRequirements
  } = useMaterialRequirementCalculator();

  const {
    getStageMaterialInputs,
    getStageMaterialOutputs,
    addMaterialInput,
    getStageMaterialCategories
  } = useStageMaterialFlow();

  // Effects
  useEffect(() => {
    if (orderId && stageId) {
      setSelectedOrderId(orderId);
      setSelectedStageId(stageId);
      loadData();
      loadMaterialCategories();
    }
  }, [orderId, stageId, setSelectedOrderId, setSelectedStageId]);

  // Data loading functions
  const loadData = async () => {
    try {
      const [consumption, waste, cost, inputs, outputs] = await Promise.all([
        getMaterialConsumption(workflowProgressId),
        getWasteTracking(workflowProgressId),
        calculateStageCost(workflowProgressId),
        getStageMaterialInputs(workflowProgressId),
        getStageMaterialOutputs(workflowProgressId)
      ]);
      
      setConsumptionData(consumption || []);
      setWasteData(waste || []);
      setStageCost(cost || 0);
      
      // Calculate material balance
      const totalIncoming = Array.isArray(inputs) ? inputs.reduce((sum, input) => sum + (input.actual_quantity || 0), 0) : 0;
      const totalConsumed = Array.isArray(consumption) ? consumption.reduce((sum, cons) => sum + (cons.actual_quantity || 0), 0) : 0;
      const totalOutgoing = Array.isArray(outputs) ? outputs.reduce((sum, output) => sum + (output.actual_quantity || 0), 0) : 0;
      
      setMaterialBalance({
        totalIncoming,
        totalConsumed,
        totalOutgoing,
        variance: totalIncoming - totalConsumed - totalOutgoing
      });
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadMaterialCategories = async () => {
    if (stageId) {
      try {
        const categories = await getStageMaterialCategories(stageId);
        setMaterialCategories(Array.isArray(categories) ? categories : []);
      } catch (error) {
        console.error('Error loading material categories:', error);
      }
    }
  };

  // Action handlers
  const handleAddMaterial = async () => {
    try {
      // Track consumption
      await trackMaterialConsumption(
        workflowProgressId,
        materialInput.itemCode,
        materialInput.plannedQty,
        materialInput.actualQty,
        materialInput.unitCost
      );
      
      setMaterialInput({
        itemCode: '',
        plannedQty: 0,
        actualQty: 0,
        unitCost: 0,
        materialCategory: '',
        inputType: 'fresh_material'
      });
      
      setShowAddMaterial(false);
      loadData();
    } catch (error) {
      console.error('Error adding material:', error);
    }
  };

  const handleUseBOMSuggestion = (suggestion) => {
    setMaterialInput({
      itemCode: suggestion.item_code,
      plannedQty: suggestion.adjusted_quantity,
      actualQty: suggestion.adjusted_quantity,
      unitCost: suggestion.unit_cost || 0,
      materialCategory: suggestion.material_category || '',
      inputType: 'bom_component'
    });
    setShowAddMaterial(true);
    setActiveTab('overview');
  };

  // Utility functions
  const calculateWastePercentage = (planned, actual) => {
    if (planned === 0) return 0;
    return Math.max(0, ((actual - planned) / planned) * 100);
  };

  const getTotalCost = () => {
    return consumptionData.reduce((total, item) => total + (item.total_cost || 0), 0);
  };

  const getVarianceAnalysis = (item) => {
    const stageReq = stageRequirements?.materials?.find(req => req.item_code === item.item_code);
    if (!stageReq) return null;
    
    const plannedDiff = item.planned_quantity - stageReq.adjusted_quantity;
    const actualDiff = item.actual_quantity - stageReq.adjusted_quantity;
    
    return {
      bomPlanned: stageReq.adjusted_quantity,
      actualPlanned: item.planned_quantity,
      actualUsed: item.actual_quantity,
      plannedVariance: plannedDiff,
      actualVariance: actualDiff,
      plannedVariancePercent: stageReq.adjusted_quantity ? (plannedDiff / stageReq.adjusted_quantity) * 100 : 0,
      actualVariancePercent: stageReq.adjusted_quantity ? (actualDiff / stageReq.adjusted_quantity) * 100 : 0
    };
  };

  const getStageSpecificTemplates = () => {
    const templates = {
      'Gravure Printing': [
        { itemCode: 'INK_CYAN_001', name: 'Cyan Process Ink', qty: 0.5, category: 'inks' },
        { itemCode: 'INK_BLACK_001', name: 'Black Process Ink', qty: 0.3, category: 'inks' },
        { itemCode: 'SOLVENT_PG_001', name: 'Propylene Glycol Solvent', qty: 0.2, category: 'solvents' },
        { itemCode: 'CLEANER_IPA_001', name: 'IPA Cleaner', qty: 0.1, category: 'cleaning_agents' }
      ],
      'Lamination Coating': [
        { itemCode: 'ADHV_PU_001', name: 'Polyurethane Adhesive', qty: 0.3, category: 'adhesives' },
        { itemCode: 'PRIMER_001', name: 'Adhesion Primer', qty: 0.1, category: 'primers' },
        { itemCode: 'CATALYST_001', name: 'Curing Catalyst', qty: 0.05, category: 'catalysts' }
      ],
      'Adhesive Coating': [
        { itemCode: 'ADHV_SPEC_001', name: 'Specialized PSA', qty: 0.4, category: 'specialized_adhesives' },
        { itemCode: 'ACTIVATOR_001', name: 'Adhesive Activator', qty: 0.1, category: 'activators' },
        { itemCode: 'RELEASE_PAPER_001', name: 'Release Paper', qty: 1.0, category: 'release_papers' }
      ],
      'Slitting Packaging': [
        { itemCode: 'CORE_76MM_001', name: '76mm Paper Core', qty: 2, category: 'cores' },
        { itemCode: 'STRETCH_WRAP_001', name: 'Stretch Wrap', qty: 0.1, category: 'stretch_wrap' },
        { itemCode: 'CARTON_SMALL_001', name: 'Small Carton', qty: 1, category: 'cartons' }
      ]
    };
    
    return templates[stageName] || [];
  };

  const overallWastePercent = calculateWastePercentage(
    consumptionData.reduce((sum, item) => sum + item.planned_quantity, 0), 
    consumptionData.reduce((sum, item) => sum + item.actual_quantity, 0)
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Enhanced Material Consumption - {stageName}
        </CardTitle>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="flex flex-col">
            <span className="text-muted-foreground">Total Cost</span>
            <span className="font-semibold text-xl">${getTotalCost().toFixed(2)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Material Balance</span>
            <span className={`font-semibold text-lg ${Math.abs(materialBalance.variance) > 0.1 ? 'text-orange-600' : 'text-green-600'}`}>
              {materialBalance.variance >= 0 ? '+' : ''}{materialBalance.variance.toFixed(2)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Waste %</span>
            <span className="font-semibold text-lg text-red-600">
              {overallWastePercent.toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground">Efficiency</span>
            <span className="font-semibold text-lg text-green-600">
              {Math.max(0, 100 - overallWastePercent).toFixed(1)}%
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bom">BOM Suggestions</TabsTrigger>
            <TabsTrigger value="quick-add">Quick Add</TabsTrigger>
            <TabsTrigger value="variance">Variance Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Real-time Material Balance */}
            <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{materialBalance.totalIncoming.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Incoming Materials</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{materialBalance.totalConsumed.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Consumed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{materialBalance.totalOutgoing.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Outgoing</div>
              </div>
            </div>

            {/* Material Categories Overview */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Available Material Categories</h4>
              <div className="grid grid-cols-3 gap-2">
                {materialCategories.map((category) => (
                  <Badge key={category.id} variant="outline" className="justify-center py-2">
                    {category.category_name}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bom" className="space-y-4">
            {/* BOM Suggestions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  BOM Material Requirements
                </h4>
                <Badge variant="outline">{stageRequirements?.materials?.length || 0} materials</Badge>
              </div>
              {isLoadingRequirements ? (
                <div className="text-center py-4 text-muted-foreground">Loading BOM suggestions...</div>
              ) : stageRequirements?.materials?.length > 0 ? (
                stageRequirements.materials.map((req, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-accent/50">
                    <div className="flex-1">
                      <div className="font-medium">{req.item_code}</div>
                      <div className="text-sm text-muted-foreground">
                        Required: {req.adjusted_quantity} {req.uom || 'units'} | 
                        Cost: ${req.total_cost?.toFixed(2) || '0.00'}
                        {req.shortage_quantity > 0 && (
                          <span className="text-red-600 ml-1">
                            Short: {req.shortage_quantity}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={req.shortage_quantity > 0 ? "destructive" : "secondary"}>
                        {req.shortage_quantity > 0 ? "Short" : "Available"}
                      </Badge>
                      <Button 
                        size="sm" 
                        onClick={() => handleUseBOMSuggestion(req)}
                        disabled={req.shortage_quantity > 0}
                      >
                        Use
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">No BOM suggestions available</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="quick-add" className="space-y-4">
            {/* Stage-Specific Quick Add Templates */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Quick Add Templates for {stageName}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {getStageSpecificTemplates().map((template, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="h-auto p-3 text-left flex-col items-start"
                    onClick={() => {
                      setMaterialInput({
                        itemCode: template.itemCode,
                        plannedQty: template.qty,
                        actualQty: template.qty,
                        unitCost: 0,
                        materialCategory: template.category,
                        inputType: 'fresh_material'
                      });
                      setShowAddMaterial(true);
                      setActiveTab('overview');
                    }}
                  >
                    <div className="font-medium text-xs">{template.itemCode}</div>
                    <div className="text-xs text-muted-foreground">{template.name}</div>
                    <div className="text-xs text-blue-600">{template.qty} units</div>
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="variance" className="space-y-4">
            {/* Variance Analysis */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                BOM vs Actual Variance Analysis
              </h4>
              {consumptionData.map((item, index) => {
                const variance = getVarianceAnalysis(item);
                if (!variance) return null;
                
                return (
                  <div key={index} className="p-3 border rounded-lg space-y-2">
                    <div className="font-medium">{item.item_code}</div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">BOM Standard</div>
                        <div className="font-medium">{variance.bomPlanned.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Planned</div>
                        <div className={`font-medium ${Math.abs(variance.plannedVariancePercent) > 10 ? 'text-orange-600' : 'text-green-600'}`}>
                          {variance.actualPlanned.toFixed(2)} ({variance.plannedVariancePercent > 0 ? '+' : ''}{variance.plannedVariancePercent.toFixed(1)}%)
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Actual Used</div>
                        <div className={`font-medium ${Math.abs(variance.actualVariancePercent) > 15 ? 'text-red-600' : 'text-green-600'}`}>
                          {variance.actualUsed.toFixed(2)} ({variance.actualVariancePercent > 0 ? '+' : ''}{variance.actualVariancePercent.toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Enhanced Add Material Form */}
        <Collapsible open={showAddMaterial} onOpenChange={setShowAddMaterial} className="mt-4">
          <CollapsibleTrigger asChild>
            <Button className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Material
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4 p-4 border rounded-lg bg-accent/30">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inputType">Input Type</Label>
                <Select value={materialInput.inputType} onValueChange={(value) => setMaterialInput({...materialInput, inputType: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select input type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fresh_material">Fresh Material</SelectItem>
                    <SelectItem value="bom_component">BOM Component</SelectItem>
                    <SelectItem value="substrate_carryforward">Carried Forward</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="materialCategory">Material Category</Label>
                <Select value={materialInput.materialCategory} onValueChange={(value) => setMaterialInput({...materialInput, materialCategory: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {materialCategories.map((category) => (
                      <SelectItem key={category.id} value={category.category_name}>
                        {category.category_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="itemCode">Item Code</Label>
                <Input
                  id="itemCode"
                  value={materialInput.itemCode}
                  onChange={(e) => setMaterialInput({...materialInput, itemCode: e.target.value})}
                  placeholder="Enter item code"
                />
              </div>
              <div>
                <Label htmlFor="plannedQty">Planned Quantity</Label>
                <Input
                  id="plannedQty"
                  type="number"
                  value={materialInput.plannedQty}
                  onChange={(e) => setMaterialInput({...materialInput, plannedQty: parseFloat(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="actualQty">Actual Quantity</Label>
                <Input
                  id="actualQty"
                  type="number"
                  value={materialInput.actualQty}
                  onChange={(e) => setMaterialInput({...materialInput, actualQty: parseFloat(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="unitCost">Unit Cost</Label>
                <Input
                  id="unitCost"
                  type="number"
                  step="0.01"
                  value={materialInput.unitCost}
                  onChange={(e) => setMaterialInput({...materialInput, unitCost: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddMaterial} disabled={!materialInput.itemCode || !materialInput.materialCategory}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Add Material
              </Button>
              <Button variant="outline" onClick={() => setShowAddMaterial(false)}>
                Cancel
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Enhanced Material List */}
        <div className="space-y-3 mt-6">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Tracked Materials</h4>
            <Badge variant="outline">{consumptionData.length} items</Badge>
          </div>
          {consumptionData.length > 0 ? (
            consumptionData.map((item, index) => {
              const wastePercent = calculateWastePercentage(item.planned_quantity, item.actual_quantity);
              const stageReq = stageRequirements?.materials?.find(req => req.item_code === item.item_code);
              const variance = getVarianceAnalysis(item);
              
              return (
                <div key={index} className="p-4 border rounded-lg space-y-3 bg-gradient-to-r from-slate-50 to-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-lg">{item.item_code}</div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Planned: {item.planned_quantity} | Actual: {item.actual_quantity}</div>
                        {stageReq && (
                          <div className="text-blue-600">
                            BOM Standard: {stageReq.adjusted_quantity} 
                            {variance && (
                              <span className={`ml-2 ${Math.abs(variance.actualVariancePercent) > 15 ? 'text-red-600' : 'text-green-600'}`}>
                                ({variance.actualVariancePercent > 0 ? '+' : ''}{variance.actualVariancePercent.toFixed(1)}% vs BOM)
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">
                            {item.material_category || 'uncategorized'}
                          </Badge>
                          <Badge variant="outline">
                            {item.input_type || 'unknown'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="font-bold text-xl">${item.total_cost?.toFixed(2) || '0.00'}</div>
                      <Badge 
                        variant={wastePercent > 15 ? "destructive" : wastePercent > 10 ? "default" : wastePercent > 5 ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        Waste: {wastePercent.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  {wastePercent > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Waste Progress</span>
                        <span>{wastePercent.toFixed(1)}% of planned</span>
                      </div>
                      <Progress 
                        value={Math.min(wastePercent, 100)} 
                        className={`h-2 ${wastePercent > 15 ? 'bg-red-100' : wastePercent > 10 ? 'bg-orange-100' : 'bg-yellow-100'}`} 
                      />
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <Package className="h-12 w-12 mx-auto opacity-50" />
              <div className="text-lg">No materials tracked yet</div>
              <div className="text-sm">Add materials using the form above, BOM suggestions, or quick-add templates</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};