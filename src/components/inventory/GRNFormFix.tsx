import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

// Temporary fix component for GRN form to ensure correct field names
export const GRNFormFields = ({ grnForm, handleInputChange }: {
  grnForm: any;
  handleInputChange: (field: string, value: string) => void;
}) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="qty_received">Quantity Received*</Label>
          <Input
            id="qty_received"
            type="number"
            step="0.001"
            min="0"
            value={grnForm.qty_received}
            onChange={(e) => handleInputChange('qty_received', e.target.value)}
            placeholder="Enter quantity received"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="unit_rate">Unit Rate (INR)*</Label>
          <Input
            id="unit_rate"
            type="number"
            step="0.01"
            min="0"
            value={grnForm.unit_rate}
            onChange={(e) => handleInputChange('unit_rate', e.target.value)}
            placeholder="Enter unit rate"
            required
          />
        </div>
      </div>
    </>
  );
};