import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Package, Calculator } from 'lucide-react';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';

interface OpeningStockAddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemAdded: () => void;
}

interface ItemMasterItem {
  id: string;
  item_code: string;
  item_name: string;
  uom: string;
  hsn_code?: string;
  category_name?: string;
}

export function OpeningStockAddItemDialog({ 
  open, 
  onOpenChange, 
  onItemAdded 
}: OpeningStockAddItemDialogProps) {
  const { organization } = useDKEGLAuth();
  const [items, setItems] = useState<ItemMasterItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    item_code: '',
    opening_qty: '',
    unit_cost: '',
    opening_date: new Date().toISOString().split('T')[0],
    location: 'MAIN_STORE',
    remarks: ''
  });

  const [selectedItem, setSelectedItem] = useState<ItemMasterItem | null>(null);

  // Fetch items from item master
  useEffect(() => {
    if (open) {
      fetchItems();
    }
  }, [open]);

  const fetchItems = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dkegl_item_master')
        .select(`
          id,
          item_code,
          item_name,
          uom,
          hsn_code,
          dkegl_categories (category_name)
        `)
        .eq('organization_id', organization.id)
        .eq('status', 'active')
        .order('item_name');

      if (error) throw error;

      const transformedItems = data?.map(item => ({
        id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        uom: item.uom || 'PCS',
        hsn_code: item.hsn_code || '',
        category_name: (item.dkegl_categories as any)?.category_name
      })) || [];

      setItems(transformedItems);
    } catch (error) {
      console.error('Error loading items:', error);
      toast({
        title: "Error",
        description: "Failed to load items from master",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelect = (itemCode: string) => {
    const item = items.find(i => i.item_code === itemCode);
    setSelectedItem(item || null);
    setFormData(prev => ({ ...prev, item_code: itemCode }));
  };

  const calculateTotalValue = () => {
    const qty = parseFloat(formData.opening_qty) || 0;
    const cost = parseFloat(formData.unit_cost) || 0;
    return qty * cost;
  };

  const handleSave = async () => {
    if (!organization?.id || !formData.item_code || !formData.opening_qty || !formData.unit_cost) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const openingQty = parseFloat(formData.opening_qty);
      const unitCost = parseFloat(formData.unit_cost);
      
      if (openingQty <= 0) {
        throw new Error("Opening quantity must be greater than zero");
      }
      
      if (unitCost < 0) {
        throw new Error("Unit cost cannot be negative");
      }

      // Save to the actual database
      const { error } = await supabase
        .from('dkegl_opening_stock')
        .insert({
          organization_id: organization.id,
          item_code: formData.item_code,
          opening_qty: openingQty,
          unit_cost: unitCost,
          total_value: openingQty * unitCost,
          opening_date: formData.opening_date,
          location: formData.location,
          remarks: formData.remarks,
          status: 'approved' // Auto-approve for now
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Opening stock item added successfully",
      });

      // Reset form
      setFormData({
        item_code: '',
        opening_qty: '',
        unit_cost: '',
        opening_date: new Date().toISOString().split('T')[0],
        location: 'MAIN_STORE',
        remarks: ''
      });
      setSelectedItem(null);
      
      onItemAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding opening stock:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add opening stock item",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Add Opening Stock Item
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Item Selection */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="item-select">Select Item*</Label>
              <Select onValueChange={handleItemSelect} value={formData.item_code}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an item from master..." />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.item_code} value={item.item_code}>
                      <div className="flex flex-col text-left">
                        <span className="font-medium">{item.item_code}</span>
                        <span className="text-sm text-muted-foreground">{item.item_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Item Details */}
            {selectedItem && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Selected Item Details</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div><strong>Code:</strong> {selectedItem.item_code}</div>
                  <div><strong>Name:</strong> {selectedItem.item_name}</div>
                  <div><strong>UOM:</strong> {selectedItem.uom}</div>
                  {selectedItem.hsn_code && <div><strong>HSN:</strong> {selectedItem.hsn_code}</div>}
                  {selectedItem.category_name && <div><strong>Category:</strong> {selectedItem.category_name}</div>}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quantity and Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="opening-qty">Opening Quantity*</Label>
              <Input
                id="opening-qty"
                type="number"
                step="0.001"
                min="0"
                value={formData.opening_qty}
                onChange={(e) => handleInputChange('opening_qty', e.target.value)}
                placeholder="Enter quantity"
              />
            </div>
            
            <div>
              <Label htmlFor="unit-cost">Unit Cost (INR)*</Label>
              <Input
                id="unit-cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_cost}
                onChange={(e) => handleInputChange('unit_cost', e.target.value)}
                placeholder="Enter unit cost"
              />
            </div>
          </div>

          {/* Date and Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="opening-date">Opening Date*</Label>
              <Input
                id="opening-date"
                type="date"
                value={formData.opening_date}
                onChange={(e) => handleInputChange('opening_date', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div>
              <Label htmlFor="location">Location</Label>
              <Select value={formData.location} onValueChange={(value) => handleInputChange('location', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAIN_STORE">Main Store</SelectItem>
                  <SelectItem value="PRODUCTION_FLOOR">Production Floor</SelectItem>
                  <SelectItem value="QC_HOLD">QC Hold</SelectItem>
                  <SelectItem value="FINISHED_GOODS">Finished Goods</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Total Value Calculation */}
          {formData.opening_qty && formData.unit_cost && (
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calculator className="h-4 w-4" />
                  <span className="font-medium">Total Value:</span>
                  <span className="text-lg font-bold text-primary">
                    ₹{calculateTotalValue().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Remarks */}
          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => handleInputChange('remarks', e.target.value)}
              placeholder="Any additional notes or comments..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.item_code || !formData.opening_qty || !formData.unit_cost || saving}
            >
              {saving ? 'Adding...' : 'Add Opening Stock'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}