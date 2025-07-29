import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDKEGLAuth } from './useDKEGLAuth';

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
  po_date: string;
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
  const { organization } = useDKEGLAuth();

  const fetchPurchaseOrders = async (filters?: {
    status?: string;
    vendor_id?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    if (!organization?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // First fetch purchase orders
      let poQuery = supabase
        .from('dkegl_purchase_orders')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        poQuery = poQuery.eq('status', filters.status);
      }
      if (filters?.vendor_id) {
        poQuery = poQuery.eq('vendor_id', filters.vendor_id);
      }
      if (filters?.start_date) {
        poQuery = poQuery.gte('po_date', filters.start_date);
      }
      if (filters?.end_date) {
        poQuery = poQuery.lte('po_date', filters.end_date);
      }

      const { data: purchaseOrdersData, error: poError } = await poQuery;
      if (poError) throw poError;

      // Fetch vendors separately
      const { data: vendorsData, error: vendorError } = await supabase
        .from('dkegl_vendors')
        .select('id, vendor_name')
        .eq('organization_id', organization.id);
      if (vendorError) throw vendorError;

      // Fetch PO items separately - filter by organization via purchase orders
      const { data: poItemsData, error: itemsError } = await supabase
        .from('dkegl_po_items')
        .select('*, dkegl_purchase_orders!inner(organization_id)')
        .eq('dkegl_purchase_orders.organization_id', organization.id);
      if (itemsError) throw itemsError;

      // Create vendor lookup
      const vendorMap = new Map(vendorsData?.map(v => [v.id, v.vendor_name]) || []);
      
      // Create items lookup
      const itemsMap = new Map();
      poItemsData?.forEach(item => {
        if (!itemsMap.has(item.po_id)) {
          itemsMap.set(item.po_id, []);
        }
        itemsMap.get(item.po_id).push(item);
      });

      const formattedOrders: PurchaseOrder[] = purchaseOrdersData?.map(order => ({
        id: order.id,
        po_number: order.po_number,
        vendor_id: order.vendor_id,
        vendor_name: vendorMap.get(order.vendor_id) || 'Unknown',
        po_date: order.po_date,
        expected_delivery_date: order.expected_delivery_date,
        status: order.status as 'draft' | 'issued' | 'approved' | 'received' | 'cancelled',
        total_amount: order.total_amount,
        payment_terms: '',
        shipping_address: '',
        notes: order.notes || '',
        created_by: order.created_by,
        approved_by: order.approved_by,
        approved_at: order.approved_at,
        organization_id: order.organization_id,
        items: itemsMap.get(order.id) || []
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
      if (!organization?.id) {
        throw new Error('Organization not found');
      }

      const { data, error } = await supabase.rpc('dkegl_generate_vendor_code', {
        _org_id: organization.id
      });

      if (error) throw error;
      
      // Convert vendor code pattern to PO pattern
      const poNumber = data.replace('V-', 'PO-');
      return poNumber;
    } catch (error) {
      console.error('Error generating PO number:', error);
      // Fallback to organization-specific PO number
      const orgCode = organization?.code || 'ORG';
      return `${orgCode}-PO-${Date.now()}`;
    }
  };

  const createPurchaseOrder = async (orderData: Omit<PurchaseOrder, 'id' | 'po_number'>): Promise<string | null> => {
    try {
      if (!organization?.id) {
        throw new Error('Organization context not available');
      }

      const poNumber = await generatePONumber();
      
      const { data: poData, error: poError } = await supabase
        .from('dkegl_purchase_orders')
        .insert({
          organization_id: organization.id,
          po_number: poNumber,
          vendor_id: orderData.vendor_id,
          po_date: orderData.po_date,
          expected_delivery_date: orderData.expected_delivery_date,
          status: orderData.status,
          total_amount: orderData.total_amount,
          notes: orderData.notes,
        })
        .select()
        .single();

      if (poError) throw poError;

      // Insert PO items
      if (orderData.items.length > 0) {
        const itemsToInsert = orderData.items.map(item => ({
          organization_id: organization.id,
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
        .eq('id', id)
        .eq('organization_id', organization?.id);

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

  const markPOAsReceived = async (id: string): Promise<boolean> => {
    return updatePurchaseOrder(id, { status: 'received' });
  };

  const getPODeliveryStatus = async (id: string) => {
    try {
      const poItemsResponse = await supabase
        .from('dkegl_po_items')
        .select('item_code, quantity, unit_price, dkegl_purchase_orders!inner(organization_id)')
        .eq('po_id', id)
        .eq('dkegl_purchase_orders.organization_id', organization?.id);

      if (poItemsResponse.error) {
        console.error('PO items fetch error:', poItemsResponse.error);
        return [];
      }

      const poItems = poItemsResponse.data || [];
      
      if (poItems.length === 0) {
        return [];
      }

      const deliveryStatus = poItems.map(poItem => ({
        item_code: poItem.item_code,
        ordered_qty: poItem.quantity,
        received_qty: 0,
        pending_qty: poItem.quantity,
        delivery_percentage: 0
      }));

      return deliveryStatus;
    } catch (error) {
      console.error('Error getting PO delivery status:', error);
      return [];
    }
  };

  const deletePurchaseOrder = async (id: string): Promise<boolean> => {
    try {
      // First verify the PO belongs to the organization
      const { data: poData } = await supabase
        .from('dkegl_purchase_orders')
        .select('id')
        .eq('id', id)
        .eq('organization_id', organization?.id)
        .single();
        
      if (!poData) {
        throw new Error('Purchase order not found or access denied');
      }

      // Delete PO items first
      await supabase
        .from('dkegl_po_items')
        .delete()
        .eq('po_id', id);

      // Delete the purchase order
      const { error } = await supabase
        .from('dkegl_purchase_orders')
        .delete()
        .eq('id', id)
        .eq('organization_id', organization?.id);

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
    if (organization?.id) {
      fetchPurchaseOrders();
    }
  }, [organization?.id]);

  return {
    purchaseOrders,
    loading,
    fetchPurchaseOrders,
    createPurchaseOrder,
    updatePurchaseOrder,
    approvePurchaseOrder,
    issuePurchaseOrder,
    cancelPurchaseOrder,
    markPOAsReceived,
    getPODeliveryStatus,
    deletePurchaseOrder,
    generatePONumber,
  };
};