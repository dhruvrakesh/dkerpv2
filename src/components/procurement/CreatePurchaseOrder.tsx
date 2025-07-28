import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Save, Send } from 'lucide-react';
import { usePurchaseOrderManagement, PurchaseOrderItem } from '@/hooks/usePurchaseOrderManagement';
import { useVendorManagement } from '@/hooks/useVendorManagement';
import { useItemMaster } from '@/hooks/useItemMaster';
import { EnterpriseItemSelector } from '@/components/ui/enterprise-item-selector';
import { useToast } from '@/hooks/use-toast';

export const CreatePurchaseOrder = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
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

  const [items, setItems] = useState<PurchaseOrderItem[]>([
    { item_code: '', quantity: 1, unit_price: 0, uom: 'PCS' }
  ]);

  const [isDraft, setIsDraft] = useState(true);
  const [saving, setSaving] = useState(false);


  useEffect(() => {
    fetchVendors();
  }, []);

  const addItem = () => {
    setItems([...items, { item_code: '', quantity: 1, unit_price: 0, uom: 'PCS' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = async (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    if (field === 'item_code') {
      const selectedItem = await getItemByCode(value);
      if (selectedItem) {
        updatedItems[index].item_name = selectedItem.item_name;
        updatedItems[index].uom = selectedItem.uom;
        // Auto-populate unit price from pricing info if available
        const pricingInfo = selectedItem.pricing_info as any;
        if (pricingInfo?.unit_cost) {
          updatedItems[index].unit_price = pricingInfo.unit_cost;
        }
      }
    }
    setItems(updatedItems);
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
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
        total_amount: calculateTotal(),
        items: items.filter(item => item.item_code),
      };

      const poId = await createPurchaseOrder(orderData);
      if (poId) {
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
                  <TableHead className="w-[250px]">Item Code</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>Unit Price</TableHead>
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
                      ₹{(item.quantity * item.unit_price).toFixed(2)}
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
              <div className="text-right">
                <p className="text-lg font-semibold">
                  Total Amount: ₹{calculateTotal().toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};