import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, AlertTriangle } from 'lucide-react';

interface OpeningStockImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (file: File, openingDate: string) => Promise<void>;
  importing: boolean;
}

export function OpeningStockImportDialog({ 
  open, 
  onOpenChange, 
  onImport, 
  importing 
}: OpeningStockImportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'excel' | 'csv'>('excel');
  const [dragActive, setDragActive] = useState(false);
  const [openingDate, setOpeningDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleImport = async () => {
    if (selectedFile && openingDate && onImport) {
      await onImport(selectedFile, openingDate);
      setSelectedFile(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Opening Stock Data</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            {selectedFile ? (
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="font-medium mb-2">Drop your file here</p>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to browse files
                </p>
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  className="hidden"
                  id="file-upload"
                />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <Button variant="outline" className="pointer-events-none">
                    <Upload className="h-4 w-4 mr-2" />
                    Select File
                  </Button>
                </Label>
              </div>
            )}
          </div>

          {/* Import Type and Opening Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="import-type">Import Format</Label>
              <Select value={importType} onValueChange={(value: 'excel' | 'csv') => setImportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel (.xlsx, .xls)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="opening-date">Default Opening Date</Label>
              <Input
                id="opening-date"
                type="date"
                value={openingDate}
                onChange={(e) => setOpeningDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          
          {/* Import Instructions */}
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">File Requirements:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Required: item_code, item_name, opening_qty, unit_cost</li>
              <li>• Optional: opening_date (uses default date if not provided)</li>
              <li>• Opening dates cannot be in the future</li>
              <li>• Only positive quantities allowed for opening stock</li>
            </ul>
          </div>

          {/* Import Progress */}
          {importing && (
            <div className="space-y-2">
              <Label>Import Progress</Label>
              <Progress value={65} />
              <p className="text-sm text-muted-foreground">Processing opening stock data...</p>
            </div>
          )}

          {/* Warnings */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Importing will update existing opening stock data. Make sure to backup your data before proceeding.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selectedFile || importing}
            >
              {importing ? 'Importing...' : 'Import Data'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}