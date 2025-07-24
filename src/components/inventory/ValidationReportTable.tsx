import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, AlertTriangle, Copy } from 'lucide-react';

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
}

interface ValidationReportTableProps {
  records: StagingRecord[];
}

export const ValidationReportTable: React.FC<ValidationReportTableProps> = ({ records }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'invalid': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid': return 'default';
      case 'invalid': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  };

  const formatErrors = (errors: any) => {
    if (!errors || !Array.isArray(errors)) return '';
    return errors.join(', ');
  };

  const formatWarnings = (warnings: any) => {
    if (!warnings || !Array.isArray(warnings)) return '';
    return warnings.join(', ');
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Row</TableHead>
            <TableHead>GRN Number</TableHead>
            <TableHead>Item Code</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Duplicate</TableHead>
            <TableHead>Issues</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell>{record.source_row_number}</TableCell>
              <TableCell className="font-mono text-sm">{record.grn_number}</TableCell>
              <TableCell className="font-mono text-sm">{record.item_code}</TableCell>
              <TableCell>{record.supplier_name}</TableCell>
              <TableCell>{record.qty_received}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(record.validation_status)}
                  <Badge variant={getStatusBadge(record.validation_status)}>
                    {record.validation_status}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                {record.is_duplicate ? (
                  <Badge variant="destructive">
                    <Copy className="h-3 w-3 mr-1" />
                    Duplicate
                  </Badge>
                ) : (
                  <Badge variant="outline">No</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {formatErrors(record.validation_errors) && (
                    <div className="text-xs text-red-600">
                      <strong>Errors:</strong> {formatErrors(record.validation_errors)}
                    </div>
                  )}
                  {formatWarnings(record.validation_warnings) && (
                    <div className="text-xs text-yellow-600">
                      <strong>Warnings:</strong> {formatWarnings(record.validation_warnings)}
                    </div>
                  )}
                  {record.duplicate_reason && (
                    <div className="text-xs text-orange-600">
                      <strong>Duplicate:</strong> {record.duplicate_reason}
                    </div>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};