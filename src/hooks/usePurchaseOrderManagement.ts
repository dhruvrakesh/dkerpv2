import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PurchaseOrderItem {
  id?: string;
  item_code: string;
  item_name?: string;
  quantity: number;
  unit_price: number;
  uom: string;
  total_amount?: number;
}

export interface PurchaseOrder {
  id?: string;
  po_number?: string;
  vendor_id: string;
  vendor_name?: string;
  order_date: string;
  expected_delivery_date: string;
  status: 'draft' | 'issued' | 'approved' | 'received' | 'cancelled';
  total_amount: number;
  payment_terms?: string;
  shipping_address?: string;
  notes?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  organization_id?: string;
  items: PurchaseOrderItem[];
}

export const usePurchaseOrderManagement = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPurchaseOrders = async (filters?: {
    status?: string;
    vendor_id?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    setLoading(true);
    try {
      let query = supabase
        .from('dkegl_purchase_orders')
        .select(`
          *,
          dkegl_vendors!inner(vendor_name),
          dkegl_po_items(*)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.vendor_id) {
        query = query.eq('vendor_id', filters.vendor_id);
      }
      if (filters?.start_date) {
        query = query.gte('order_date', filters.start_date);
      }
      if (filters?.end_date) {
        query = query.lte('order_date', filters.end_date);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedOrders = data?.map(order => ({
        id: order.id,
        po_number: order.po_number,
        vendor_id: order.vendor_id,
        vendor_name: order.dkegl_vendors?.vendor_name,
        order_date: order.po_date,
        expected_delivery_date: order.expected_delivery_date,
        status: order.status as 'draft' | 'issued' | 'approved' | 'received' | 'cancelled',
        total_amount: order.total_amount,
        payment_terms: '',
        shipping_address: '',
        notes: order.notes,
        created_by: order.created_by,
        approved_by: order.approved_by,
        approved_at: order.approved_at,
        organization_id: order.organization_id,
        items: order.dkegl_po_items || []
      })) || [];

      setPurchaseOrders(formattedOrders);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch purchase orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePONumber = async (): Promise<string> => {
    try {
      const { data, error } = await supabase.rpc('dkegl_generate_vendor_code', {
        _org_id: 'current_org_id' // This should be replaced with actual org ID
      });

      if (error) throw error;
      
      // Convert vendor code pattern to PO pattern
      const poNumber = data.replace('V-', 'PO-');
      return poNumber;
    } catch (error) {
      console.error('Error generating PO number:', error);
      // Fallback to timestamp-based PO number
      return `PO-${Date.now()}`;
    }
  };

  const createPurchaseOrder = async (orderData: Omit<PurchaseOrder, 'id' | 'po_number'>): Promise<string | null> => {
    try {
      const poNumber = await generatePONumber();
      
      const { data: poData, error: poError } = await supabase
        .from('dkegl_purchase_orders')
        .insert({
          po_number: poNumber,
          vendor_id: orderData.vendor_id,
          po_date: orderData.order_date,
          expected_delivery_date: orderData.expected_delivery_date,
          status: orderData.status,
          total_amount: orderData.total_amount,
          // payment_terms: orderData.payment_terms,
          // shipping_address: orderData.shipping_address,
          notes: orderData.notes,
        })
        .select()
        .single();

      if (poError) throw poError;

      // Insert PO items
      if (orderData.items.length > 0) {
        const itemsToInsert = orderData.items.map(item => ({
          po_id: poData.id,
          item_code: item.item_code,
          item_name: item.item_name || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          uom: item.uom,
          total_amount: item.quantity * item.unit_price,
        }));

        const { error: itemsError } = await supabase
          .from('dkegl_po_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      await fetchPurchaseOrders();
      
      toast({
        title: "Success",
        description: `Purchase Order ${poNumber} created successfully`,
      });

      return poData.id;
    } catch (error) {
      console.error('Error creating purchase order:', error);
      toast({
        title: "Error",
        description: "Failed to create purchase order",
        variant: "destructive",
      });
      return null;
    }
  };

  const updatePurchaseOrder = async (id: string, updates: Partial<PurchaseOrder>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('dkegl_purchase_orders')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await fetchPurchaseOrders();
      
      toast({
        title: "Success",
        description: "Purchase order updated successfully",
      });

      return true;
    } catch (error) {
      console.error('Error updating purchase order:', error);
      toast({
        title: "Error",
        description: "Failed to update purchase order",
        variant: "destructive",
      });
      return false;
    }
  };

  const approvePurchaseOrder = async (id: string): Promise<boolean> => {
    return updatePurchaseOrder(id, {
      status: 'approved',
      approved_at: new Date().toISOString(),
    });
  };

  const issuePurchaseOrder = async (id: string): Promise<boolean> => {
    return updatePurchaseOrder(id, { status: 'issued' });
  };

  const cancelPurchaseOrder = async (id: string): Promise<boolean> => {
    return updatePurchaseOrder(id, { status: 'cancelled' });
  };

  const deletePurchaseOrder = async (id: string): Promise<boolean> => {
    try {
      // Delete PO items first
      await supabase
        .from('dkegl_po_items')
        .delete()
        .eq('po_id', id);

      // Delete the purchase order
      const { error } = await supabase
        .from('dkegl_purchase_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchPurchaseOrders();
      
      toast({
        title: "Success",
        description: "Purchase order deleted successfully",
      });

      return true;
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      toast({
        title: "Error",
        description: "Failed to delete purchase order",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  return {
    purchaseOrders,
    loading,
    fetchPurchaseOrders,
    createPurchaseOrder,
    updatePurchaseOrder,
    approvePurchaseOrder,
    issuePurchaseOrder,
    cancelPurchaseOrder,
    deletePurchaseOrder,
    generatePONumber,
  };
};