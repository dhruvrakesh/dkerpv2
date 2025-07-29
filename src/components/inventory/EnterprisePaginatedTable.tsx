import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { PaginatedStockItem, PaginationState, FilterState } from '@/hooks/useEnterpriseStockManagement';

interface EnterprisePaginatedTableProps {
  data: PaginatedStockItem[];
  pagination: PaginationState;
  filters: FilterState;
  loading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange: (column: string, direction: 'asc' | 'desc') => void;
}

const columns = [
  { key: 'item_code', label: 'Item Code', sortable: true },
  { key: 'item_name', label: 'Item Name', sortable: true },
  { key: 'category_name', label: 'Category', sortable: true },
  { key: 'current_qty', label: 'Current Qty', sortable: true },
  { key: 'unit_cost', label: 'Unit Cost', sortable: true },
  { key: 'total_value', label: 'Total Value', sortable: true },
  { key: 'location', label: 'Location', sortable: false },
  { key: 'uom', label: 'UOM', sortable: false },
  { key: 'last_transaction_date', label: 'Last Transaction', sortable: true },
];

export const EnterprisePaginatedTable: React.FC<EnterprisePaginatedTableProps> = ({
  data,
  pagination,
  filters,
  loading,
  onPageChange,
  onPageSizeChange,
  onSortChange,
}) => {
  const renderSortIcon = (column: string) => {
    if (filters.sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return filters.sortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const handleSort = (column: string) => {
    const newDirection = 
      filters.sortColumn === column && filters.sortDirection === 'asc' 
        ? 'desc' 
        : 'asc';
    onSortChange(column, newDirection);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getStockStatusBadge = (item: PaginatedStockItem) => {
    if (item.current_qty === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    } else if (item.is_low_stock) {
      return <Badge variant="secondary">Low Stock</Badge>;
    } else {
      return <Badge variant="default">In Stock</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column.key}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 10 }).map((_, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                  <TableCell>
                    <Skeleton className="h-6 w-16" />
                  </TableCell>
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
      {/* Data Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column.key}
                  className={cn(
                    column.sortable && "cursor-pointer select-none hover:bg-muted/50"
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center">
                    {column.label}
                    {column.sortable && renderSortIcon(column.key)}
                  </div>
                </TableHead>
              ))}
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} className="text-center py-8">
                  No stock data found
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={`${item.item_code}-${index}`}>
                  <TableCell className="font-medium">{item.item_code}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={item.item_name}>
                    {item.item_name}
                  </TableCell>
                  <TableCell>{item.category_name}</TableCell>
                  <TableCell className="text-right">
                    {item.current_qty.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unit_cost)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.total_value)}
                  </TableCell>
                  <TableCell>{item.location || 'Default'}</TableCell>
                  <TableCell>{item.uom}</TableCell>
                  <TableCell>{formatDate(item.last_transaction_date)}</TableCell>
                  <TableCell>{getStockStatusBadge(item)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of{' '}
            {pagination.totalCount} entries
          </p>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {[25, 50, 100, 200].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous page</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next page</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};