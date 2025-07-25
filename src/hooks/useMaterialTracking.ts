import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useDKEGLAuth } from './useDKEGLAuth';

interface MaterialConsumption {
  id: string;
  item_code: string;
  planned_quantity: number;
  actual_quantity: number;
  waste_quantity: number;
  unit_cost: number;
  total_cost: number;
  consumption_date: string;
  notes?: string;
}

interface WasteTracking {
  id: string;
  waste_type: string;
  waste_category: string;
  waste_amount: number;
  waste_percentage: number;
  cost_impact: number;
  root_cause?: string;
}

interface CostSummary {
  stage_name: string;
  material_cost: number;
  labor_cost: number;
  overhead_cost: number;
  total_stage_cost: number;
  waste_percentage: number;
  efficiency_percentage: number;
}

export const useMaterialTracking = () => {
  const { toast } = useToast();
  const { organization } = useDKEGLAuth();
  const [loading, setLoading] = useState(false);

  const trackMaterialConsumption = async (
    workflowProgressId: string,
    itemCode: string,
    plannedQty: number,
    actualQty: number,
    unitCost: number = 0
  ) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('dkegl_track_material_consumption', {
        _workflow_progress_id: workflowProgressId,
        _item_code: itemCode,
        _planned_qty: plannedQty,
        _actual_qty: actualQty,
        _unit_cost: unitCost
      });

      if (error) throw error;

      toast({
        title: "Material Consumption Tracked",
        description: `Successfully tracked consumption for ${itemCode}`,
      });

      return data;
    } catch (error: any) {
      console.error('Error tracking material consumption:', error);
      toast({
        title: "Error",
        description: "Failed to track material consumption",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getMaterialConsumption = async (workflowProgressId: string): Promise<MaterialConsumption[]> => {
    try {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('dkegl_material_consumption')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('workflow_progress_id', workflowProgressId)
        .order('consumption_date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching material consumption:', error);
      return [];
    }
  };

  const getWasteTracking = async (workflowProgressId: string): Promise<WasteTracking[]> => {
    try {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('dkegl_waste_tracking')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('workflow_progress_id', workflowProgressId)
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching waste tracking:', error);
      return [];
    }
  };

  const getOrderCostSummary = async (orderId: string): Promise<CostSummary[]> => {
    try {
      const { data, error } = await supabase.rpc('dkegl_get_order_cost_summary', {
        _order_id: orderId
      });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching cost summary:', error);
      return [];
    }
  };

  const calculateStageCost = async (workflowProgressId: string) => {
    try {
      const { data, error } = await supabase.rpc('dkegl_calculate_stage_cost', {
        _workflow_progress_id: workflowProgressId
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error calculating stage cost:', error);
      return 0;
    }
  };

  const updateWasteTracking = async (
    workflowProgressId: string,
    wasteData: {
      waste_type: string;
      waste_category: string;
      planned_amount: number;
      actual_amount: number;
      waste_amount: number;
      root_cause?: string;
      corrective_action?: string;
    }
  ) => {
    try {
      if (!organization?.id) throw new Error('Organization not found');

      const wastePercentage = wasteData.planned_amount > 0 
        ? (wasteData.waste_amount / wasteData.planned_amount) * 100 
        : 0;

      const { data, error } = await supabase
        .from('dkegl_waste_tracking')
        .insert({
          organization_id: organization.id,
          workflow_progress_id: workflowProgressId,
          waste_type: wasteData.waste_type,
          waste_category: wasteData.waste_category,
          planned_amount: wasteData.planned_amount,
          actual_amount: wasteData.actual_amount,
          waste_amount: wasteData.waste_amount,
          waste_percentage: wastePercentage,
          cost_impact: wasteData.waste_amount * 10, // Simplified cost calculation
          root_cause: wasteData.root_cause,
          corrective_action: wasteData.corrective_action,
          recorded_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: "Waste Tracked",
        description: `Waste tracking updated for ${wasteData.waste_type}`,
      });

      return data;
    } catch (error: any) {
      console.error('Error updating waste tracking:', error);
      toast({
        title: "Error",
        description: "Failed to update waste tracking",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    loading,
    trackMaterialConsumption,
    getMaterialConsumption,
    getWasteTracking,
    getOrderCostSummary,
    calculateStageCost,
    updateWasteTracking
  };
};