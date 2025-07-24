import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ItemPricing {
  item_code: string;
  standard_cost?: number;
  valuation_method?: string;
  price_tolerance_percentage?: number;
  last_updated?: string;
}

interface PricingMasterHook {
  loading: boolean;
  organizationId: string | null;
  getItemPricing: (itemCode: string) => Promise<ItemPricing | null>;
  getCurrentItemCost: (itemCode: string) => Promise<number>;
  checkPriceVariance: (itemCode: string, newPrice: number) => Promise<{
    hasVariance: boolean;
    variancePercentage: number;
    masterPrice: number;
    tolerance: number;
  }>;
}

export const usePricingMaster = (): PricingMasterHook => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const { data, error } = await supabase.rpc('dkegl_get_current_user_org');
        
        if (error) throw error;
        setOrganizationId(data);
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

  const getItemPricing = async (itemCode: string): Promise<ItemPricing | null> => {
    try {
      if (!organizationId) return null;

      const { data, error } = await supabase
        .rpc('dkegl_get_current_item_pricing', {
          _org_id: organizationId,
          _item_code: itemCode
        });

      if (error) throw error;

      if (data && data.length > 0) {
        const pricing = data[0];
        return {
          item_code: itemCode,
          standard_cost: pricing.standard_cost,
          valuation_method: pricing.valuation_method,
          price_tolerance_percentage: pricing.price_tolerance,
          last_updated: pricing.last_updated
        };
      }

      return null;
    } catch (error: any) {
      console.error('Error fetching item pricing:', error);
      return null;
    }
  };

  const getCurrentItemCost = async (itemCode: string): Promise<number> => {
    try {
      if (!organizationId) return 0;

      // First try to get from pricing master
      const pricing = await getItemPricing(itemCode);
      if (pricing?.standard_cost) {
        return pricing.standard_cost;
      }

      // Fallback to item master pricing info
      const { data: itemData, error } = await supabase
        .from('dkegl_item_master')
        .select('pricing_info')
        .eq('organization_id', organizationId)
        .eq('item_code', itemCode)
        .single();

      if (error) throw error;

      const pricingInfo = itemData?.pricing_info as any;
      return pricingInfo?.unit_cost || 0;
    } catch (error: any) {
      console.error('Error fetching item cost:', error);
      return 0;
    }
  };

  const checkPriceVariance = async (itemCode: string, newPrice: number) => {
    try {
      const pricing = await getItemPricing(itemCode);
      
      if (!pricing?.standard_cost) {
        return {
          hasVariance: false,
          variancePercentage: 0,
          masterPrice: 0,
          tolerance: 10
        };
      }

      const masterPrice = pricing.standard_cost;
      const tolerance = pricing.price_tolerance_percentage || 10;
      const variancePercentage = Math.abs((newPrice - masterPrice) / masterPrice) * 100;
      
      return {
        hasVariance: variancePercentage > tolerance,
        variancePercentage,
        masterPrice,
        tolerance
      };
    } catch (error: any) {
      console.error('Error checking price variance:', error);
      return {
        hasVariance: false,
        variancePercentage: 0,
        masterPrice: 0,
        tolerance: 10
      };
    }
  };

  return {
    loading,
    organizationId,
    getItemPricing,
    getCurrentItemCost,
    checkPriceVariance
  };
};