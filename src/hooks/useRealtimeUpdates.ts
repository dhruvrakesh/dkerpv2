import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';

interface RealtimeConfig {
  enableWorkflowProgress?: boolean;
  enableQualityInspections?: boolean;
  enableProductionMetrics?: boolean;
  enableOrders?: boolean;
}

export const useRealtimeUpdates = (config: RealtimeConfig = {}) => {
  const { organization } = useDKEGLAuth();
  const queryClient = useQueryClient();

  const handleWorkflowProgressUpdate = useCallback((payload: any) => {
    console.log('Workflow progress update:', payload);
    
    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ['workflow-progress'] });
    queryClient.invalidateQueries({ queryKey: ['workflow-orders'] });
    queryClient.invalidateQueries({ queryKey: ['gravure-jobs'] });
    queryClient.invalidateQueries({ queryKey: ['slitting-jobs'] });
    queryClient.invalidateQueries({ queryKey: ['production-analytics'] });
  }, [queryClient]);

  const handleQualityInspectionUpdate = useCallback((payload: any) => {
    console.log('Quality inspection update:', payload);
    
    // Invalidate quality-related queries
    queryClient.invalidateQueries({ queryKey: ['quality-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['quality-inspections'] });
  }, [queryClient]);

  const handleProductionMetricsUpdate = useCallback((payload: any) => {
    console.log('Production metrics update:', payload);
    
    // Invalidate analytics queries
    queryClient.invalidateQueries({ queryKey: ['production-analytics'] });
    queryClient.invalidateQueries({ queryKey: ['production-metrics'] });
  }, [queryClient]);

  const handleOrdersUpdate = useCallback((payload: any) => {
    console.log('Orders update:', payload);
    
    // Invalidate order-related queries
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['workflow-orders'] });
    queryClient.invalidateQueries({ queryKey: ['workflow-progress'] });
  }, [queryClient]);

  useEffect(() => {
    if (!organization?.id) return;

    const channels: any[] = [];

    // Subscribe to workflow progress updates
    if (config.enableWorkflowProgress) {
      const workflowChannel = supabase
        .channel('workflow-progress-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'dkegl_workflow_progress',
            filter: `organization_id=eq.${organization.id}`,
          },
          handleWorkflowProgressUpdate
        )
        .subscribe();

      channels.push(workflowChannel);
    }

    // Subscribe to quality inspection updates
    if (config.enableQualityInspections) {
      const qualityChannel = supabase
        .channel('quality-inspections-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'dkegl_quality_inspections',
            filter: `organization_id=eq.${organization.id}`,
          },
          handleQualityInspectionUpdate
        )
        .subscribe();

      channels.push(qualityChannel);
    }

    // Subscribe to production metrics updates
    if (config.enableProductionMetrics) {
      const metricsChannel = supabase
        .channel('production-metrics-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'dkegl_production_metrics',
            filter: `organization_id=eq.${organization.id}`,
          },
          handleProductionMetricsUpdate
        )
        .subscribe();

      channels.push(metricsChannel);
    }

    // Subscribe to orders updates
    if (config.enableOrders) {
      const ordersChannel = supabase
        .channel('orders-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'dkegl_orders',
            filter: `organization_id=eq.${organization.id}`,
          },
          handleOrdersUpdate
        )
        .subscribe();

      channels.push(ordersChannel);
    }

    // Cleanup function
    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [
    organization?.id,
    config,
    handleWorkflowProgressUpdate,
    handleQualityInspectionUpdate,
    handleProductionMetricsUpdate,
    handleOrdersUpdate,
  ]);

  return {
    // You can expose methods here if needed
    refreshData: () => {
      queryClient.invalidateQueries();
    },
  };
};