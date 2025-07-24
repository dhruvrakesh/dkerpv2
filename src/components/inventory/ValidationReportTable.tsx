import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, AlertCircle, AlertTriangle, Copy, Info, XCircle } from 'lucide-react';

interface StagingRecord {
  id: string;
  grn_number: string;
  item_code: string;
  supplier_name: string;
  date: string;
  qty_received: number;
  unit_rate: number;
  total_amount: number;
  validation_status: string;
  validation_errors: any;
  validation_warnings: any;
  is_duplicate: boolean;
  duplicate_reason: string;
  processing_status: string;
  source_row_number: number;
  uom?: string;
}

interface ValidationReportTableProps {
  records: StagingRecord[];
}

export const ValidationReportTable: React.FC<ValidationReportTableProps> = ({ records }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'invalid': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
    switch (status) {
      case 'valid': return 'default';
      case 'invalid': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  };

  const formatErrors = (errors: any): string[] => {
    if (!errors) return [];
    if (Array.isArray(errors)) return errors;
    return [String(errors)];
  };

  const formatWarnings = (warnings: any): string[] => {
    if (!warnings) return [];
    if (Array.isArray(warnings)) return warnings;
    return [String(warnings)];
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getSeverityIcon = (type: 'error' | 'warning') => {
    return type === 'error' 
      ? <XCircle className="h-3 w-3 text-red-500" />
      : <AlertCircle className="h-3 w-3 text-yellow-500" />;
  };

  return (
    <TooltipProvider>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-16">Row</TableHead>
              <TableHead className="w-32">GRN Number</TableHead>
              <TableHead className="w-32">Item Code</TableHead>
              <TableHead className="w-32">Supplier</TableHead>
              <TableHead className="w-24">Quantity</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-20">Duplicate</TableHead>
              <TableHead>Issues & Details</TableHead>
              <TableHead className="w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => {
              const errors = formatErrors(record.validation_errors);
              const warnings = formatWarnings(record.validation_warnings);
              const hasIssues = errors.length > 0 || warnings.length > 0 || record.is_duplicate;
              
              return (
                <TableRow 
                  key={record.id} 
                  className={`
                    ${record.is_duplicate ? 'bg-orange-50 hover:bg-orange-100' : ''}
                    ${record.validation_status === 'invalid' ? 'bg-red-50 hover:bg-red-100' : ''}
                    ${record.validation_status === 'valid' && warnings.length > 0 ? 'bg-yellow-50 hover:bg-yellow-100' : ''}
                  `}
                >
                  <TableCell className="font-mono text-sm font-medium">
                    {record.source_row_number}
                  </TableCell>
                  
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="truncate max-w-24">{record.grn_number}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                        onClick={() => copyToClipboard(record.grn_number)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="truncate max-w-24">{record.item_code}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                        onClick={() => copyToClipboard(record.item_code)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-sm">
                    <span className="truncate max-w-24 block">{record.supplier_name || '-'}</span>
                  </TableCell>
                  
                  <TableCell className="text-right text-sm">
                    <div>
                      <div className="font-medium">{record.qty_received?.toLocaleString() || '0'}</div>
                      <div className="text-xs text-muted-foreground">{record.uom || 'PCS'}</div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(record.validation_status)}
                      <Badge variant={getStatusBadge(record.validation_status)} className="text-xs capitalize">
                        {record.validation_status}
                      </Badge>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    {record.is_duplicate ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                            <Copy className="h-3 w-3 mr-1" />
                            Yes
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-sm">{record.duplicate_reason}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Badge variant="outline" className="text-xs">No</Badge>
                    )}
                  </TableCell>
                  
                  <TableCell className="max-w-md">
                    {hasIssues ? (
                      <div className="space-y-2">
                        {/* Errors */}
                        {errors.map((error, index) => (
                          <div key={`error-${index}`} className="flex items-start space-x-2">
                            {getSeverityIcon('error')}
                            <span className="text-red-700 text-xs leading-relaxed">{error}</span>
                          </div>
                        ))}
                        
                        {/* Warnings */}
                        {warnings.map((warning, index) => (
                          <div key={`warning-${index}`} className="flex items-start space-x-2">
                            {getSeverityIcon('warning')}
                            <span className="text-yellow-700 text-xs leading-relaxed">{warning}</span>
                          </div>
                        ))}
                        
                        {/* Duplicate reason */}
                        {record.is_duplicate && record.duplicate_reason && (
                          <div className="flex items-start space-x-2">
                            <Copy className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                            <span className="text-orange-700 text-xs leading-relaxed">
                              {record.duplicate_reason}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        <span className="text-xs">No issues</span>
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {hasIssues && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                            onClick={() => {
                              const issueText = [
                                ...errors.map(e => `Error: ${e}`),
                                ...warnings.map(w => `Warning: ${w}`),
                                ...(record.duplicate_reason ? [`Duplicate: ${record.duplicate_reason}`] : [])
                              ].join('\n');
                              copyToClipboard(issueText);
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copy all issues to clipboard</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        
        {records.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <Info className="h-8 w-8 mx-auto mb-2" />
            <p>No records to display</p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};