import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Download, 
  Eye,
  FileSpreadsheet,
  ShieldCheck,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { useEnterpriseBulkUpload } from '@/hooks/useEnterpriseBulkUpload';
import { DataQualityDashboard } from './DataQualityDashboard';
import { ValidationReportTable } from './ValidationReportTable';

export const EnterpriseBulkUpload: React.FC = () => {
  const {
    isUploading,
    uploadProgress,
    currentSession,
    stagingRecords,
    qualityMetrics,
    uploadFile,
    loadUploadSession,
    approveUploadSession,
    processApprovedRecords,
    exportValidationReport
  } = useEnterpriseBulkUpload();

  const [activeTab, setActiveTab] = useState('upload');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Please select an Excel file (.xlsx or .xls)');
      return;
    }

    await uploadFile(file);
    setActiveTab('preview');
  };

  const handleApprove = async () => {
    if (!currentSession?.id) return;
    
    await approveUploadSession(currentSession.id, approvalNotes);
    setIsApprovalDialogOpen(false);
    setApprovalNotes('');
    setActiveTab('processing');
  };

  const handleProcess = async () => {
    if (!currentSession?.id) return;
    await processApprovedRecords(currentSession.id);
    setActiveTab('completed');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading': return 'bg-blue-500';
      case 'validating': return 'bg-yellow-500';
      case 'staged': return 'bg-orange-500';
      case 'approved': return 'bg-green-500';
      case 'processing': return 'bg-purple-500';
      case 'completed': return 'bg-emerald-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getValidationBadgeColor = (status: string) => {
    switch (status) {
      case 'valid': return 'default';
      case 'invalid': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Enterprise Bulk Upload</h1>
          <p className="text-muted-foreground">
            Advanced GRN bulk upload with validation, staging, and approval workflow
          </p>
        </div>
        {currentSession && (
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-sm">
              Session: {currentSession.id.slice(-8)}
            </Badge>
            <div className={`w-3 h-3 rounded-full ${getStatusColor(currentSession.status)}`} />
            <span className="text-sm font-medium capitalize">{currentSession.status}</span>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Progress</CardTitle>
            <CardDescription>Processing your file...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={uploadProgress} className="w-full" />
              <div className="text-sm text-muted-foreground">
                {uploadProgress < 30 && "Validating file structure..."}
                {uploadProgress >= 30 && uploadProgress < 50 && "Processing records..."}
                {uploadProgress >= 50 && uploadProgress < 70 && "Validating data..."}
                {uploadProgress >= 70 && uploadProgress < 90 && "Calculating quality metrics..."}
                {uploadProgress >= 90 && "Finalizing upload..."}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="preview" disabled={!currentSession}>Preview</TabsTrigger>
          <TabsTrigger value="quality" disabled={!qualityMetrics}>Quality</TabsTrigger>
          <TabsTrigger value="processing" disabled={currentSession?.status !== 'approved'}>Processing</TabsTrigger>
          <TabsTrigger value="completed" disabled={currentSession?.status !== 'completed'}>Completed</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>File Upload</span>
              </CardTitle>
              <CardDescription>
                Upload your GRN data in Excel format. The system will validate, stage, and process your records.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Upload Excel File</h3>
                    <p className="text-sm text-muted-foreground">
                      Select your Excel file containing GRN data
                    </p>
                  </div>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="mt-4"
                  >
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Required columns:</strong> GRN Number, Item Code, Quantity Received<br />
                    <strong>Optional columns:</strong> Date, Supplier Name, Unit Rate, Invoice Number, Invoice Date, Quality Status, Remarks
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          {currentSession && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Eye className="h-5 w-5" />
                      <span>Data Preview & Validation</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportValidationReport(currentSession.id)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Report
                      </Button>
                      {currentSession.status === 'staged' && (
                        <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm">
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              Approve Upload
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Approve Upload Session</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <Label className="text-muted-foreground">Total Records</Label>
                                  <p className="font-medium">{stagingRecords.length}</p>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">Valid Records</Label>
                                  <p className="font-medium text-green-600">
                                    {stagingRecords.filter(r => r.validation_status === 'valid').length}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">Invalid Records</Label>
                                  <p className="font-medium text-red-600">
                                    {stagingRecords.filter(r => r.validation_status === 'invalid').length}
                                  </p>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">Duplicates</Label>
                                  <p className="font-medium text-orange-600">
                                    {stagingRecords.filter(r => r.is_duplicate).length}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Approval Notes</Label>
                                <Textarea
                                  value={approvalNotes}
                                  onChange={(e) => setApprovalNotes(e.target.value)}
                                  placeholder="Enter approval notes (optional)"
                                  rows={3}
                                />
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  onClick={() => setIsApprovalDialogOpen(false)}
                                >
                                  Cancel
                                </Button>
                                <Button onClick={handleApprove}>
                                  Approve
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{stagingRecords.length}</div>
                      <div className="text-sm text-muted-foreground">Total Records</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {stagingRecords.filter(r => r.validation_status === 'valid').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Valid</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {stagingRecords.filter(r => r.validation_status === 'invalid').length}
                      </div>
                      <div className="text-sm text-muted-foreground">Invalid</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {stagingRecords.filter(r => r.is_duplicate).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Duplicates</div>
                    </div>
                  </div>

                  <ValidationReportTable records={stagingRecords} />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Quality Tab */}
        <TabsContent value="quality" className="space-y-4">
          {qualityMetrics && (
            <DataQualityDashboard metrics={qualityMetrics} />
          )}
        </TabsContent>

        {/* Processing Tab */}
        <TabsContent value="processing" className="space-y-4">
          {currentSession?.status === 'approved' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Ready for Processing</span>
                </CardTitle>
                <CardDescription>
                  All valid records are approved and ready to be processed into the main GRN system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Approved Records</Label>
                      <p className="font-medium text-green-600">
                        {stagingRecords.filter(r => r.processing_status === 'approved').length}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Estimated Processing Time</Label>
                      <p className="font-medium">~{Math.ceil(stagingRecords.length / 50)} minutes</p>
                    </div>
                  </div>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Processing will create GRN records and update stock levels. This action cannot be undone.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={handleProcess} size="lg" className="w-full">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Process Records
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Processing Complete</span>
              </CardTitle>
              <CardDescription>
                All records have been successfully processed and integrated into the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {stagingRecords.filter(r => r.processing_status === 'processed').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Processed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {stagingRecords.reduce((sum, r) => sum + r.qty_received, 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Quantity</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      ₹{stagingRecords.reduce((sum, r) => sum + r.total_amount, 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Value</div>
                  </div>
                </div>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Success!</strong> All GRN records have been created and stock levels have been updated.
                    You can now view the records in the main GRN management section.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};