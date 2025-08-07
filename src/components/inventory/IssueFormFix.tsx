import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

// Temporary fix component for Issue form to ensure correct field names (no unit_cost)
export const IssueFormFields = ({ issueForm, handleInputChange, stockInfo }: {
  issueForm: any;
  handleInputChange: (field: string, value: string) => void;
  stockInfo: any;
}) => {
  const currentStock = stockInfo[issueForm.item_code]?.current_qty || 0;
  
  return (
    <>
      <div>
        <Label htmlFor="qty_issued">Quantity to Issue*</Label>
        <Input
          id="qty_issued"
          type="number"
          step="0.001"
          min="0"
          max={currentStock}
          value={issueForm.qty_issued}
          onChange={(e) => handleInputChange('qty_issued', e.target.value)}
          placeholder="Enter quantity to issue"
          required
        />
        <p className="text-sm text-muted-foreground mt-1">
          Available stock: {currentStock.toLocaleString()}
        </p>
      </div>
    </>
  );
};