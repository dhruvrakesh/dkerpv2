import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, FileSpreadsheet, FileText, Calendar } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface EnterpriseExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (format: 'excel' | 'csv' | 'pdf', options: ExportOptions) => void;
  exporting: boolean;
  totalRecords: number;
}

interface ExportOptions {
  includeMetadata: boolean;
  includeFilters: boolean;
  includeTimestamp: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export const EnterpriseExportDialog: React.FC<EnterpriseExportDialogProps> = ({
  open,
  onOpenChange,
  onExport,
  exporting,
  totalRecords,
}) => {
  const [format, setFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');
  const [options, setOptions] = useState<ExportOptions>({
    includeMetadata: true,
    includeFilters: true,
    includeTimestamp: true,
  });

  const handleExport = () => {
    onExport(format, options);
  };

  const formatOptions = [
    {
      value: 'excel' as const,
      label: 'Excel (.xlsx)',
      description: 'Spreadsheet with formatting and multiple sheets',
      icon: FileSpreadsheet,
      recommended: true,
    },
    {
      value: 'csv' as const,
      label: 'CSV (.csv)',
      description: 'Comma-separated values for data analysis',
      icon: FileText,
      recommended: false,
    },
    {
      value: 'pdf' as const,
      label: 'PDF (.pdf)',
      description: 'Formatted report for printing and sharing',
      icon: FileText,
      recommended: false,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Stock Data
          </DialogTitle>
          <DialogDescription>
            Export {totalRecords.toLocaleString()} stock records with your preferred format and options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as 'excel' | 'csv' | 'pdf')}>
              {formatOptions.map((option) => (
                <div key={option.value} className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value={option.value} className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-medium cursor-pointer">
                        {option.label}
                        {option.recommended && (
                          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            Recommended
                          </span>
                        )}
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Options</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="metadata"
                  checked={options.includeMetadata}
                  onCheckedChange={(checked) =>
                    setOptions(prev => ({ ...prev, includeMetadata: checked as boolean }))
                  }
                />
                <Label htmlFor="metadata" className="text-sm cursor-pointer">
                  Include metadata (export date, user, filters applied)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="filters"
                  checked={options.includeFilters}
                  onCheckedChange={(checked) =>
                    setOptions(prev => ({ ...prev, includeFilters: checked as boolean }))
                  }
                />
                <Label htmlFor="filters" className="text-sm cursor-pointer">
                  Include applied filters summary
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="timestamp"
                  checked={options.includeTimestamp}
                  onCheckedChange={(checked) =>
                    setOptions(prev => ({ ...prev, includeTimestamp: checked as boolean }))
                  }
                />
                <Label htmlFor="timestamp" className="text-sm cursor-pointer">
                  Add timestamp to filename
                </Label>
              </div>
            </div>
          </div>

          {/* Export Preview */}
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Export Preview:</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {totalRecords.toLocaleString()} records will be exported as {formatOptions.find(f => f.value === format)?.label}
              {options.includeTimestamp && ` with timestamp`}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};