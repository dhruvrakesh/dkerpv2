import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';

interface RealtimeUpdate {
  id: string;
  type: 'quality_inspection' | 'workflow_progress' | 'order_status';
  data: any;
  timestamp: string;
}

export const useRealtimeQualityUpdates = () => {
  const [updates, setUpdates] = useState<RealtimeUpdate[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  const { organization } = useDKEGLAuth();

  useEffect(() => {
    if (!organization?.id) return;

    console.log('[Realtime] Setting up quality updates subscription...');

    // Quality Inspections Channel
    const qualityChannel = supabase
      .channel('quality-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dkegl_quality_inspections',
          filter: `organization_id=eq.${organization.id}`
        },
        (payload) => {
          console.log('[Realtime] Quality inspection update:', payload);
          
          const update: RealtimeUpdate = {
            id: `quality_${Date.now()}`,
            type: 'quality_inspection',
            data: payload,
            timestamp: new Date().toISOString()
          };

          setUpdates(prev => [update, ...prev.slice(0, 49)]); // Keep last 50 updates

          // Show toast for important updates
          if (payload.eventType === 'UPDATE' && payload.new.overall_result === 'failed') {
            toast({
              title: "Quality Alert",
              description: `Quality inspection failed for ${payload.new.remarks || 'inspection'}`,
              variant: "destructive"
            });
          } else if (payload.eventType === 'UPDATE' && payload.new.overall_result === 'passed') {
            toast({
              title: "Quality Passed",
              description: `Quality inspection passed successfully`,
              variant: "default"
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Quality channel status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Workflow Progress Channel
    const workflowChannel = supabase
      .channel('workflow-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dkegl_workflow_progress',
          filter: `organization_id=eq.${organization.id}`
        },
        (payload) => {
          console.log('[Realtime] Workflow progress update:', payload);
          
          const update: RealtimeUpdate = {
            id: `workflow_${Date.now()}`,
            type: 'workflow_progress',
            data: payload,
            timestamp: new Date().toISOString()
          };

          setUpdates(prev => [update, ...prev.slice(0, 49)]);

          // Show progress notifications
          if (payload.eventType === 'UPDATE' && payload.new.status === 'completed') {
            toast({
              title: "Stage Completed",
              description: `Manufacturing stage completed with ${payload.new.progress_percentage}% efficiency`,
              variant: "default"
            });
          }
        }
      )
      .subscribe();

    // Orders Channel
    const ordersChannel = supabase
      .channel('orders-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dkegl_orders',
          filter: `organization_id=eq.${organization.id}`
        },
        (payload) => {
          console.log('[Realtime] Order update:', payload);
          
          const update: RealtimeUpdate = {
            id: `order_${Date.now()}`,
            type: 'order_status',
            data: payload,
            timestamp: new Date().toISOString()
          };

          setUpdates(prev => [update, ...prev.slice(0, 49)]);

          // Show order status notifications
          if (payload.eventType === 'UPDATE' && payload.new.status === 'completed') {
            toast({
              title: "Order Completed",
              description: `Order ${payload.new.order_number} has been completed successfully`,
              variant: "default"
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[Realtime] Cleaning up subscriptions...');
      supabase.removeChannel(qualityChannel);
      supabase.removeChannel(workflowChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [organization?.id, toast]);

  const clearUpdates = () => {
    setUpdates([]);
  };

  const getUpdatesByType = (type: RealtimeUpdate['type']) => {
    return updates.filter(update => update.type === type);
  };

  const getRecentQualityFailures = () => {
    return updates
      .filter(update => 
        update.type === 'quality_inspection' && 
        update.data?.new?.overall_result === 'failed'
      )
      .slice(0, 10);
  };

  const getRecentCompletions = () => {
    return updates
      .filter(update => 
        (update.type === 'workflow_progress' && update.data?.new?.status === 'completed') ||
        (update.type === 'order_status' && update.data?.new?.status === 'completed')
      )
      .slice(0, 10);
  };

  return {
    updates,
    isConnected,
    clearUpdates,
    getUpdatesByType,
    getRecentQualityFailures,
    getRecentCompletions,
    totalUpdates: updates.length
  };
};