import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';
import { useErrorHandler } from '@/hooks/useErrorHandler';

interface StockLevel {
  item_code: string;
  item_name: string;
  current_qty: number;
  unit_cost: number;
  total_value: number;
  location: string;
  last_updated: string;
  reorder_level: number;
  critical_stock: boolean;
}

interface StockMovement {
  transaction_date: string;
  transaction_type: string;
  item_code: string;
  item_name: string;
  quantity: number;
  running_balance: number;
  source_reference: string;
  unit_cost: number;
}

interface StockAging {
  item_code: string;
  item_name: string;
  category_name: string;
  current_qty: number;
  last_movement_date: string;
  days_since_movement: number;
  aging_category: string;
  estimated_value: number;
  velocity_score: number;
}

interface ReorderRecommendation {
  item_code: string;
  item_name: string;
  current_qty: number;
  reorder_level: number;
  recommended_qty: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  lead_time_days: number;
  avg_consumption: number;
  seasonal_factor: number;
}

interface ValuationMetrics {
  total_inventory_value: number;
  method_breakdown: {
    fifo_value: number;
    weighted_avg_value: number;
    standard_cost_value: number;
  };
  variance_analysis: {
    book_vs_physical: number;
    cost_variance: number;
  };
  turnover_metrics: {
    inventory_turnover: number;
    days_sales_outstanding: number;
  };
}

interface ABCAnalysis {
  item_code: string;
  item_name: string;
  annual_usage_value: number;
  usage_percentage: number;
  cumulative_percentage: number;
  abc_category: 'A' | 'B' | 'C';
  control_strategy: string;
}

export const useAdvancedStockAnalytics = () => {
  const { organization } = useDKEGLAuth();
  const { withRetry } = useErrorHandler();
  const [refreshInterval, setRefreshInterval] = useState(30000);

  // Real-time stock levels
  const { data: realTimeStock, isLoading: stockLoading } = useQuery({
    queryKey: ['advanced-stock-levels', organization?.id],
    queryFn: async (): Promise<StockLevel[]> => {
      if (!organization?.id) return [];

      try {
        const { data, error } = await supabase
          .from('dkegl_stock')
          .select(`
            item_code,
            current_qty,
            unit_cost,
            location,
            last_updated,
            dkegl_item_master!inner(
              item_name,
              reorder_level
            )
          `)
          .eq('organization_id', organization.id)
          .gt('current_qty', 0);

        if (error) throw error;

        return data.map(item => ({
          item_code: item.item_code,
          item_name: item.dkegl_item_master.item_name,
          current_qty: item.current_qty,
          unit_cost: item.unit_cost || 0,
          total_value: item.current_qty * (item.unit_cost || 0),
          location: item.location || 'main_warehouse',
          last_updated: item.last_updated,
          reorder_level: item.dkegl_item_master.reorder_level || 0,
          critical_stock: item.current_qty <= (item.dkegl_item_master.reorder_level || 0),
        }));
      } catch (error) {
        console.error('Failed to fetch stock levels:', error);
        return [];
      }
    },
    enabled: !!organization?.id,
    refetchInterval: refreshInterval,
  });

  // Stock movements
  const getStockMovements = useCallback(async (
    itemCode?: string,
    days: number = 30
  ): Promise<StockMovement[]> => {
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

  // Aging analysis
  const { data: agingAnalysis, isLoading: agingLoading } = useQuery({
    queryKey: ['stock-aging-analysis', organization?.id],
    queryFn: async (): Promise<StockAging[]> => {
      if (!organization?.id) return [];

      try {
        const { data, error } = await supabase.rpc(
          'dkegl_get_stock_aging',
          { _org_id: organization.id }
        );

        if (error) throw error;

        return (data || []).map(item => ({
          ...item,
          velocity_score: calculateVelocityScore(item.days_since_movement, item.estimated_value),
        }));
      } catch (error) {
        console.error('Failed to fetch aging analysis:', error);
        return [];
      }
    },
    enabled: !!organization?.id,
  });

  // Reorder recommendations
  const { data: reorderRecommendations, isLoading: reorderLoading } = useQuery({
    queryKey: ['reorder-recommendations', organization?.id],
    queryFn: async (): Promise<ReorderRecommendation[]> => {
      if (!organization?.id) return [];

      try {
        const { data, error } = await supabase.rpc(
          'dkegl_analyze_consumption_patterns',
          { _org_id: organization.id }
        );

        if (error) throw error;

        return (data || []).map(item => ({
          item_code: item.item_code,
          item_name: item.item_name,
          current_qty: 0,
          reorder_level: item.recommended_reorder_level,
          recommended_qty: item.recommended_reorder_quantity,
          urgency: determineUrgency(0, item.recommended_reorder_level, item.avg_monthly_consumption),
          lead_time_days: 30,
          avg_consumption: item.avg_monthly_consumption,
          seasonal_factor: item.seasonality_factor,
        }));
      } catch (error) {
        console.error('Failed to fetch reorder recommendations:', error);
        return [];
      }
    },
    enabled: !!organization?.id,
  });

  // ABC Analysis
  const calculateABCAnalysis = useCallback(async (): Promise<ABCAnalysis[]> => {
    if (!organization?.id) return [];

    try {
      const { data: consumptionData, error } = await supabase
        .from('dkegl_issue_log')
        .select(`
          item_code,
          qty_issued,
          dkegl_item_master!inner(
            item_name,
            pricing_info
          )
        `)
        .eq('organization_id', organization.id)
        .gte('date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const itemUsage = new Map<string, { name: string; value: number }>();
      
      consumptionData?.forEach(record => {
        const pricingInfo = record.dkegl_item_master?.pricing_info as any;
        const unitCost = pricingInfo?.unit_cost || 0;
        const usageValue = record.qty_issued * unitCost;
        
        if (itemUsage.has(record.item_code)) {
          itemUsage.get(record.item_code)!.value += usageValue;
        } else {
          itemUsage.set(record.item_code, {
            name: record.dkegl_item_master?.item_name || '',
            value: usageValue,
          });
        }
      });

      const sortedItems = Array.from(itemUsage.entries())
        .sort(([, a], [, b]) => b.value - a.value);

      const totalValue = sortedItems.reduce((sum, [, item]) => sum + item.value, 0);
      let cumulativeValue = 0;

      return sortedItems.map(([itemCode, item]) => {
        cumulativeValue += item.value;
        const cumulativePercentage = (cumulativeValue / totalValue) * 100;
        
        let abcCategory: 'A' | 'B' | 'C';
        let controlStrategy: string;
        
        if (cumulativePercentage <= 80) {
          abcCategory = 'A';
          controlStrategy = 'Tight control, frequent review, accurate forecasting';
        } else if (cumulativePercentage <= 95) {
          abcCategory = 'B';
          controlStrategy = 'Moderate control, periodic review';
        } else {
          abcCategory = 'C';
          controlStrategy = 'Loose control, annual review';
        }

        return {
          item_code: itemCode,
          item_name: item.name,
          annual_usage_value: item.value,
          usage_percentage: (item.value / totalValue) * 100,
          cumulative_percentage: cumulativePercentage,
          abc_category: abcCategory,
          control_strategy: controlStrategy,
        };
      });
    } catch (error) {
      console.error('Failed to calculate ABC analysis:', error);
      return [];
    }
  }, [organization?.id]);

  // Valuation metrics
  const calculateValuationMetrics = useCallback(async (): Promise<ValuationMetrics> => {
    if (!organization?.id) return getDefaultValuationMetrics();

    try {
      const { data: stockData, error } = await supabase
        .from('dkegl_stock')
        .select(`
          item_code,
          current_qty,
          unit_cost,
          dkegl_item_master!inner(
            pricing_info
          )
        `)
        .eq('organization_id', organization.id);

      if (error) throw error;

      let totalValue = 0;
      let fifoValue = 0;
      let weightedAvgValue = 0;
      let standardCostValue = 0;

      stockData?.forEach(item => {
        const qty = item.current_qty;
        const unitCost = item.unit_cost || 0;
        const pricingInfo = item.dkegl_item_master?.pricing_info as any;
        const standardCost = pricingInfo?.standard_cost || 0;
        
        totalValue += qty * unitCost;
        standardCostValue += qty * standardCost;
        fifoValue += qty * unitCost;
        weightedAvgValue += qty * unitCost;
      });

      return {
        total_inventory_value: totalValue,
        method_breakdown: {
          fifo_value: fifoValue,
          weighted_avg_value: weightedAvgValue,
          standard_cost_value: standardCostValue,
        },
        variance_analysis: {
          book_vs_physical: 0,
          cost_variance: Math.abs(totalValue - standardCostValue),
        },
        turnover_metrics: {
          inventory_turnover: 0,
          days_sales_outstanding: 0,
        },
      };
    } catch (error) {
      console.error('Failed to calculate valuation metrics:', error);
      return getDefaultValuationMetrics();
    }
  }, [organization?.id]);

  return {
    realTimeStock,
    stockLoading,
    agingAnalysis,
    agingLoading,
    reorderRecommendations,
    reorderLoading,
    getStockMovements,
    calculateABCAnalysis,
    calculateValuationMetrics,
    setRefreshInterval,
  };
};

// Helper functions
const calculateVelocityScore = (daysSinceMovement: number, value: number): number => {
  const timeScore = Math.max(0, 100 - daysSinceMovement / 3.65);
  const valueScore = Math.min(100, Math.log10(value + 1) * 20);
  return (timeScore + valueScore) / 2;
};

const determineUrgency = (
  currentQty: number,
  reorderLevel: number,
  avgConsumption: number
): 'low' | 'medium' | 'high' | 'critical' => {
  if (currentQty <= 0) return 'critical';
  if (currentQty <= reorderLevel * 0.5) return 'critical';
  if (currentQty <= reorderLevel) return 'high';
  if (currentQty <= reorderLevel * 1.5) return 'medium';
  return 'low';
};

const getDefaultValuationMetrics = (): ValuationMetrics => ({
  total_inventory_value: 0,
  method_breakdown: {
    fifo_value: 0,
    weighted_avg_value: 0,
    standard_cost_value: 0,
  },
  variance_analysis: {
    book_vs_physical: 0,
    cost_variance: 0,
  },
  turnover_metrics: {
    inventory_turnover: 0,
    days_sales_outstanding: 0,
  },
});