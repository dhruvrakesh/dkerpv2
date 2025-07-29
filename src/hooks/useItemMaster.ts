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
          dkegl_categories(category_name),
          dkegl_stock(current_qty)
        `)
        .eq('organization_id', organization.id)
        .eq('status', 'active')
        .order('item_name');

      if (searchTerm) {
        query = query.or(`item_code.ilike.%${searchTerm}%,item_name.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      const transformedItems = data?.map(item => ({
        id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        uom: item.uom || 'PCS',
        hsn_code: (item as any).hsn_code || '',
        category_name: (item.dkegl_categories as any)?.category_name,
        pricing_info: item.pricing_info,
        reorder_level: item.reorder_level,
        stock_qty: (item.dkegl_stock as any)?.[0]?.current_qty || 0
      })) || [];

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
        .from('dkegl_item_master')
        .select(`
          id,
          item_code,
          item_name,
          uom,
          hsn_code,
          pricing_info,
          reorder_level,
          dkegl_categories(category_name),
          dkegl_stock(current_qty)
        `)
        .eq('organization_id', organization.id)
        .eq('item_code', itemCode)
        .eq('status', 'active')
        .single();

      if (error) throw error;

      return {
        id: data.id,
        item_code: data.item_code,
        item_name: data.item_name,
        uom: data.uom || 'PCS',
        hsn_code: (data as any).hsn_code || '',
        category_name: (data.dkegl_categories as any)?.category_name,
        pricing_info: data.pricing_info,
        reorder_level: data.reorder_level,
        stock_qty: (data.dkegl_stock as any)?.[0]?.current_qty || 0
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