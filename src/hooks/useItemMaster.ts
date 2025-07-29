import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDKEGLAuth } from './useDKEGLAuth';

interface ItemMasterItem {
  id: string;
  item_code: string;
  item_name: string;
  uom: string;
  hsn_code?: string;
  category_name?: string;
  pricing_info?: any;
  reorder_level?: number;
  stock_qty?: number;
  last_used?: Date;
  usage_frequency?: number;
  status?: string;
}

export const useItemMaster = () => {
  const [items, setItems] = useState<ItemMasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { organization } = useDKEGLAuth();

  const fetchItems = async (searchTerm?: string) => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Get items from item master as primary source
      let query = supabase
        .from('dkegl_item_master')
        .select(`
          id,
          item_code,
          item_name,
          uom,
          hsn_code,
          pricing_info,
          reorder_level,
          status,
          dkegl_categories (category_name)
        `)
        .eq('organization_id', organization.id)
        .eq('status', 'active')
        .order('item_name');

      if (searchTerm) {
        query = query.or(`item_code.ilike.%${searchTerm}%,item_name.ilike.%${searchTerm}%`);
      }

      const { data: itemData, error: itemError } = await query.limit(100);
      if (itemError) throw itemError;

      // Get aggregated stock quantities for these items
      const itemCodes = itemData?.map(item => item.item_code) || [];
      const { data: stockData, error: stockError } = await supabase
        .from('dkegl_stock')
        .select('item_code, current_qty')
        .eq('organization_id', organization.id)
        .in('item_code', itemCodes);

      if (stockError) throw stockError;

      // Get usage statistics
      const { data: usageData, error: usageError } = await supabase
        .from('dkegl_issue_log')
        .select(`
          item_code,
          date,
          qty_issued
        `)
        .eq('organization_id', organization.id)
        .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (usageError) throw usageError;

      // Calculate usage statistics
      const usageStats = usageData?.reduce((acc, usage) => {
        if (!acc[usage.item_code]) {
          acc[usage.item_code] = {
            usage_frequency: 0,
            last_used: null,
            total_issued: 0
          };
        }
        acc[usage.item_code].usage_frequency++;
        acc[usage.item_code].total_issued += usage.qty_issued;
        const usageDate = new Date(usage.date);
        if (!acc[usage.item_code].last_used || usageDate > acc[usage.item_code].last_used) {
          acc[usage.item_code].last_used = usageDate;
        }
        return acc;
      }, {} as Record<string, { usage_frequency: number; last_used: Date | null; total_issued: number }>) || {};

      // Create stock map for aggregation
      const stockMap = stockData?.reduce((acc, stock) => {
        if (!acc[stock.item_code]) {
          acc[stock.item_code] = 0;
        }
        acc[stock.item_code] += stock.current_qty;
        return acc;
      }, {} as Record<string, number>) || {};

      const transformedItems = itemData?.map(item => {
        const usage = usageStats[item.item_code] || { usage_frequency: 0, last_used: null, total_issued: 0 };
        const totalStock = stockMap[item.item_code] || 0;
        
        return {
          id: item.id,
          item_code: item.item_code,
          item_name: item.item_name,
          uom: item.uom || 'PCS',
          hsn_code: item.hsn_code || '',
          category_name: (item.dkegl_categories as any)?.category_name,
          pricing_info: item.pricing_info,
          reorder_level: item.reorder_level,
          stock_qty: totalStock,
          status: item.status,
          last_used: usage.last_used,
          usage_frequency: usage.usage_frequency
        };
      }) || [];

      setItems(transformedItems);
    } catch (error: any) {
      console.error('Error fetching items:', error);
      toast({
        title: "Error",
        description: "Failed to fetch items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getItemByCode = async (itemCode: string): Promise<ItemMasterItem | null> => {
    if (!organization?.id) return null;
    
    try {
      const { data, error } = await supabase
        .from('dkegl_stock')
        .select(`
          item_code,
          current_qty,
          dkegl_item_master!inner (
            id,
            item_code,
            item_name,
            uom,
            hsn_code,
            pricing_info,
            reorder_level,
            status,
            dkegl_categories (category_name)
          )
        `)
        .eq('organization_id', organization.id)
        .eq('item_code', itemCode)
        .eq('dkegl_item_master.status', 'active')
        .single();

      if (error) throw error;

      const itemMaster = data.dkegl_item_master;
      return {
        id: itemMaster.id,
        item_code: itemMaster.item_code,
        item_name: itemMaster.item_name,
        uom: itemMaster.uom || 'PCS',
        hsn_code: itemMaster.hsn_code || '',
        category_name: (itemMaster.dkegl_categories as any)?.category_name,
        pricing_info: itemMaster.pricing_info,
        reorder_level: itemMaster.reorder_level,
        stock_qty: data.current_qty,
        status: itemMaster.status
      };
    } catch (error: any) {
      console.error('Error fetching item by code:', error);
      return null;
    }
  };

  useEffect(() => {
    if (organization?.id) {
      fetchItems();
    }
  }, [organization?.id]);

  return {
    items,
    loading,
    fetchItems,
    getItemByCode
  };
};