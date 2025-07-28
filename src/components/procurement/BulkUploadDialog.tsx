import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useBulkVendorUpload } from '@/hooks/useBulkVendorUpload';
import { 
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Download
} from 'lucide-react';

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const BulkUploadDialog: React.FC<BulkUploadDialogProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const { uploading, uploadResult, uploadVendors, downloadTemplate } = useBulkVendorUpload();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      alert('Please select an Excel file (.xlsx or .xls)');
      return;
    }
    
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    try {
      await uploadVendors(selectedFile);
      onSuccess();
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Vendor Upload</DialogTitle>
          <DialogDescription>
            Upload multiple vendors from an Excel file
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Upload Instructions</span>
              </CardTitle>
              <CardDescription>
                Follow these steps to upload vendors successfully
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">1. Download Template</p>
                  <p className="text-sm text-muted-foreground">
                    Download the Excel template with required columns
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={downloadTemplate}
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </Button>
              </div>
              
              <div className="p-3 border rounded-lg">
                <p className="font-medium">2. Fill Template</p>
                <p className="text-sm text-muted-foreground">
                  Complete the vendor details in the template. Required fields: Vendor Name, Supplier Type
                </p>
              </div>
              
              <div className="p-3 border rounded-lg">
                <p className="font-medium">3. Upload File</p>
                <p className="text-sm text-muted-foreground">
                  Upload the completed Excel file below
                </p>
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          {!uploadResult && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Excel File</CardTitle>
                <CardDescription>
                  Select or drag and drop your Excel file here
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragOver 
                      ? 'border-primary bg-primary/5' 
                      : 'border-muted-foreground/25 hover:border-primary hover:bg-primary/5'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  {selectedFile ? (
                    <div className="space-y-2">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        File size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <div className="flex justify-center space-x-2 mt-4">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedFile(null)}
                        >
                          Remove
                        </Button>
                        <Button
                          onClick={handleUpload}
                          disabled={uploading}
                          className="flex items-center space-x-2"
                        >
                          <Upload className="h-4 w-4" />
                          <span>{uploading ? 'Uploading...' : 'Upload Vendors'}</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                      <div>
                        <p className="text-lg font-medium">Drop your Excel file here</p>
                        <p className="text-muted-foreground">or click to browse</p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.xlsx,.xls';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleFileSelect(file);
                          };
                          input.click();
                        }}
                      >
                        Browse Files
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Progress */}
          {uploading && (
            <Card>
              <CardHeader>
                <CardTitle>Uploading Vendors</CardTitle>
                <CardDescription>Processing your vendor data...</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress value={50} className="w-full" />
                  <p className="text-sm text-muted-foreground text-center">
                    Validating and creating vendor records...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Results */}
          {uploadResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {uploadResult.error_count === 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  )}
                  <span>Upload Results</span>
                </CardTitle>
                <CardDescription>
                  Summary of the vendor upload process
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{uploadResult.total_rows}</div>
                    <div className="text-sm text-muted-foreground">Total Rows</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{uploadResult.success_count}</div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{uploadResult.error_count}</div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </div>
                </div>

                {uploadResult.successful_vendors.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-600 mb-2">Successfully Created Vendors:</h4>
                    <div className="flex flex-wrap gap-2">
                      {uploadResult.successful_vendors.slice(0, 10).map((vendor, index) => (
                        <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                          {vendor}
                        </Badge>
                      ))}
                      {uploadResult.successful_vendors.length > 10 && (
                        <Badge variant="secondary">
                          +{uploadResult.successful_vendors.length - 10} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {uploadResult.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-600 mb-2">Errors Found:</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {uploadResult.errors.map((error, index) => (
                        <Alert key={index} variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Row {error.row}:</strong> {error.errors.join(', ')}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setSelectedFile(null)}>
                    Upload Another File
                  </Button>
                  <Button onClick={handleClose}>
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};