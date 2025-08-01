import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface OpeningStockItem {
  item_code: string;
  item_name: string;
  opening_qty: number;
  unit_cost: number;
  opening_date: string;
  is_valid: boolean;
  validation_errors?: string[];
}

interface OpeningStockEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: OpeningStockItem | null;
  onSave: (itemCode: string, updates: { opening_qty: number; unit_cost: number }, reason: string) => Promise<void>;
  loading?: boolean;
}

export function OpeningStockEditModal({
  open,
  onOpenChange,
  item,
  onSave,
  loading = false
}: OpeningStockEditModalProps) {
  const [formData, setFormData] = useState({
    opening_qty: 0,
    unit_cost: 0,
    reason: ''
  });
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (item) {
      setFormData({
        opening_qty: item.opening_qty,
        unit_cost: item.unit_cost,
        reason: ''
      });
      setErrors([]);
    }
  }, [item]);

  const calculateVariance = (oldValue: number, newValue: number) => {
    if (oldValue === 0) return 0;
    return ((newValue - oldValue) / oldValue) * 100;
  };

  const validateForm = () => {
    const newErrors: string[] = [];

    if (formData.opening_qty < 0) {
      newErrors.push('Opening quantity cannot be negative');
    }

    if (formData.unit_cost < 0) {
      newErrors.push('Unit cost cannot be negative');
    }

    if (!formData.reason.trim()) {
      newErrors.push('Reason for change is required');
    }

    if (formData.reason.trim().length < 5) {
      newErrors.push('Reason must be at least 5 characters');
    }

    // Note: Removed variance blocking - these are now just warnings, not errors

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = async () => {
    if (!item || !validateForm()) return;

    try {
      await onSave(item.item_code, {
        opening_qty: formData.opening_qty,
        unit_cost: formData.unit_cost
      }, formData.reason);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving opening stock:', error);
    }
  };

  const hasChanges = item && (
    item.opening_qty !== formData.opening_qty || 
    item.unit_cost !== formData.unit_cost
  );

  const qtyVariance = item ? calculateVariance(item.opening_qty, formData.opening_qty) : 0;
  const costVariance = item ? calculateVariance(item.unit_cost, formData.unit_cost) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Opening Stock</DialogTitle>
        </DialogHeader>

        {item && (
          <div className="space-y-4">
            {/* Item Info */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="text-sm font-medium">{item.item_code}</div>
              <div className="text-sm text-muted-foreground">{item.item_name}</div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opening_qty">Opening Quantity</Label>
                <Input
                  id="opening_qty"
                  type="number"
                  step="0.01"
                  value={formData.opening_qty}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    opening_qty: parseFloat(e.target.value) || 0 
                  }))}
                />
                {Math.abs(qtyVariance) > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    {qtyVariance > 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={qtyVariance > 0 ? "text-green-600" : "text-red-600"}>
                      {qtyVariance > 0 ? '+' : ''}{qtyVariance.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_cost">Unit Cost (₹)</Label>
                <Input
                  id="unit_cost"
                  type="number"
                  step="0.01"
                  value={formData.unit_cost}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    unit_cost: parseFloat(e.target.value) || 0 
                  }))}
                />
                {Math.abs(costVariance) > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    {costVariance > 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span className={costVariance > 0 ? "text-green-600" : "text-red-600"}>
                      {costVariance > 0 ? '+' : ''}{costVariance.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Value Calculation */}
            {hasChanges && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm font-medium text-blue-900 mb-2">Value Impact</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-blue-700">Previous Value:</div>
                    <div className="font-medium">₹{(item.opening_qty * item.unit_cost).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-blue-700">New Value:</div>
                    <div className="font-medium">₹{(formData.opening_qty * formData.unit_cost).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Reason Field */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Change *</Label>
              <Textarea
                id="reason"
                placeholder="Provide a detailed reason for this modification..."
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  reason: e.target.value 
                }))}
                rows={3}
              />
            </div>

            {/* Validation Errors */}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings for significant changes */}
            {item && (
              <>
                {Math.abs(qtyVariance) > 50 && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      Warning: Quantity change exceeds 50%. Please verify this is correct.
                    </AlertDescription>
                  </Alert>
                )}
                {Math.abs(costVariance) > 10 && (
                  <Alert className="border-yellow-200 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      Warning: Cost change exceeds 10%. This may indicate pricing inconsistency.
                    </AlertDescription>
                  </Alert>
                )}
                {(Math.abs(qtyVariance) > 5 || Math.abs(costVariance) > 5) && errors.length === 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This modification will be logged in the audit trail for review.
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || errors.length > 0 || loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}