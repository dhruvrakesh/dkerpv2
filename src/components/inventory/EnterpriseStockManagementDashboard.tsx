import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Download, 
  Search, 
  Filter, 
  Camera, 
  History,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { useEnterpriseStockManagement } from '@/hooks/useEnterpriseStockManagement';
import { EnterprisePaginatedTable } from './EnterprisePaginatedTable';
import { EnterpriseExportDialog } from './EnterpriseExportDialog';
import { HistoricalStockViewer } from './HistoricalStockViewer';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const EnterpriseStockManagementDashboard: React.FC = () => {
  const {
    stockData,
    snapshots,
    pagination,
    filters,
    loading,
    exporting,
    fetchStockData,
    updateFilters,
    changePage,
    changePageSize,
    exportStockData,
    captureSnapshot,
    fetchSnapshots,
  } = useEnterpriseStockManagement();

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Initialize data on component mount
  useEffect(() => {
    fetchStockData();
    fetchSnapshots();
  }, []);

  // Handle sort change
  const handleSortChange = (column: string, direction: 'asc' | 'desc') => {
    updateFilters({ sortColumn: column, sortDirection: direction });
  };

  // Handle search
  const handleSearch = (searchTerm: string) => {
    updateFilters({ search: searchTerm });
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    updateFilters({ [key]: value });
  };

  // Handle export
  const handleExport = (format: 'excel' | 'csv' | 'pdf', options: any) => {
    exportStockData(format);
    setExportDialogOpen(false);
  };

  // Calculate summary metrics
  const summaryMetrics = {
    totalItems: pagination.totalCount,
    totalValue: stockData.reduce((sum, item) => sum + item.total_value, 0),
    lowStockItems: stockData.filter(item => item.is_low_stock).length,
    outOfStockItems: stockData.filter(item => item.current_qty === 0).length,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enterprise Stock Management</h1>
          <p className="text-muted-foreground">
            Comprehensive inventory tracking with advanced analytics and historical data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => fetchStockData()}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={captureSnapshot}
            disabled={loading}
          >
            <Camera className="mr-2 h-4 w-4" />
            Capture Snapshot
          </Button>
          <Button onClick={() => setExportDialogOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics.totalItems.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryMetrics.totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              Current inventory value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summaryMetrics.lowStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Below reorder level
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <Package className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summaryMetrics.outOfStockItems}</div>
            <p className="text-xs text-muted-foreground">
              Zero quantity items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Stock Overview</TabsTrigger>
          <TabsTrigger value="historical">Historical Data</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="search">Search Items</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by item code or name..."
                      value={filters.search}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div>
                  <Label>Category</Label>
                  <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      <SelectItem value="Raw Material">Raw Material</SelectItem>
                      <SelectItem value="Finished Goods">Finished Goods</SelectItem>
                      <SelectItem value="Consumables">Consumables</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Stock Status</Label>
                  <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Status</SelectItem>
                      <SelectItem value="in_stock">In Stock</SelectItem>
                      <SelectItem value="low_stock">Low Stock</SelectItem>
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(filters.search || filters.category || filters.status) && (
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => updateFilters({ search: '', category: '', status: '' })}
                  >
                    Clear All Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Data</CardTitle>
              <CardDescription>
                Real-time inventory levels with pagination and sorting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnterprisePaginatedTable
                data={stockData}
                pagination={pagination}
                filters={filters}
                loading={loading}
                onPageChange={changePage}
                onPageSizeChange={changePageSize}
                onSortChange={handleSortChange}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historical" className="space-y-6">
          <HistoricalStockViewer
            snapshots={snapshots}
            loading={loading}
            onRefresh={fetchSnapshots}
          />
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <EnterpriseExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExport}
        exporting={exporting}
        totalRecords={pagination.totalCount}
      />
    </div>
  );
};