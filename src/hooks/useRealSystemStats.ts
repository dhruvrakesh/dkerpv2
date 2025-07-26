import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SystemStats {
  systemStatus: 'Operational' | 'Maintenance' | 'Issues';
  activeUsers: number;
  pendingApprovals: number;
  todaysProduction: number;
  hasData: boolean;
}

interface SystemNotification {
  id: string;
  type: 'alert' | 'info' | 'success' | 'warning';
  title: string;
  message: string;
  time: string;
  urgent: boolean;
}

export const useRealSystemStats = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SystemStats>({
    systemStatus: 'Operational',
    activeUsers: 0,
    pendingApprovals: 0,
    todaysProduction: 0,
    hasData: false
  });
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const { data, error } = await supabase.rpc('dkegl_get_current_user_org');
        
        if (error) throw error;
        setOrganizationId(data);
        
        if (data) {
          await loadSystemStats(data);
        }
      } catch (error: any) {
        console.error('Error fetching organization:', error);
        toast({
          title: "Error",
          description: "Failed to fetch organization details",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [toast]);

  const loadSystemStats = async (orgId: string) => {
    try {
      // Get active users count from user profiles
      const { data: users, error: usersError } = await supabase
        .from('dkegl_user_profiles')
        .select('user_id')
        .eq('organization_id', orgId)
        .eq('is_active', true);

      if (usersError) throw usersError;

      // Get pending approvals from orders and other entities
      const { data: pendingOrders, error: ordersError } = await supabase
        .from('dkegl_orders')
        .select('id')
        .eq('organization_id', orgId)
        .eq('status', 'draft');

      if (ordersError) throw ordersError;

      // Get today's production from workflow progress
      const today = new Date().toISOString().split('T')[0];
      const { data: todayProgress, error: progressError } = await supabase
        .from('dkegl_workflow_progress')
        .select('id, dkegl_orders!inner(order_quantity)')
        .eq('organization_id', orgId)
        .eq('status', 'completed')
        .gte('completed_at', today);

      if (progressError) throw progressError;

      // Calculate today's production units
      const todaysProduction = todayProgress?.reduce((sum, p) => {
        return sum + (p.dkegl_orders?.order_quantity || 0);
      }, 0) || 0;

      // Get pricing variance alerts for notifications
      const { data: alerts, error: alertsError } = await supabase
        .from('dkegl_pricing_variance_alerts')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(5);

      if (alertsError) throw alertsError;

      // Get recent completed orders for success notifications
      const { data: recentCompleted, error: completedError } = await supabase
        .from('dkegl_orders')
        .select('order_number, updated_at')
        .eq('organization_id', orgId)
        .eq('status', 'completed')
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('updated_at', { ascending: false })
        .limit(3);

      if (completedError) throw completedError;

      const hasData = (users && users.length > 0) || (pendingOrders && pendingOrders.length > 0) || todaysProduction > 0;

      setStats({
        systemStatus: 'Operational',
        activeUsers: users?.length || 0,
        pendingApprovals: pendingOrders?.length || 0,
        todaysProduction,
        hasData
      });

      // Build notifications from real data
      const realNotifications: SystemNotification[] = [];

      // Add variance alerts
      alerts?.forEach((alert, index) => {
        if (realNotifications.length < 3) {
          realNotifications.push({
            id: alert.id,
            type: alert.alert_severity === 'critical' ? 'alert' : 'warning',
            title: 'Price Variance Alert',
            message: `${alert.item_code} price variance of ${alert.variance_percentage?.toFixed(1)}% detected`,
            time: getTimeAgo(alert.created_at),
            urgent: alert.alert_severity === 'critical'
          });
        }
      });

      // Add completed orders
      recentCompleted?.forEach((order, index) => {
        if (realNotifications.length < 6) {
          realNotifications.push({
            id: `completed-${order.order_number}`,
            type: 'success',
            title: 'Order Completed',
            message: `${order.order_number} has been successfully completed`,
            time: getTimeAgo(order.updated_at),
            urgent: false
          });
        }
      });

      setNotifications(realNotifications);

    } catch (error: any) {
      console.error('Error loading system stats:', error);
      toast({
        title: "Error",
        description: "Failed to load system statistics",
        variant: "destructive"
      });
    }
  };

  const getTimeAgo = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const refreshData = async () => {
    if (organizationId) {
      setLoading(true);
      await loadSystemStats(organizationId);
      setLoading(false);
    }
  };

  return {
    loading,
    stats,
    notifications,
    refreshData,
    organizationId
  };
};