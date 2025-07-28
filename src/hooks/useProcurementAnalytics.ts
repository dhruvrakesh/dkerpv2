import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProcurementAnalytics {
  total_vendors: number;
  active_vendors: number;
  total_spend: number;
  average_order_value: number;
  on_time_delivery_rate: number;
  top_vendor_by_spend: string;
  pending_rfqs: number;
  active_pos: number;
}

export interface SpendAnalytics {
  period: string;
  amount: number;
  vendor_name?: string;
  category_name?: string;
}

export interface VendorPerformanceData {
  vendor_id: string;
  vendor_name: string;
  overall_score: number;
  delivery_score: number;
  quality_score: number;
  pricing_score: number;
  total_orders: number;
  on_time_deliveries: number;
  total_order_value: number;
}

export const useProcurementAnalytics = () => {
  const [analytics, setAnalytics] = useState<ProcurementAnalytics | null>(null);
  const [spendByPeriod, setSpendByPeriod] = useState<SpendAnalytics[]>([]);
  const [spendByVendor, setSpendByVendor] = useState<SpendAnalytics[]>([]);
  const [spendByCategory, setSpendByCategory] = useState<SpendAnalytics[]>([]);
  const [topPerformers, setTopPerformers] = useState<VendorPerformanceData[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchProcurementAnalytics = async (daysBack: number = 30) => {
    setLoading(true);
    try {
      const { data: orgId } = await supabase.rpc('dkegl_get_current_user_org');
      
      const { data, error } = await supabase.rpc('dkegl_get_procurement_analytics', {
        _org_id: orgId,
        _days_back: daysBack
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setAnalytics(data[0]);
      }
    } catch (error: any) {
      toast({
        title: "Error fetching analytics",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSpendAnalytics = async (daysBack: number = 30) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Spend by period (monthly)
      const { data: spendPeriod, error: periodError } = await supabase
        .from('dkegl_purchase_orders')
        .select(`
          created_at,
          dkegl_po_items (
            total_amount
          )
        `)
        .gte('created_at', startDate.toISOString().split('T')[0])
        .order('created_at');

      if (periodError) throw periodError;

      // Process period data
      const periodMap = new Map<string, number>();
      spendPeriod?.forEach(order => {
        const month = order.created_at.substring(0, 7); // YYYY-MM
        const total = order.dkegl_po_items?.reduce((sum: number, item: any) => sum + (item.total_amount || 0), 0) || 0;
        periodMap.set(month, (periodMap.get(month) || 0) + total);
      });

      setSpendByPeriod(
        Array.from(periodMap.entries()).map(([period, amount]) => ({
          period,
          amount
        }))
      );

      // Spend by vendor
      const { data: spendVendor, error: vendorError } = await supabase
        .from('dkegl_purchase_orders')
        .select(`
          dkegl_vendors (
            vendor_name
          ),
          dkegl_po_items (
            total_amount
          )
        `)
        .gte('created_at', startDate.toISOString().split('T')[0]);

      if (vendorError) throw vendorError;

      const vendorMap = new Map<string, number>();
      spendVendor?.forEach(order => {
        const vendorName = order.dkegl_vendors?.vendor_name || 'Unknown';
        const total = order.dkegl_po_items?.reduce((sum: number, item: any) => sum + (item.total_amount || 0), 0) || 0;
        vendorMap.set(vendorName, (vendorMap.get(vendorName) || 0) + total);
      });

      setSpendByVendor(
        Array.from(vendorMap.entries())
          .map(([vendor_name, amount]) => ({ period: '', amount, vendor_name }))
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 10)
      );

    } catch (error: any) {
      toast({
        title: "Error fetching spend analytics",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchVendorPerformance = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90); // Last 90 days

      const { data, error } = await supabase
        .from('dkegl_vendor_performance')
        .select(`
          *,
          dkegl_vendors (
            vendor_name
          )
        `)
        .gte('evaluation_period_start', startDate.toISOString().split('T')[0])
        .order('overall_score', { ascending: false })
        .limit(10);

      if (error) throw error;

      setTopPerformers(
        data?.map(perf => ({
          vendor_id: perf.vendor_id,
          vendor_name: perf.dkegl_vendors?.vendor_name || 'Unknown',
          overall_score: perf.overall_score,
          delivery_score: perf.delivery_score,
          quality_score: perf.quality_score,
          pricing_score: perf.pricing_score,
          total_orders: perf.total_orders,
          on_time_deliveries: perf.on_time_deliveries,
          total_order_value: perf.total_order_value,
        })) || []
      );
    } catch (error: any) {
      toast({
        title: "Error fetching performance data",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const calculateVendorPerformance = async (vendorId: string) => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      const { data, error } = await supabase.rpc('dkegl_calculate_vendor_performance', {
        _vendor_id: vendorId,
        _start_date: startDate.toISOString().split('T')[0],
        _end_date: endDate.toISOString().split('T')[0]
      });

      if (error) throw error;

      toast({
        title: "Performance calculated",
        description: `Vendor performance score: ${data?.toFixed(2) || 0}/5`,
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error calculating performance",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchProcurementAnalytics();
    fetchSpendAnalytics();
    fetchVendorPerformance();
  }, []);

  return {
    analytics,
    spendByPeriod,
    spendByVendor,
    spendByCategory,
    topPerformers,
    loading,
    fetchProcurementAnalytics,
    fetchSpendAnalytics,
    fetchVendorPerformance,
    calculateVendorPerformance,
  };
};