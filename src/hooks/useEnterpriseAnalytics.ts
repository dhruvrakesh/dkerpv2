import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SalesSummary {
  total_sales: number;
  total_transactions: number;
  avg_transaction_value: number;
  period: string;
  growth_rate: number;
  top_customers: Array<{
    customer_name: string;
    total_amount: number;
    transaction_count: number;
  }>;
  sales_by_month: Array<{
    month: string;
    total_sales: number;
    transaction_count: number;
  }>;
}

export interface PurchaseSummary {
  total_purchases: number;
  total_transactions: number;
  avg_transaction_value: number;
  period: string;
  growth_rate: number;
  top_vendors: Array<{
    vendor_name: string;
    total_amount: number;
    transaction_count: number;
  }>;
  purchases_by_month: Array<{
    month: string;
    total_purchases: number;
    transaction_count: number;
  }>;
}

export interface CustomerAnalysis {
  total_customers: number;
  active_customers: number;
  customer_segments: Array<{
    segment: string;
    customer_count: number;
    total_value: number;
    avg_value: number;
  }>;
  customer_retention_rate: number;
  top_customers: Array<{
    customer_name: string;
    total_value: number;
    last_transaction_date: string;
    transaction_count: number;
  }>;
}

export interface ExecutiveSummary {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  profit_margin: number;
  revenue_growth: number;
  expense_growth: number;
  key_metrics: {
    top_selling_products: any[];
    top_customers: any[];
    top_vendors: any[];
    monthly_trends: any[];
  };
  period_comparison: {
    current_period: any;
    previous_period: any;
    variance: any;
  };
}

export const useEnterpriseAnalytics = () => {
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [purchaseSummary, setPurchaseSummary] = useState<PurchaseSummary | null>(null);
  const [customerAnalysis, setCustomerAnalysis] = useState<CustomerAnalysis | null>(null);
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getCurrentOrgId = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('dkegl_get_current_user_org');
    if (error) throw error;
    return data;
  };

  const fetchSalesSummary = async (startDate?: string, endDate?: string) => {
    setLoading(true);
    try {
      const orgId = await getCurrentOrgId();
      const { data, error } = await supabase.rpc('dkpkl_get_sales_summary' as any, {
        _org_id: orgId,
        _start_date: startDate,
        _end_date: endDate
      });

      if (error) throw error;
      setSalesSummary(data as SalesSummary);
    } catch (error: any) {
      toast({
        title: "Error fetching sales summary",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseSummary = async (startDate?: string, endDate?: string) => {
    setLoading(true);
    try {
      const orgId = await getCurrentOrgId();
      const { data, error } = await supabase.rpc('dkpkl_get_purchase_summary' as any, {
        _org_id: orgId,
        _start_date: startDate,
        _end_date: endDate
      });

      if (error) throw error;
      setPurchaseSummary(data as PurchaseSummary);
    } catch (error: any) {
      toast({
        title: "Error fetching purchase summary",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerAnalysis = async (startDate?: string, endDate?: string) => {
    setLoading(true);
    try {
      const orgId = await getCurrentOrgId();
      const { data, error } = await supabase.rpc('dkpkl_get_customer_analysis' as any, {
        _org_id: orgId,
        _start_date: startDate,
        _end_date: endDate
      });

      if (error) throw error;
      setCustomerAnalysis(data as CustomerAnalysis);
    } catch (error: any) {
      toast({
        title: "Error fetching customer analysis",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutiveSummary = async (startDate?: string, endDate?: string) => {
    setLoading(true);
    try {
      const orgId = await getCurrentOrgId();
      const { data, error } = await supabase.rpc('dkpkl_get_executive_summary' as any, {
        _org_id: orgId,
        _start_date: startDate,
        _end_date: endDate
      });

      if (error) throw error;
      setExecutiveSummary(data as ExecutiveSummary);
    } catch (error: any) {
      toast({
        title: "Error fetching executive summary",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAnalytics = async (startDate?: string, endDate?: string) => {
    await Promise.all([
      fetchSalesSummary(startDate, endDate),
      fetchPurchaseSummary(startDate, endDate),
      fetchCustomerAnalysis(startDate, endDate),
      fetchExecutiveSummary(startDate, endDate)
    ]);
  };

  return {
    salesSummary,
    purchaseSummary,
    customerAnalysis,
    executiveSummary,
    loading,
    fetchSalesSummary,
    fetchPurchaseSummary,
    fetchCustomerAnalysis,
    fetchExecutiveSummary,
    fetchAllAnalytics,
  };
};