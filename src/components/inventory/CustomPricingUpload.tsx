import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { CustomPricingUpload as CustomPricingData } from '@/hooks/useStockValuation';

interface CustomPricingUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File, options?: { validateOnly?: boolean }) => Promise<any>;
  uploading: boolean;
  onSuccess?: () => void;
}

export const CustomPricingUpload: React.FC<CustomPricingUploadProps> = ({
  open,
  onOpenChange,
  onUpload,
  uploading,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [step, setStep] = useState<'upload' | 'validate' | 'confirm'>('upload');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setValidationResult(null);
      setStep('upload');
    }
  };

  const handleValidate = async () => {
    if (!selectedFile) return;

    setStep('validate');
    try {
      const result = await onUpload(selectedFile, { validateOnly: true });
      setValidationResult(result);
      setStep('confirm');
    } catch (error) {
      setStep('upload');
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;

    try {
      const result = await onUpload(selectedFile);
      if (result.success) {
        onSuccess?.();
        handleClose();
      }
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setValidationResult(null);
    setStep('upload');
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const template = `item_code,custom_unit_cost,effective_date,notes
RAW001,125.50,2024-01-15,Updated market rate
FG002,890.00,2024-01-15,Special customer pricing
CON003,45.75,2024-01-15,Bulk purchase discount`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'custom_pricing_template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Custom Pricing
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file with custom pricing for your inventory items
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === 'upload' && (
            <>
              {/* Template Download */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Step 1: Download Template</h3>
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </div>
                
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Download the CSV template and fill in your custom pricing data. Required columns: 
                    item_code, custom_unit_cost, effective_date. Optional: notes.
                  </AlertDescription>
                </Alert>
              </div>

              <Separator />

              {/* File Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Step 2: Upload Your File</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="csv-file">Select CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                  />
                </div>

                {selectedFile && (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      <span className="text-sm font-medium">{selectedFile.name}</span>
                      <Badge variant="outline">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </Badge>
                    </div>
                    <Button onClick={handleValidate} disabled={uploading}>
                      {uploading ? <LoadingSpinner /> : 'Validate & Preview'}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 'validate' && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-2">
                <LoadingSpinner />
                <p className="text-sm text-muted-foreground">Validating your data...</p>
              </div>
            </div>
          )}

          {step === 'confirm' && validationResult && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Step 3: Review & Confirm</h3>
              
              {/* Validation Summary */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-success">
                    {validationResult.data?.length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Valid Records</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-destructive">
                    {validationResult.errors?.length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Errors Found</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold">
                    {selectedFile ? (selectedFile.size / 1024).toFixed(1) : 0} KB
                  </div>
                  <p className="text-sm text-muted-foreground">File Size</p>
                </div>
              </div>

              {/* Errors */}
              {validationResult.errors && validationResult.errors.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Found {validationResult.errors.length} error(s):</div>
                    <ul className="text-sm space-y-1">
                      {validationResult.errors.slice(0, 5).map((error: string, index: number) => (
                        <li key={index}>• {error}</li>
                      ))}
                      {validationResult.errors.length > 5 && (
                        <li>• ... and {validationResult.errors.length - 5} more</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview Data */}
              {validationResult.data && validationResult.data.length > 0 && (
                <div className="space-y-2">
                  <Label>Preview (First 5 Records)</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-2 text-left">Item Code</th>
                          <th className="p-2 text-left">Unit Cost</th>
                          <th className="p-2 text-left">Effective Date</th>
                          <th className="p-2 text-left">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {validationResult.data.slice(0, 5).map((row: CustomPricingData, index: number) => (
                          <tr key={index} className="border-t">
                            <td className="p-2">{row.item_code}</td>
                            <td className="p-2">₹{row.custom_unit_cost.toFixed(2)}</td>
                            <td className="p-2">{row.effective_date}</td>
                            <td className="p-2">{row.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Back to Upload
                </Button>
                <div className="space-x-2">
                  <Button variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleConfirmUpload}
                    disabled={uploading || (validationResult.errors?.length > 0)}
                  >
                    {uploading ? (
                      <>
                        <LoadingSpinner />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Upload {validationResult.data?.length || 0} Records
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};