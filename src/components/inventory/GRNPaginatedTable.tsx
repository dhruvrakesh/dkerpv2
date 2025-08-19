import React from 'react';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface GRNRecord {
  id: string;
  grn_number: string;
  item_code: string;
  item_name?: string;
  supplier_name?: string;
  date: string;
  qty_received: number;
  unit_cost?: number;
  total_amount?: number;
  quality_status?: string;
  invoice_reference?: string;
  remarks?: string;
  created_at: string;
  uom?: string;
}

interface GRNPaginatedTableProps {
  data: GRNRecord[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
  loading: boolean;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSort: (column: string) => void;
  onEdit?: (record: GRNRecord) => void;
  onDelete?: (record: GRNRecord) => void;
  onView?: (record: GRNRecord) => void;
}

const columns = [
  { key: 'date', label: 'Date', sortable: true },
  { key: 'grn_number', label: 'GRN Number', sortable: true },
  { key: 'item_code', label: 'Item Code', sortable: true },
  { key: 'item_name', label: 'Item Name', sortable: false },
  { key: 'supplier_name', label: 'Supplier', sortable: true },
  { key: 'qty_received', label: 'Quantity', sortable: true },
  { key: 'total_amount', label: 'Amount', sortable: true },
  { key: 'quality_status', label: 'Quality Status', sortable: true },
  { key: 'actions', label: 'Actions', sortable: false },
];

export function GRNPaginatedTable({
  data,
  currentPage,
  pageSize,
  totalCount,
  loading,
  sortColumn,
  sortDirection,
  onPageChange,
  onPageSizeChange,
  onSort,
  onEdit,
  onDelete,
  onView,
}: GRNPaginatedTableProps) {
  const totalPages = Math.ceil(totalCount / pageSize);

  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUp className="h-3 w-3 text-muted-foreground opacity-50" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-3 w-3 text-primary" /> : 
      <ArrowDown className="h-3 w-3 text-primary" />;
  };

  const handleSort = (column: string) => {
    if (columns.find(col => col.key === column)?.sortable) {
      onSort(column);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getQualityStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const statusColors: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', className: string }> = {
      'approved': { variant: 'default', className: 'bg-green-100 text-green-800' },
      'pending': { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800' },
      'rejected': { variant: 'destructive', className: 'bg-red-100 text-red-800' },
      'on_hold': { variant: 'outline', className: 'bg-orange-100 text-orange-800' },
    };

    const statusConfig = statusColors[status] || { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800' };

    return (
      <Badge variant={statusConfig.variant} className={statusConfig.className}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key} className="h-12">
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: pageSize }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column.key} 
                  className={`${column.sortable ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center space-x-2">
                    <span>{column.label}</span>
                    {column.sortable && renderSortIcon(column.key)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No GRN records found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((record) => (
                <TableRow key={record.id} className="hover:bg-muted/50">
                  <TableCell>{formatDate(record.date)}</TableCell>
                  <TableCell className="font-mono text-sm">{record.grn_number}</TableCell>
                  <TableCell className="font-mono text-sm">{record.item_code}</TableCell>
                  <TableCell>{record.item_name || 'N/A'}</TableCell>
                  <TableCell>{record.supplier_name || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="text-right">
                      <span className="font-medium">{record.qty_received.toLocaleString()}</span>
                      {record.uom && <span className="text-muted-foreground text-sm ml-1">{record.uom}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {record.total_amount ? formatCurrency(record.total_amount) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {getQualityStatusBadge(record.quality_status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {onView && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(record)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(record)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(record)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} entries
          </span>
        </div>

        <div className="flex items-center space-x-4">
          {/* Page Size Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Rows per page:</span>
            <Select value={pageSize.toString()} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
                <SelectItem value="200">200</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Page Navigation */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            {/* Page Numbers */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                if (pageNum > totalPages) return null;
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(pageNum)}
                    className="h-8 w-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}