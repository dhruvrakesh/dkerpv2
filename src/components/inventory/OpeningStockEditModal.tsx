import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnterpriseItemSelector } from '@/components/ui/enterprise-item-selector';
import { useItemMaster } from '@/hooks/useItemMaster';

interface OpeningStockItem {
  id: string;
  item_code: string;
  item_name?: string; // From joined item master (read-only)
  category_name?: string; // From joined categories (read-only)
  uom?: string; // From joined item master (read-only)
  hsn_code?: string; // From joined item master (read-only)
  item_status?: string; // From joined item master (read-only)
  location: string;
  opening_qty: number;
  unit_cost: number;
  opening_date: string;
  remarks?: string;
  approval_status: 'pending' | 'approved' | 'rejected';
}

interface OpeningStockEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: OpeningStockItem | null;
  onSave: (itemId: string, updates: Partial<OpeningStockItem>) => Promise<void>;
  saving?: boolean;
}

export function OpeningStockEditModal({
  open,
  onOpenChange,
  item,
  onSave,
  saving = false
}: OpeningStockEditModalProps) {
  const [formData, setFormData] = useState<{
    item_code: string;
    location: string;
    opening_qty: number;
    unit_cost: number;
    opening_date: string;
    remarks: string;
    approval_status: 'pending' | 'approved' | 'rejected';
  }>({
    item_code: '',
    location: 'main',
    opening_qty: 0,
    unit_cost: 0,
    opening_date: new Date().toISOString().split('T')[0],
    remarks: '',
    approval_status: 'pending'
  });

  const { items, fetchItems } = useItemMaster();

  useEffect(() => {
    if (open) {
      fetchItems();
    }
  }, [open, fetchItems]);

  useEffect(() => {
    if (item) {
      setFormData({
        item_code: item.item_code || '',
        location: item.location || 'main',
        opening_qty: item.opening_qty || 0,
        unit_cost: item.unit_cost || 0,
        opening_date: item.opening_date ? item.opening_date.split('T')[0] : new Date().toISOString().split('T')[0],
        remarks: item.remarks || '',
        approval_status: item.approval_status || 'pending'
      });
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;
    
    await onSave(item.id, formData);
    onOpenChange(false);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemSelect = (itemCode: string) => {
    setFormData(prev => ({
      ...prev,
      item_code: itemCode
    }));
  };

  // Get selected item details for display
  const selectedItem = items.find(i => i.item_code === formData.item_code);

  const totalValue = formData.opening_qty * formData.unit_cost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Edit Opening Stock - {item?.item_code}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Selection Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item_selector">Item Selection *</Label>
              <EnterpriseItemSelector
                items={items.map(item => ({
                  id: item.id,
                  item_code: item.item_code,
                  item_name: item.item_name,
                  uom: item.uom,
                  category_name: item.category_name,
                  status: item.status,
                  last_used: item.last_used,
                  usage_frequency: item.usage_frequency
                }))}
                value={formData.item_code}
                onValueChange={handleItemSelect}
                placeholder="Search and select an item..."
                showCategories={true}
                showRecentItems={true}
              />
            </div>

            {selectedItem && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <h4 className="font-medium text-sm">Item Details (Read-only)</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Item Code:</span>
                    <div className="font-medium">{selectedItem.item_code}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Item Name:</span>
                    <div className="font-medium">{selectedItem.item_name || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <div className="font-medium">{selectedItem.category_name || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">UOM:</span>
                    <div className="font-medium">{selectedItem.uom || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">HSN Code:</span>
                    <div className="font-medium">{selectedItem.hsn_code || 'N/A'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <div className="font-medium">{selectedItem.status || 'N/A'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stock Details Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="Storage location"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="opening_date">Opening Date</Label>
              <Input
                id="opening_date"
                type="date"
                value={formData.opening_date}
                onChange={(e) => handleInputChange('opening_date', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="opening_qty">Opening Quantity {selectedItem?.uom && `(${selectedItem.uom})`}</Label>
              <Input
                id="opening_qty"
                type="number"
                step="0.001"
                min="0"
                value={formData.opening_qty}
                onChange={(e) => handleInputChange('opening_qty', parseFloat(e.target.value) || 0)}
                placeholder="0.000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_cost">Unit Cost (₹)</Label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_cost}
                onChange={(e) => handleInputChange('unit_cost', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Total Value</Label>
              <div className="px-3 py-2 bg-muted rounded-md text-sm font-medium">
                ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approval_status">Approval Status</Label>
              <Select 
                value={formData.approval_status} 
                onValueChange={(value: 'pending' | 'approved' | 'rejected') => 
                  handleInputChange('approval_status', value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                placeholder="Enter any remarks or notes..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !formData.item_code}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}