import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';
import { useToast } from '@/hooks/use-toast';

interface QualityCheckpoint {
  stageId: string;
  orderId: string;
  checkType: 'pre_stage' | 'in_progress' | 'post_stage';
  requirements: string[];
}

export const useQualityEnforcement = () => {
  const { user, organization } = useDKEGLAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create quality checkpoint
  const createQualityCheckpoint = useMutation({
    mutationFn: async ({ stageId, orderId, checkType, templateId }: {
      stageId: string;
      orderId: string;
      checkType: string;
      templateId?: string;
    }) => {
      if (!organization?.id || !user?.id) throw new Error('Authentication required');

      const { data, error } = await supabase
        .from('dkegl_quality_inspections')
        .insert({
          organization_id: organization.id,
          order_id: orderId,
          stage_id: stageId,
          template_id: templateId,
          inspector_id: user.id,
          inspection_date: new Date().toISOString().split('T')[0],
          overall_result: 'pending',
          inspection_results: {},
          defects_found: [],
          corrective_actions: [],
          remarks: `${checkType} quality checkpoint created automatically`,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quality-inspections'] });
      toast({
        title: "Quality Checkpoint Created",
        description: "Quality inspection checkpoint has been automatically created.",
      });
    },
    onError: (error) => {
      console.error('Error creating quality checkpoint:', error);
      toast({
        title: "Error",
        description: "Failed to create quality checkpoint.",
        variant: "destructive",
      });
    },
  });

  // Check if stage can proceed (quality enforcement)
  const checkStageQualityStatus = useMutation({
    mutationFn: async ({ stageId, orderId }: { stageId: string; orderId: string }) => {
      if (!organization?.id) throw new Error('Authentication required');

      // Check for pending or failed quality inspections for this stage and order
      const { data: inspections, error } = await supabase
        .from('dkegl_quality_inspections')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('order_id', orderId)
        .eq('stage_id', stageId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // If no inspections exist, create one
      if (!inspections || inspections.length === 0) {
        throw new Error('QUALITY_CHECKPOINT_REQUIRED');
      }

      // Check latest inspection status
      const latestInspection = inspections[0];
      if (latestInspection.overall_result === 'pending') {
        throw new Error('QUALITY_INSPECTION_PENDING');
      }

      if (latestInspection.overall_result === 'failed') {
        throw new Error('QUALITY_INSPECTION_FAILED');
      }

      return {
        canProceed: latestInspection.overall_result === 'passed',
        inspection: latestInspection,
      };
    },
    onError: (error: any) => {
      if (error.message === 'QUALITY_CHECKPOINT_REQUIRED') {
        toast({
          title: "Quality Checkpoint Required",
          description: "A quality inspection must be completed before proceeding.",
          variant: "destructive",
        });
      } else if (error.message === 'QUALITY_INSPECTION_PENDING') {
        toast({
          title: "Quality Inspection Pending",
          description: "Please complete the quality inspection before proceeding.",
          variant: "destructive",
        });
      } else if (error.message === 'QUALITY_INSPECTION_FAILED') {
        toast({
          title: "Quality Inspection Failed",
          description: "This stage cannot proceed due to failed quality inspection.",
          variant: "destructive",
        });
      }
    },
  });

  // Update quality inspection result
  const updateQualityInspection = useMutation({
    mutationFn: async ({ 
      inspectionId, 
      result, 
      inspectionResults, 
      defects, 
      actions, 
      remarks 
    }: {
      inspectionId: string;
      result: 'passed' | 'failed' | 'in_review';
      inspectionResults?: any;
      defects?: string[];
      actions?: string[];
      remarks?: string;
    }) => {
      const { data, error } = await supabase
        .from('dkegl_quality_inspections')
        .update({
          overall_result: result,
          inspection_results: inspectionResults || {},
          defects_found: defects || [],
          corrective_actions: actions || [],
          remarks: remarks || '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', inspectionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quality-inspections'] });
      queryClient.invalidateQueries({ queryKey: ['quality-metrics'] });
      
      toast({
        title: "Quality Inspection Updated",
        description: `Inspection marked as ${data.overall_result}.`,
      });
    },
    onError: (error) => {
      console.error('Error updating quality inspection:', error);
      toast({
        title: "Error",
        description: "Failed to update quality inspection.",
        variant: "destructive",
      });
    },
  });

  return {
    createQualityCheckpoint,
    checkStageQualityStatus,
    updateQualityInspection,
    
    // Helper functions
    canProceedWithStage: async (stageId: string, orderId: string) => {
      try {
        const result = await checkStageQualityStatus.mutateAsync({ stageId, orderId });
        return result.canProceed;
      } catch (error) {
        return false;
      }
    },
    
    createCheckpointIfNeeded: async (stageId: string, orderId: string, checkType: string = 'pre_stage') => {
      try {
        await createQualityCheckpoint.mutateAsync({ stageId, orderId, checkType });
        return true;
      } catch (error) {
        return false;
      }
    },
  };
};