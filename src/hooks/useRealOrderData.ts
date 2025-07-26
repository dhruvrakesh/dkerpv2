import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OrderData {
  id: string;
  order_number: string;
  item_name: string;
  customer_info: any;
  status: string;
  delivery_date: string;
  priority_level: number;
  created_at: string;
  order_quantity: number;
}

export const useRealOrderData = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const { data, error } = await supabase.rpc('dkegl_get_current_user_org');
        
        if (error) throw error;
        setOrganizationId(data);
        
        if (data) {
          await loadOrderData(data);
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

  const loadOrderData = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('dkegl_orders')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setOrders(data || []);
    } catch (error: any) {
      console.error('Error loading order data:', error);
      toast({
        title: "Error",
        description: "Failed to load order data",
        variant: "destructive"
      });
    }
  };

  const refreshData = async () => {
    if (organizationId) {
      setLoading(true);
      await loadOrderData(organizationId);
      setLoading(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'draft': return 'Pending';
      case 'in_production': return 'In Production';
      case 'quality_check': return 'Quality Check';
      case 'completed': return 'Completed';
      case 'shipped': return 'Dispatched';
      default: return status;
    }
  };

  const getPriorityDisplay = (priority: number) => {
    if (priority >= 4) return 'High';
    if (priority >= 3) return 'Medium';
    return 'Low';
  };

  const getCustomerName = (customerInfo: any) => {
    if (typeof customerInfo === 'object' && customerInfo?.name) {
      return customerInfo.name;
    }
    return 'Unknown Customer';
  };

  return {
    loading,
    orders,
    refreshData,
    getStatusDisplay,
    getPriorityDisplay,
    getCustomerName,
    hasData: orders.length > 0
  };
};