import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Upload, FileSpreadsheet, History, AlertTriangle, CheckCircle, Edit3, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { useOpeningStockManagement } from '@/hooks/useOpeningStockManagement';
import { OpeningStockImportDialog } from './OpeningStockImportDialog';
import { OpeningStockExportDialog } from './OpeningStockExportDialog';
import { OpeningStockAuditTrail } from './OpeningStockAuditTrail';
import { OpeningStockEditModal } from './OpeningStockEditModal';

export function OpeningStockManagementDashboard() {
  const { toast } = useToast();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  
  // Sorting and Pagination State
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  const {
    openingStock,
    auditTrail,
    loading,
    importing,
    exporting,
    fetchOpeningStock,
    fetchAuditTrail,
    importOpeningStock,
    exportOpeningStock,
    validateOpeningStock,
    updateOpeningStock
  } = useOpeningStockManagement();

  React.useEffect(() => {
    fetchOpeningStock();
    fetchAuditTrail();
  }, [fetchOpeningStock, fetchAuditTrail]);

  const handleRefresh = () => {
    fetchOpeningStock();
    toast({
      title: "Data Refreshed",
      description: "Opening stock data has been refreshed successfully.",
    });
  };

  const handleValidateAll = async () => {
    try {
      const result = await validateOpeningStock();
      toast({
        title: result.isValid ? "Validation Successful" : "Validation Issues Found",
        description: result.isValid 
          ? "All opening stock data is valid."
          : `${result.errors.length} validation errors found.`,
        variant: result.isValid ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Validation Failed",
        description: "Unable to validate opening stock data.",
        variant: "destructive",
      });
    }
  };

  const handleEditItem = (item: any) => {
    setSelectedItem(item);
    setEditModalOpen(true);
  };

  const handleUpdateItem = async (itemCode: string, updates: { opening_qty: number; unit_cost: number }, reason: string) => {
    setUpdating(true);
    try {
      await updateOpeningStock(itemCode, updates, reason);
      setEditModalOpen(false);
      setSelectedItem(null);
    } catch (error) {
      // Error is handled in the hook
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // Sorting and Pagination Logic
  const sortedData = React.useMemo(() => {
    if (!openingStock || !sortColumn) return openingStock || [];
    
    return [...openingStock].sort((a, b) => {
      let aValue = a[sortColumn as keyof typeof a];
      let bValue = b[sortColumn as keyof typeof b];
      
      // Handle numeric columns
      if (sortColumn === 'opening_qty' || sortColumn === 'unit_cost') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      }
      
      // Handle calculated total value
      if (sortColumn === 'total_value') {
        aValue = (a.opening_qty * a.unit_cost) || 0;
        bValue = (b.opening_qty * b.unit_cost) || 0;
      }
      
      // String comparison for other columns
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      // Numeric comparison
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [openingStock, sortColumn, sortDirection]);

  // Pagination calculations
  const totalItems = sortedData?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = sortedData?.slice(startIndex, endIndex) || [];

  // Summary metrics
  const totalValue = openingStock?.reduce((sum, item) => sum + (item.opening_qty * item.unit_cost), 0) || 0;
  const validItems = openingStock?.filter(item => item.is_valid)?.length || 0;
  const invalidItems = totalItems - validItems;

  // Table columns configuration
  const columns = [
    { key: 'item_code', label: 'Item Code', sortable: true },
    { key: 'item_name', label: 'Item Name', sortable: true },
    { key: 'opening_qty', label: 'Opening Qty', sortable: true },
    { key: 'unit_cost', label: 'Unit Cost', sortable: true },
    { key: 'total_value', label: 'Total Value', sortable: true },
    { key: 'is_valid', label: 'Status', sortable: false },
  ];

  // Sorting handlers
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-2 h-4 w-4" />
      : <ArrowDown className="ml-2 h-4 w-4" />;
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Opening Stock Manager</h2>
          <p className="text-muted-foreground">
            Import, export, and manage opening stock data with comprehensive audit trail
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            Refresh
          </Button>
          <Button onClick={handleValidateAll} variant="outline" size="sm">
            <CheckCircle className="h-4 w-4 mr-2" />
            Validate All
          </Button>
          <Button onClick={() => setImportDialogOpen(true)} size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import Data
          </Button>
          <Button onClick={() => setExportDialogOpen(true)} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Opening stock entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">Combined opening value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valid Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-green-600">{validItems}</div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {totalItems > 0 ? Math.round((validItems / totalItems) * 100) : 0}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Validated entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-red-600">{invalidItems}</div>
              {invalidItems > 0 && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Main Content Tabs */}
      <Tabs defaultValue="data" className="space-y-6">
        <TabsList>
          <TabsTrigger value="data">Opening Stock Data</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="templates">Import Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Opening Stock Entries</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage opening stock data for all inventory items
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
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
                          <TableHead>Actions</TableHead>
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
                              <Skeleton className="h-8 w-8" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : openingStock && openingStock.length > 0 ? (
                <div className="space-y-4">
                  {/* Sortable and Paginated Table */}
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
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={columns.length + 1} className="text-center py-8">
                              No opening stock data found
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedData.map((item, index) => (
                            <TableRow key={`${item.item_code}-${index}`}>
                              <TableCell className="font-medium font-mono">{item.item_code}</TableCell>
                              <TableCell className="max-w-[250px] truncate" title={item.item_name}>
                                {item.item_name}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.opening_qty.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(item.unit_cost)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(item.opening_qty * item.unit_cost)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={item.is_valid ? "default" : "destructive"}>
                                  {item.is_valid ? "Valid" : "Invalid"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditItem(item)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                              </TableCell>
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
                        Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} entries
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">Rows per page</p>
                        <Select
                          value={pageSize.toString()}
                          onValueChange={(value) => handlePageSizeChange(Number(value))}
                        >
                          <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent side="top">
                            {[25, 50, 100].map((size) => (
                              <SelectItem key={size} value={size.toString()}>
                                {size}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">
                          Page {currentPage} of {totalPages}
                        </p>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="sr-only">Previous page</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                          >
                            <ChevronRight className="h-4 w-4" />
                            <span className="sr-only">Next page</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Opening Stock Data</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Import opening stock data to get started with inventory management.
                  </p>
                  <Button onClick={() => setImportDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Opening Stock
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <OpeningStockAuditTrail auditTrail={auditTrail} loading={loading} />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import Templates</CardTitle>
              <p className="text-sm text-muted-foreground">
                Download templates and guidelines for importing opening stock data
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Excel Template</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Pre-formatted Excel template with all required columns and validation rules.
                  </p>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download Excel Template
                  </Button>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">CSV Template</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Simple CSV format for basic opening stock data import.
                  </p>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV Template
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">Import Guidelines</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Ensure all item codes match existing items in the system</li>
                  <li>• Opening quantities must be positive numbers</li>
                  <li>• Unit costs should be in INR without currency symbols</li>
                  <li>• Use the exact date format: YYYY-MM-DD</li>
                  <li>• Maximum file size: 10MB</li>
                  <li>• Supported formats: Excel (.xlsx), CSV (.csv)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Dialog */}
      <OpeningStockImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={importOpeningStock}
        importing={importing}
      />

      {/* Export Dialog */}
      <OpeningStockExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={exportOpeningStock}
        exporting={exporting}
        totalRecords={totalItems}
      />

      {/* Edit Modal */}
      <OpeningStockEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        item={selectedItem}
        onSave={handleUpdateItem}
        loading={updating}
      />
    </div>
  );
}