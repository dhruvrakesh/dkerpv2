import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OpeningStockItem {
  id: string;
  item_code: string;
  item_name: string;
  category_name: string;
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
    item_name: string;
    category_name: string;
    location: string;
    opening_qty: number;
    unit_cost: number;
    opening_date: string;
    remarks: string;
    approval_status: 'pending' | 'approved' | 'rejected';
  }>({
    item_name: '',
    category_name: '',
    location: 'main',
    opening_qty: 0,
    unit_cost: 0,
    opening_date: new Date().toISOString().split('T')[0],
    remarks: '',
    approval_status: 'pending'
  });

  useEffect(() => {
    if (item) {
      setFormData({
        item_name: item.item_name || '',
        category_name: item.category_name || '',
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

  const totalValue = formData.opening_qty * formData.unit_cost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Edit Opening Stock - {item?.item_code}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="item_name">Item Name</Label>
            <Input
              id="item_name"
              value={formData.item_name}
              onChange={(e) => handleInputChange('item_name', e.target.value)}
              placeholder="Enter item name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_name">Category</Label>
            <Input
              id="category_name"
              value={formData.category_name}
              onChange={(e) => handleInputChange('category_name', e.target.value)}
              placeholder="Enter category"
            />
          </div>

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
            <Label htmlFor="opening_qty">Opening Quantity</Label>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}