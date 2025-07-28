import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileSpreadsheet, Upload, CheckCircle, AlertCircle, Download, Eye } from 'lucide-react';
import useDKPKLBulkUpload, { DKPKLImportType } from '@/hooks/useDKPKLBulkUpload';

const DKPKLTallyImport: React.FC = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedImportType, setSelectedImportType] = useState<DKPKLImportType>('SALES');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isUploading,
    uploadProgress,
    currentBatch,
    qualityMetrics,
    uploadFile,
    approveBatch,
    exportValidationReport
  } = useDKPKLBulkUpload();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Please select an Excel file (.xlsx or .xls)');
      return;
    }

    // Validate period
    if (!periodFrom || !periodTo) {
      alert('Please select the period from and to dates');
      return;
    }

    try {
      await uploadFile(file, selectedImportType, periodFrom, periodTo);
      setActiveTab('preview');
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleApprove = async () => {
    if (!currentBatch) return;
    
    try {
      await approveBatch(currentBatch.id, approvalNotes);
      setActiveTab('completed');
    } catch (error) {
      console.error('Approval failed:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending' },
      processing: { variant: 'default' as const, label: 'Processing' },
      processed: { variant: 'default' as const, label: 'Processed' },
      completed: { variant: 'default' as const, label: 'Completed' },
      failed: { variant: 'destructive' as const, label: 'Failed' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getImportTypeDescription = (type: DKPKLImportType) => {
    const descriptions = {
      SALES: 'Sales vouchers, invoices, and customer transactions',
      PURCHASE: 'Purchase vouchers, bills, and vendor transactions',
      VOUCHER: 'Journal entries, payment vouchers, and ledger transactions',
      STOCK: 'Stock movements, inventory adjustments, and godown transfers',
      PAYROLL: 'Salary payments, employee benefits, and payroll transactions'
    };
    return descriptions[type];
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">DKPKL Tally Import</h1>
        <p className="text-muted-foreground mt-2">
          Import and reconcile data from Tally exports into DKEGL ERP system
        </p>
        {currentBatch && (
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm text-muted-foreground">Current Batch:</span>
            <span className="font-medium">{currentBatch.file_name}</span>
            {getStatusBadge(currentBatch.status)}
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Processing Tally Import...</span>
                <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="preview" disabled={!currentBatch}>Preview</TabsTrigger>
          <TabsTrigger value="quality" disabled={!qualityMetrics}>Quality</TabsTrigger>
          <TabsTrigger value="completed" disabled={!currentBatch || currentBatch.status !== 'completed'}>
            Completed
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Upload Tally Export
              </CardTitle>
              <CardDescription>
                Select your Tally Excel export file and configure import settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Import Type Selection */}
              <div className="space-y-3">
                <Label htmlFor="import-type">Import Type</Label>
                <Select value={selectedImportType} onValueChange={(value) => setSelectedImportType(value as DKPKLImportType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select import type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SALES">Sales Vouchers</SelectItem>
                    <SelectItem value="PURCHASE">Purchase Vouchers</SelectItem>
                    <SelectItem value="VOUCHER">Journal Vouchers</SelectItem>
                    <SelectItem value="STOCK">Stock Journal</SelectItem>
                    <SelectItem value="PAYROLL">Payroll Data</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {getImportTypeDescription(selectedImportType)}
                </p>
              </div>

              {/* Period Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="period-from">Period From</Label>
                  <Input
                    id="period-from"
                    type="date"
                    value={periodFrom}
                    onChange={(e) => setPeriodFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="period-to">Period To</Label>
                  <Input
                    id="period-to"
                    type="date"
                    value={periodTo}
                    onChange={(e) => setPeriodTo(e.target.value)}
                  />
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-3">
                <Label htmlFor="file-upload">Tally Excel File</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <div className="space-y-3">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Click to upload Tally export file</p>
                      <p className="text-xs text-muted-foreground">Excel files only (.xlsx, .xls)</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || !periodFrom || !periodTo}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Select File
                    </Button>
                  </div>
                </div>
              </div>

              {/* Import Requirements */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Ensure your Tally export includes all required columns for {selectedImportType.toLowerCase()} data.
                  The system will automatically detect column mappings based on standard Tally export formats.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Import Preview
              </CardTitle>
              <CardDescription>
                Review the imported data before final processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentBatch && (
                <>
                  {/* Batch Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Import Type</div>
                      <div className="font-semibold">{currentBatch.import_type}</div>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Period</div>
                      <div className="font-semibold">
                        {currentBatch.period_start} to {currentBatch.period_end}
                      </div>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="text-sm text-muted-foreground">Records</div>
                      <div className="font-semibold">{currentBatch.total_rows || 0}</div>
                    </div>
                  </div>

                  {/* Quality Summary */}
                  {qualityMetrics && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="text-sm text-green-600">Valid Records</div>
                        <div className="font-bold text-green-700">{qualityMetrics.valid_records}</div>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <div className="text-sm text-red-600">Invalid Records</div>
                        <div className="font-bold text-red-700">{qualityMetrics.invalid_records}</div>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <div className="text-sm text-yellow-600">Warnings</div>
                        <div className="font-bold text-yellow-700">{qualityMetrics.warning_records}</div>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <div className="text-sm text-blue-600">Overall Score</div>
                        <div className="font-bold text-blue-700">{qualityMetrics.overall_score}%</div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      variant="outline"
                      onClick={() => exportValidationReport(currentBatch.id)}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Report
                    </Button>
                    <div className="flex-1 space-y-3">
                      <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
                      <Textarea
                        id="approval-notes"
                        placeholder="Add notes about this import batch..."
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        className="h-20"
                      />
                    </div>
                    <Button
                      onClick={handleApprove}
                      disabled={currentBatch.status === 'completed'}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {currentBatch.status === 'completed' ? 'Approved' : 'Approve Import'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Tab */}
        <TabsContent value="quality" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Quality Analysis</CardTitle>
              <CardDescription>
                Detailed analysis of data quality and validation results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {qualityMetrics && (
                <div className="space-y-6">
                  {/* Quality Scores */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">{qualityMetrics.completeness_score}%</div>
                      <div className="text-sm text-muted-foreground">Completeness</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">{qualityMetrics.accuracy_score}%</div>
                      <div className="text-sm text-muted-foreground">Accuracy</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">{qualityMetrics.overall_score}%</div>
                      <div className="text-sm text-muted-foreground">Overall Score</div>
                    </div>
                  </div>

                  {/* Quality Recommendations */}
                  <div className="space-y-3">
                    <h4 className="font-medium">Quality Recommendations</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Import type detection successful</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Column mapping completed automatically</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm">Date format validation passed</span>
                      </div>
                      {qualityMetrics.invalid_records > 0 && (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm">Review invalid records before final import</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Import Completed
              </CardTitle>
              <CardDescription>
                Tally import has been successfully processed and approved
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentBatch && qualityMetrics && (
                <div className="space-y-6">
                  {/* Success Summary */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="text-center space-y-2">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                      <h3 className="text-lg font-semibold text-green-700">Import Successful!</h3>
                      <p className="text-green-600">
                        Successfully processed {qualityMetrics.valid_records} records from {currentBatch.file_name}
                      </p>
                    </div>
                  </div>

                  {/* Final Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Import Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Import Type:</span>
                          <span className="font-medium">{currentBatch.import_type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>File Name:</span>
                          <span className="font-medium">{currentBatch.file_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Period:</span>
                          <span className="font-medium">
                            {currentBatch.period_start} to {currentBatch.period_end}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          {getStatusBadge(currentBatch.status)}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-3">Processing Summary</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total Records:</span>
                          <span className="font-medium">{qualityMetrics.total_records}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Valid Records:</span>
                          <span className="font-medium text-green-600">{qualityMetrics.valid_records}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Invalid Records:</span>
                          <span className="font-medium text-red-600">{qualityMetrics.invalid_records}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Quality Score:</span>
                          <span className="font-medium text-blue-600">{qualityMetrics.overall_score}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      onClick={() => exportValidationReport(currentBatch.id)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Report
                    </Button>
                    <Button
                      onClick={() => {
                        setActiveTab('upload');
                        // Reset for new import
                        setApprovalNotes('');
                        setPeriodFrom('');
                        setPeriodTo('');
                      }}
                    >
                      Start New Import
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DKPKLTallyImport;