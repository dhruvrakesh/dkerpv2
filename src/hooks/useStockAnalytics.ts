import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StockMovement {
  transaction_date: string;
  transaction_type: string;
  item_code: string;
  item_name: string;
  quantity: number;
  running_balance: number;
  source_reference: string;
  unit_cost: number;
}

export interface StockAging {
  item_code: string;
  item_name: string;
  category_name: string;
  current_qty: number;
  last_movement_date: string;
  days_since_movement: number;
  aging_category: string;
  estimated_value: number;
}

export interface ConsumptionPattern {
  item_code: string;
  item_name: string;
  avg_monthly_consumption: number;
  consumption_trend: string;
  seasonality_factor: number;
  recommended_reorder_level: number;
  recommended_reorder_quantity: number;
  next_reorder_date: string;
}

export interface PricingData {
  pricing_source: string;
  unit_price: number;
  total_price: number;
  discount_applied: number;
  margin_percentage: number;
  is_primary: boolean;
}

export const useStockAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCurrentUserOrg = async () => {
      try {
        const { data, error } = await supabase.rpc('dkegl_get_current_user_org');
        if (error) throw error;
        setOrganizationId(data);
      } catch (error) {
        console.error('Error getting user org:', error);
      }
    };

    getCurrentUserOrg();
  }, []);

  const getStockMovements = async (itemCode?: string, days: number = 30): Promise<StockMovement[]> => {
    if (!organizationId) return [];
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('dkegl_get_stock_movements', {
        _org_id: organizationId,
        _item_code: itemCode || null,
        _days: days
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      toast({
        title: "Error",
        description: "Failed to fetch stock movements",
        variant: "destructive"
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getStockAging = async (): Promise<StockAging[]> => {
    if (!organizationId) return [];
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('dkegl_get_stock_aging', {
        _org_id: organizationId
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching stock aging:', error);
      toast({
        title: "Error",
        description: "Failed to fetch stock aging data",
        variant: "destructive"
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const getConsumptionPatterns = async (itemCode?: string): Promise<ConsumptionPattern[]> => {
    if (!organizationId) return [];
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('dkegl_analyze_consumption_patterns', {
        _org_id: organizationId,
        _item_code: itemCode || null
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching consumption patterns:', error);
      toast({
        title: "Error",
        description: "Failed to fetch consumption patterns",
        variant: "destructive"
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const calculateItemPricing = async (
    itemCode: string, 
    customerTier: string = 'standard', 
    quantity: number = 1
  ): Promise<PricingData[]> => {
    if (!organizationId) return [];
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('dkegl_calculate_item_pricing', {
        _org_id: organizationId,
        _item_code: itemCode,
        _customer_tier: customerTier,
        _quantity: quantity
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error calculating pricing:', error);
      toast({
        title: "Error",
        description: "Failed to calculate item pricing",
        variant: "destructive"
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    organizationId,
    getStockMovements,
    getStockAging,
    getConsumptionPatterns,
    calculateItemPricing
  };
};