import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDKEGLAuth } from './useDKEGLAuth';

interface MaterialRequirement {
  component_item_code: string;
  component_item_name: string;
  planned_quantity: number;
  unit_cost: number;
  total_cost: number;
  waste_percentage: number;
  adjusted_quantity: number;
  consumption_type: 'direct' | 'indirect' | 'byproduct';
  is_critical: boolean;
  available_stock: number;
  shortage_quantity: number;
  stage_sequence: number;
  // Extended properties for material flow
  item_code: string;
  item_name: string;
  material_category: string;
  current_stock: number;
  uom: string;
}

interface StageRequirement {
  stage_id: string;
  stage_name: string;
  sequence_order: number;
  materials: MaterialRequirement[];
  total_cost: number;
  total_shortage: number;
  // Extended properties for enhanced tracking
  total_materials: number;
  total_shortage_quantity: number;
  total_shortage_items: number;
}

export const useMaterialRequirementCalculator = () => {
  const { organization } = useDKEGLAuth();
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedStageId, setSelectedStageId] = useState<string>('');

  // Get material requirements for a stage based on order and BOM
  const { data: stageRequirements, isLoading: isLoadingRequirements } = useQuery({
    queryKey: ['stage-material-requirements', organization?.id, selectedOrderId, selectedStageId],
    queryFn: async () => {
      if (!organization?.id || !selectedOrderId || !selectedStageId) return null;

      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('dkegl_orders')
        .select('*')
        .eq('id', selectedOrderId)
        .eq('organization_id', organization.id)
        .single();

      if (orderError) throw orderError;

      // Get BOM components for this stage
      const { data: bomComponents, error: bomError } = await supabase
        .from('dkegl_bom_components')
        .select(`
          *,
          dkegl_bom_master!inner (
            id,
            item_code,
            yield_percentage,
            scrap_percentage
          )
        `)
        .eq('dkegl_bom_master.organization_id', organization.id)
        .eq('dkegl_bom_master.item_code', order.item_code)
        .eq('dkegl_bom_master.is_active', true)
        .eq('stage_id', selectedStageId);

      if (bomError) throw bomError;

      // Get additional item and stage info
      const { data: itemData } = await supabase
        .from('dkegl_item_master')
        .select('item_code, item_name, pricing_info')
        .eq('organization_id', organization.id)
        .in('item_code', bomComponents.map(c => c.component_item_code));

      const { data: stageData } = await supabase
        .from('dkegl_workflow_stages')
        .select('id, stage_name, sequence_order')
        .eq('id', selectedStageId);

      // Get current stock levels
      const itemCodes = bomComponents.map(comp => comp.component_item_code);
      const { data: stockData } = await supabase
        .from('dkegl_stock')
        .select('item_code, current_qty, available_qty')
        .eq('organization_id', organization.id)
        .in('item_code', itemCodes);

      // Get current pricing
      const { data: pricingData } = await supabase
        .from('dkegl_pricing_master')
        .select('item_code, standard_cost')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .eq('approval_status', 'approved')
        .in('item_code', itemCodes);

      // Calculate requirements
      const requirements: MaterialRequirement[] = bomComponents.map(comp => {
        const stock = stockData?.find(s => s.item_code === comp.component_item_code);
        const pricing = pricingData?.find(p => p.item_code === comp.component_item_code);
        const itemInfo = itemData?.find(i => i.item_code === comp.component_item_code);
        
        // Base quantity calculation
        const baseQuantity = comp.quantity_per_unit * order.order_quantity;
        
        // Apply waste percentage
        const wasteMultiplier = 1 + (comp.waste_percentage / 100);
        const adjustedQuantity = baseQuantity * wasteMultiplier;
        
        // Calculate costs
        const unitCost = pricing?.standard_cost || 
                        (itemInfo?.pricing_info as any)?.unit_cost || 0;
        const totalCost = adjustedQuantity * unitCost;
        
        // Calculate shortages
        const availableStock = stock?.available_qty || stock?.current_qty || 0;
        const shortageQuantity = Math.max(0, adjustedQuantity - availableStock);

        return {
          component_item_code: comp.component_item_code,
          component_item_name: itemInfo?.item_name || comp.component_item_code,
          planned_quantity: baseQuantity,
          unit_cost: unitCost,
          total_cost: totalCost,
          waste_percentage: comp.waste_percentage,
          adjusted_quantity: adjustedQuantity,
          consumption_type: comp.consumption_type as 'direct' | 'indirect' | 'byproduct',
          is_critical: comp.is_critical,
          available_stock: availableStock,
          shortage_quantity: shortageQuantity,
          stage_sequence: comp.stage_sequence,
          // Extended properties
          item_code: comp.component_item_code,
          item_name: itemInfo?.item_name || comp.component_item_code,
          material_category: comp.material_category || 'raw_material',
          current_stock: availableStock,
          uom: 'PCS', // Should be fetched from item master
        };
      });

      return {
        stage_id: selectedStageId,
        stage_name: stageData?.[0]?.stage_name || 'Unknown Stage',
        sequence_order: stageData?.[0]?.sequence_order || 0,
        materials: requirements,
        total_cost: requirements.reduce((sum, req) => sum + req.total_cost, 0),
        total_shortage: requirements.reduce((sum, req) => sum + req.shortage_quantity, 0),
        total_materials: requirements.length,
        total_shortage_quantity: requirements.reduce((sum, req) => sum + req.shortage_quantity, 0),
        total_shortage_items: requirements.filter(req => req.shortage_quantity > 0).length,
      } as StageRequirement;
    },
    enabled: !!organization?.id && !!selectedOrderId && !!selectedStageId,
  });

  // Get all stage requirements for an order
  const { data: orderRequirements, isLoading: isLoadingOrderRequirements } = useQuery({
    queryKey: ['order-material-requirements', organization?.id, selectedOrderId],
    queryFn: async () => {
      if (!organization?.id || !selectedOrderId) return [];

      // Get order details
      const { data: order, error: orderError } = await supabase
        .from('dkegl_orders')
        .select('*')
        .eq('id', selectedOrderId)
        .eq('organization_id', organization.id)
        .single();

      if (orderError) throw orderError;

      // Get all workflow stages for this order
      const { data: workflowStages, error: stagesError } = await supabase
        .from('dkegl_workflow_stages')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('sequence_order');

      if (stagesError) throw stagesError;

      // Get BOM components grouped by stage
      const { data: bomComponents, error: bomError } = await supabase
        .from('dkegl_bom_components')
        .select(`
          *,
          dkegl_bom_master!inner (
            id,
            item_code,
            yield_percentage,
            scrap_percentage
          )
        `)
        .eq('dkegl_bom_master.organization_id', organization.id)
        .eq('dkegl_bom_master.item_code', order.item_code)
        .eq('dkegl_bom_master.is_active', true);

      if (bomError) throw bomError;

      // Group components by stage
      const stageRequirements: StageRequirement[] = [];
      
      for (const stage of workflowStages) {
        const stageComponents = bomComponents.filter(comp => comp.stage_id === stage.id);
        
        if (stageComponents.length > 0) {
          // Get stock and pricing data for this stage's components
          const itemCodes = stageComponents.map(comp => comp.component_item_code);
          
          const [stockData, pricingData] = await Promise.all([
            supabase
              .from('dkegl_stock')
              .select('item_code, current_qty, available_qty')
              .eq('organization_id', organization.id)
              .in('item_code', itemCodes)
              .then(res => res.data || []),
            supabase
              .from('dkegl_pricing_master')
              .select('item_code, standard_cost')
              .eq('organization_id', organization.id)
              .eq('is_active', true)
              .eq('approval_status', 'approved')
              .in('item_code', itemCodes)
              .then(res => res.data || [])
          ]);

          // Get item data for this stage's components
          const { data: itemData } = await supabase
            .from('dkegl_item_master')
            .select('item_code, item_name, pricing_info')
            .eq('organization_id', organization.id)
            .in('item_code', itemCodes);

          const requirements: MaterialRequirement[] = stageComponents.map(comp => {
            const stock = stockData.find(s => s.item_code === comp.component_item_code);
            const pricing = pricingData.find(p => p.item_code === comp.component_item_code);
            const itemInfo = itemData?.find(i => i.item_code === comp.component_item_code);
            
            const baseQuantity = comp.quantity_per_unit * order.order_quantity;
            const wasteMultiplier = 1 + (comp.waste_percentage / 100);
            const adjustedQuantity = baseQuantity * wasteMultiplier;
            
            const unitCost = pricing?.standard_cost || 
                            (itemInfo?.pricing_info as any)?.unit_cost || 0;
            const totalCost = adjustedQuantity * unitCost;
            
            const availableStock = stock?.available_qty || stock?.current_qty || 0;
            const shortageQuantity = Math.max(0, adjustedQuantity - availableStock);

            return {
              component_item_code: comp.component_item_code,
              component_item_name: itemInfo?.item_name || comp.component_item_code,
              planned_quantity: baseQuantity,
              unit_cost: unitCost,
              total_cost: totalCost,
              waste_percentage: comp.waste_percentage,
              adjusted_quantity: adjustedQuantity,
              consumption_type: comp.consumption_type as 'direct' | 'indirect' | 'byproduct',
              is_critical: comp.is_critical,
              available_stock: availableStock,
              shortage_quantity: shortageQuantity,
              stage_sequence: comp.stage_sequence,
              // Extended properties
              item_code: comp.component_item_code,
              item_name: itemInfo?.item_name || comp.component_item_code,
              material_category: comp.material_category || 'raw_material',
              current_stock: availableStock,
              uom: 'PCS',
            };
          });

          stageRequirements.push({
            stage_id: stage.id,
            stage_name: stage.stage_name,
            sequence_order: stage.sequence_order,
            materials: requirements,
            total_cost: requirements.reduce((sum, req) => sum + req.total_cost, 0),
            total_shortage: requirements.reduce((sum, req) => sum + req.shortage_quantity, 0),
            total_materials: requirements.length,
            total_shortage_quantity: requirements.reduce((sum, req) => sum + req.shortage_quantity, 0),
            total_shortage_items: requirements.filter(req => req.shortage_quantity > 0).length,
          });
        }
      }

      return stageRequirements;
    },
    enabled: !!organization?.id && !!selectedOrderId,
  });

  // Calculate cross-stage material flow
  const calculateMaterialFlow = (requirements: StageRequirement[]) => {
    const materialFlowMap: Record<string, {
      totalRequired: number;
      stages: Array<{ stageId: string; stageName: string; quantity: number; sequence: number }>;
    }> = {};

    requirements.forEach(stage => {
      stage.materials.forEach(material => {
        if (!materialFlowMap[material.component_item_code]) {
          materialFlowMap[material.component_item_code] = {
            totalRequired: 0,
            stages: []
          };
        }
        
        materialFlowMap[material.component_item_code].totalRequired += material.adjusted_quantity;
        materialFlowMap[material.component_item_code].stages.push({
          stageId: stage.stage_id,
          stageName: stage.stage_name,
          quantity: material.adjusted_quantity,
          sequence: stage.sequence_order
        });
      });
    });

    // Calculate summary metrics
    const allMaterials = requirements.flatMap(stage => stage.materials);
    const uniqueMaterials = new Set(allMaterials.map(m => m.component_item_code));
    const totalCost = allMaterials.reduce((sum, m) => sum + m.total_cost, 0);
    const shortageItems = allMaterials.filter(m => m.shortage_quantity > 0);
    const criticalPath = shortageItems.filter(m => m.is_critical);

    return {
      material_flow: materialFlowMap,
      total_unique_materials: uniqueMaterials.size,
      total_cost: totalCost,
      total_shortage_items: new Set(shortageItems.map(m => m.component_item_code)).size,
      critical_path: criticalPath,
    };
  };

  return {
    // State
    selectedOrderId,
    setSelectedOrderId,
    selectedStageId,
    setSelectedStageId,
    
    // Data
    stageRequirements,
    orderRequirements,
    
    // Loading states
    isLoadingRequirements,
    isLoadingOrderRequirements,
    
    // Utilities
    calculateMaterialFlow,
  };
};