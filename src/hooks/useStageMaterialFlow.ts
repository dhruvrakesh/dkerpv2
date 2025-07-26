import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StageMaterialInput {
  id: string;
  organization_id: string;
  order_id: string;
  stage_id: string;
  workflow_progress_id: string;
  input_type: 'substrate_carryforward' | 'fresh_material' | 'bom_component';
  item_code: string;
  planned_quantity: number;
  actual_quantity: number;
  unit_cost: number;
  total_cost: number;
  source_stage_id?: string;
  lot_number?: string;
  supplier_batch?: string;
  received_date?: string;
  expiry_date?: string;
  quality_status: 'pending' | 'approved' | 'rejected' | 'quarantine';
  material_properties: Record<string, any>;
}

export interface StageMaterialOutput {
  id: string;
  organization_id: string;
  order_id: string;
  stage_id: string;
  workflow_progress_id: string;
  output_type: 'substrate_forward' | 'waste_material' | 'finished_product' | 'rework_material';
  item_code: string;
  planned_quantity: number;
  actual_quantity: number;
  unit_cost: number;
  total_cost: number;
  destination_stage_id?: string;
  yield_percentage: number;
  waste_category?: string;
  waste_reason?: string;
  quality_grade?: string;
  material_properties: Record<string, any>;
}

export interface MaterialTransformation {
  id: string;
  organization_id: string;
  order_id: string;
  stage_id: string;
  workflow_progress_id: string;
  input_material_id: string;
  output_material_id: string;
  transformation_type: string;
  yield_rate: number;
  waste_percentage: number;
  transformation_parameters: Record<string, any>;
  processing_conditions: Record<string, any>;
  quality_impact: Record<string, any>;
}

export interface StageMaterialCategory {
  id: string;
  organization_id: string;
  stage_id: string;
  category_name: string;
  category_type: 'substrate' | 'fresh_material' | 'consumable' | 'tooling' | 'packaging';
  is_required: boolean;
  typical_consumption_rate: number;
  waste_allowance_percentage: number;
  cost_allocation_method: string;
  quality_requirements: Record<string, any>;
  storage_requirements: Record<string, any>;
}

export function useStageMaterialFlow() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch stage material inputs
  const getStageMaterialInputs = (workflowProgressId: string) => {
    return useQuery({
      queryKey: ['stage-material-inputs', workflowProgressId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('dkegl_stage_material_inputs')
          .select(`
            *,
            item_master:dkegl_item_master!inner(item_name, uom)
          `)
          .eq('workflow_progress_id', workflowProgressId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as any[];
      },
      enabled: !!workflowProgressId,
    });
  };

  // Fetch stage material outputs
  const getStageMaterialOutputs = (workflowProgressId: string) => {
    return useQuery({
      queryKey: ['stage-material-outputs', workflowProgressId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('dkegl_stage_material_outputs')
          .select(`
            *,
            item_master:dkegl_item_master!inner(item_name, uom)
          `)
          .eq('workflow_progress_id', workflowProgressId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as any[];
      },
      enabled: !!workflowProgressId,
    });
  };

  // Fetch stage material categories
  const getStageMaterialCategories = (stageId: string) => {
    return useQuery({
      queryKey: ['stage-material-categories', stageId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('dkegl_stage_material_categories')
          .select('*')
          .eq('stage_id', stageId)
          .order('category_name');

        if (error) throw error;
        return data as StageMaterialCategory[];
      },
      enabled: !!stageId,
    });
  };

  // Add material input
  const addMaterialInput = useMutation({
    mutationFn: async (input: Omit<StageMaterialInput, 'id' | 'total_cost'>) => {
      const { data, error } = await supabase
        .from('dkegl_stage_material_inputs')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stage-material-inputs', data.workflow_progress_id] });
      toast({
        title: "Material Input Added",
        description: "Material input has been successfully recorded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add material input: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Add material output
  const addMaterialOutput = useMutation({
    mutationFn: async (output: Omit<StageMaterialOutput, 'id' | 'total_cost' | 'yield_percentage'>) => {
      const { data, error } = await supabase
        .from('dkegl_stage_material_outputs')
        .insert(output)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stage-material-outputs', data.workflow_progress_id] });
      toast({
        title: "Material Output Added",
        description: "Material output has been successfully recorded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add material output: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Create material transformation
  const createMaterialTransformation = useMutation({
    mutationFn: async (transformation: Omit<MaterialTransformation, 'id'>) => {
      const { data, error } = await supabase
        .from('dkegl_material_transformations')
        .insert(transformation)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Transformation Recorded",
        description: "Material transformation has been successfully recorded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to record transformation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Calculate stage material requirements from BOM
  const calculateStageMaterialRequirements = useMutation({
    mutationFn: async ({ orderId, stageId }: { orderId: string; stageId: string }) => {
      const { data, error } = await supabase
        .rpc('dkegl_calculate_stage_material_requirements', {
          _order_id: orderId,
          _stage_id: stageId,
        });

      if (error) throw error;
      return data;
    },
  });

  return {
    getStageMaterialInputs,
    getStageMaterialOutputs,
    getStageMaterialCategories,
    addMaterialInput,
    addMaterialOutput,
    createMaterialTransformation,
    calculateStageMaterialRequirements,
  };
}