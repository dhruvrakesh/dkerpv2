import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Save, Send, Calculator } from 'lucide-react';
import { usePurchaseOrderManagement, PurchaseOrderItem } from '@/hooks/usePurchaseOrderManagement';
import { useVendorManagement } from '@/hooks/useVendorManagement';
import { useItemMaster } from '@/hooks/useItemMaster';
import { EnterpriseItemSelector } from '@/components/ui/enterprise-item-selector';
import { useToast } from '@/hooks/use-toast';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';
import { supabase } from '@/integrations/supabase/client';

export const CreatePurchaseOrder = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { organization } = useDKEGLAuth();
  const { createPurchaseOrder, generatePONumber } = usePurchaseOrderManagement();
  const { vendors, fetchVendors } = useVendorManagement();
  const { items: availableItems, loading: itemsLoading, getItemByCode } = useItemMaster();

  const [formData, setFormData] = useState({
    vendor_id: '',
    po_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    payment_terms: '',
    shipping_address: '',
    notes: '',
  });

  const [items, setItems] = useState<(PurchaseOrderItem & { 
    hsn_code?: string; 
    gst_rate?: number; 
    cgst_amount?: number; 
    sgst_amount?: number; 
    total_with_tax?: number; 
  })[]>([
    { item_code: '', quantity: 1, unit_price: 0, uom: 'PCS', hsn_code: '', gst_rate: 18, cgst_amount: 0, sgst_amount: 0, total_with_tax: 0 }
  ]);

  const [isDraft, setIsDraft] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gstTotals, setGstTotals] = useState({
    subtotal: 0,
    total_cgst: 0,
    total_sgst: 0,
    total_tax: 0,
    grand_total: 0
  });


  useEffect(() => {
    fetchVendors();
    calculateGSTTotals(); // Calculate initial totals
  }, []);

  const addItem = () => {
    setItems([...items, { item_code: '', quantity: 1, unit_price: 0, uom: 'PCS', hsn_code: '', gst_rate: 18, cgst_amount: 0, sgst_amount: 0, total_with_tax: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = async (index: number, field: keyof PurchaseOrderItem | 'hsn_code' | 'gst_rate', value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if (field === 'item_code') {
      const selectedItem = await getItemByCode(value);
      if (selectedItem) {
        updatedItems[index].item_name = selectedItem.item_name;
        updatedItems[index].uom = selectedItem.uom;
        // Check if item has hsn_code property, fallback to empty string
        updatedItems[index].hsn_code = (selectedItem as any).hsn_code || '';
        // Auto-populate unit price from pricing info if available
        const pricingInfo = selectedItem.pricing_info as any;
        if (pricingInfo?.unit_cost) {
          updatedItems[index].unit_price = pricingInfo.unit_cost;
        }
      }
    }
    
    // Calculate GST amounts when quantity, unit_price, or gst_rate changes
    if (['quantity', 'unit_price', 'gst_rate'].includes(field)) {
      const item = updatedItems[index];
      const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
      const gstRate = item.gst_rate || 18;
      const cgstAmount = (lineTotal * (gstRate / 2)) / 100;
      const sgstAmount = (lineTotal * (gstRate / 2)) / 100;
      
      updatedItems[index].cgst_amount = Math.round(cgstAmount * 100) / 100;
      updatedItems[index].sgst_amount = Math.round(sgstAmount * 100) / 100;
      updatedItems[index].total_with_tax = Math.round((lineTotal + cgstAmount + sgstAmount) * 100) / 100;
    }
    
    setItems(updatedItems);
    calculateGSTTotals(updatedItems);
  };

  const calculateGSTTotals = (itemsList = items) => {
    const subtotal = itemsList.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);
    const total_cgst = itemsList.reduce((sum, item) => sum + (item.cgst_amount || 0), 0);
    const total_sgst = itemsList.reduce((sum, item) => sum + (item.sgst_amount || 0), 0);
    const total_tax = total_cgst + total_sgst;
    const grand_total = subtotal + total_tax;
    
    setGstTotals({
      subtotal: Math.round(subtotal * 100) / 100,
      total_cgst: Math.round(total_cgst * 100) / 100,
      total_sgst: Math.round(total_sgst * 100) / 100,
      total_tax: Math.round(total_tax * 100) / 100,
      grand_total: Math.round(grand_total * 100) / 100
    });
  };

  const calculateTotal = () => {
    return gstTotals.grand_total;
  };

  const validateForm = () => {
    if (!formData.vendor_id) {
      toast({ title: "Error", description: "Please select a vendor", variant: "destructive" });
      return false;
    }
    if (!formData.expected_delivery_date) {
      toast({ title: "Error", description: "Please set expected delivery date", variant: "destructive" });
      return false;
    }
    if (items.some(item => !item.item_code || item.quantity <= 0 || item.unit_price <= 0)) {
      toast({ title: "Error", description: "Please complete all item details", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSave = async (status: 'draft' | 'issued') => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const orderData = {
        ...formData,
        status,
        total_amount: gstTotals.subtotal,
        subtotal_amount: gstTotals.subtotal,
        total_cgst_amount: gstTotals.total_cgst,
        total_sgst_amount: gstTotals.total_sgst,
        grand_total_amount: gstTotals.grand_total,
        items: items.filter(item => item.item_code).map(item => ({
          ...item,
          total_amount: (item.quantity || 0) * (item.unit_price || 0)
        })),
      };

      const poId = await createPurchaseOrder(orderData);
      if (poId) {
        // Create GST summary for this purchase order
        if (organization?.id) {
          await supabase.rpc('dkegl_create_gst_summary', {
            _org_id: organization.id,
            _document_type: 'purchase_order',
            _document_id: poId,
            _line_items: items.filter(item => item.item_code).map(item => ({
              taxable_amount: (item.quantity || 0) * (item.unit_price || 0),
              cgst_amount: item.cgst_amount || 0,
              sgst_amount: item.sgst_amount || 0,
              igst_amount: 0,
              cess_amount: 0
            }))
          });
        }
        
        toast({
          title: "Success",
          description: `Purchase Order ${status === 'draft' ? 'saved as draft' : 'issued'} successfully`,
        });
        navigate('/procurement/purchase-orders');
      }
    } catch (error) {
      console.error('Error saving PO:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Purchase Order</h1>
          <p className="text-muted-foreground">Generate a new purchase order for vendor procurement</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave('draft')}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button
            onClick={() => handleSave('issued')}
            disabled={saving}
          >
            <Send className="h-4 w-4 mr-2" />
            Issue PO
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Details</CardTitle>
            <CardDescription>Basic information for the purchase order</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor *</Label>
                <Select 
                  value={formData.vendor_id} 
                  onValueChange={(value) => setFormData({...formData, vendor_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.vendor_name} ({vendor.vendor_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="po_date">Order Date</Label>
                <Input
                  type="date"
                  value={formData.po_date}
                  onChange={(e) => setFormData({...formData, po_date: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery_date">Expected Delivery Date *</Label>
                <Input
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({...formData, expected_delivery_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Input
                  placeholder="e.g., Net 30, COD"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shipping_address">Shipping Address</Label>
              <Textarea
                placeholder="Enter delivery address"
                value={formData.shipping_address}
                onChange={(e) => setFormData({...formData, shipping_address: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                placeholder="Additional notes or instructions"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Line Items
              <Button onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardTitle>
            <CardDescription>Add items to this purchase order</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Item Code</TableHead>
                  <TableHead>HSN Code</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>GST %</TableHead>
                  <TableHead>CGST</TableHead>
                  <TableHead>SGST</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <EnterpriseItemSelector
                        items={availableItems}
                        value={item.item_code}
                        onValueChange={(value) => updateItem(index, 'item_code', value)}
                        placeholder="Select item"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.hsn_code || ''}
                        onChange={(e) => updateItem(index, 'hsn_code', e.target.value)}
                        placeholder="HSN Code"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={item.uom}
                        onChange={(e) => updateItem(index, 'uom', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.gst_rate || 18}
                        onChange={(e) => updateItem(index, 'gst_rate', parseFloat(e.target.value) || 18)}
                      />
                    </TableCell>
                    <TableCell>
                      ₹{(item.cgst_amount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      ₹{(item.sgst_amount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      ₹{(item.total_with_tax || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-end mt-4 pt-4 border-t">
              <div className="text-right space-y-2">
                <div className="flex justify-between gap-8">
                  <span>Subtotal:</span>
                  <span>₹{gstTotals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span>CGST:</span>
                  <span>₹{gstTotals.total_cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-8">
                  <span>SGST:</span>
                  <span>₹{gstTotals.total_sgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between gap-8 font-semibold text-lg border-t pt-2">
                  <span>Grand Total:</span>
                  <span>₹{gstTotals.grand_total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};