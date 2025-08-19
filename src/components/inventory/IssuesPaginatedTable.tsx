import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface IssueRecord {
  id: string;
  item_code: string;
  item_name?: string;
  date: string;
  qty_issued: number;
  department?: string;
  purpose?: string;
  requested_by?: string;
  approved_by?: string;
  remarks?: string;
  current_stock?: number;
  created_at: string;
  uom?: string;
}

interface IssuesPaginatedTableProps {
  data: IssueRecord[];
  currentPage: number;
  pageSize: number;
  totalCount: number;
  loading: boolean;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSort: (column: string) => void;
  onEdit?: (record: IssueRecord) => void;
  onDelete?: (record: IssueRecord) => void;
}

const columns = [
  { key: 'date', label: 'Date', sortable: true },
  { key: 'item_code', label: 'Item Code', sortable: true },
  { key: 'item_name', label: 'Item Name', sortable: false },
  { key: 'qty_issued', label: 'Quantity', sortable: true },
  { key: 'department', label: 'Department', sortable: true },
  { key: 'purpose', label: 'Purpose', sortable: false },
  { key: 'requested_by', label: 'Requested By', sortable: true },
  { key: 'actions', label: 'Actions', sortable: false },
];

export function IssuesPaginatedTable({
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
}: IssuesPaginatedTableProps) {
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

  const getDepartmentBadge = (department?: string) => {
    if (!department) return null;
    
    const departmentColors: Record<string, string> = {
      'Production': 'bg-blue-100 text-blue-800',
      'Quality Control': 'bg-green-100 text-green-800',
      'Maintenance': 'bg-yellow-100 text-yellow-800',
      'Research & Development': 'bg-purple-100 text-purple-800',
      'Packaging': 'bg-orange-100 text-orange-800',
      'Administration': 'bg-gray-100 text-gray-800',
    };

    return (
      <Badge variant="secondary" className={departmentColors[department] || 'bg-gray-100 text-gray-800'}>
        {department}
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
                  No issue records found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((record) => (
                <TableRow key={record.id} className="hover:bg-muted/50">
                  <TableCell>{formatDate(record.date)}</TableCell>
                  <TableCell className="font-mono text-sm">{record.item_code}</TableCell>
                  <TableCell>{record.item_name || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="text-right">
                      <span className="font-medium">{record.qty_issued.toLocaleString()}</span>
                      {record.uom && <span className="text-muted-foreground text-sm ml-1">{record.uom}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getDepartmentBadge(record.department)}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px] truncate" title={record.purpose}>
                      {record.purpose || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>{record.requested_by || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
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