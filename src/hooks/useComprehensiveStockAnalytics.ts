import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface ComprehensiveStockItem {
  item_code: string;
  item_name: string;
  category_name: string;
  current_qty: number;
  unit_cost: number;
  total_value: number;
  last_transaction_date: string;
  location: string;
  reorder_level: number;
  is_low_stock: boolean;
  opening_qty: number;
  total_grn_qty: number;
  total_issued_qty: number;
  calculated_qty: number;
  variance_qty: number;
}

interface StockAnalyticsTotals {
  total_opening: number;
  total_grn: number;
  total_issued: number;
  total_current: number;
  total_calculated: number;
  total_variance: number;
  total_items: number;
}

export const useComprehensiveStockAnalytics = () => {
  const { organization } = useDKEGLAuth();
  const { withRetry } = useErrorHandler();
  const [refreshKey, setRefreshKey] = useState(0);

  // Comprehensive stock data
  const { data: stockData, isLoading: stockLoading, error: stockError } = useQuery({
    queryKey: ['comprehensive-stock-data', organization?.id, refreshKey],
    queryFn: async (): Promise<ComprehensiveStockItem[]> => {
      if (!organization?.id) return [];

      try {
        const { data, error } = await supabase.rpc(
          'dkegl_get_comprehensive_stock_summary',
          { _org_id: organization.id }
        );

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Failed to fetch comprehensive stock data:', error);
        throw error;
      }
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Analytics totals
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['stock-analytics-totals', organization?.id, refreshKey],
    queryFn: async (): Promise<StockAnalyticsTotals> => {
      if (!organization?.id) return getDefaultTotals();

      try {
        const { data, error } = await supabase.rpc(
          'dkegl_get_stock_analytics_totals',
          { _org_id: organization.id }
        );

        if (error) throw error;
        return data?.[0] || getDefaultTotals();
      } catch (error) {
        console.error('Failed to fetch analytics totals:', error);
        return getDefaultTotals();
      }
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Refresh function
  const refreshData = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Get stock movements (reuse from existing hook)
  const getStockMovements = useCallback(async (
    itemCode?: string,
    days: number = 30
  ) => {
    if (!organization?.id) return [];

    try {
      const { data, error } = await supabase.rpc(
        'dkegl_get_stock_movements',
        {
          _org_id: organization.id,
          _item_code: itemCode,
          _days: days,
        }
      );

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch stock movements:', error);
      return [];
    }
  }, [organization?.id]);

  // Calculate key metrics
  const keyMetrics = {
    totalStockValue: analyticsData?.total_current || 0,
    criticalStockItems: stockData?.filter(item => item.is_low_stock).length || 0,
    reorderAlerts: stockData?.filter(item => item.current_qty <= item.reorder_level).length || 0,
    averageStockAge: stockData?.length > 0 
      ? stockData.reduce((sum, item) => {
          const daysSinceLastTransaction = item.last_transaction_date 
            ? (Date.now() - new Date(item.last_transaction_date).getTime()) / (1000 * 60 * 60 * 24)
            : 365;
          return sum + daysSinceLastTransaction;
        }, 0) / stockData.length
      : 0,
  };

  return {
    // Data
    stockData: stockData || [],
    analyticsData: analyticsData || getDefaultTotals(),
    keyMetrics,
    
    // Loading states
    isLoading: stockLoading || analyticsLoading,
    stockLoading,
    analyticsLoading,
    
    // Error handling
    error: stockError,
    
    // Actions
    refreshData,
    getStockMovements,
  };
};

const getDefaultTotals = (): StockAnalyticsTotals => ({
  total_opening: 0,
  total_grn: 0,
  total_issued: 0,
  total_current: 0,
  total_calculated: 0,
  total_variance: 0,
  total_items: 0,
});