import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  Download,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  FileSpreadsheet,
  Package,
  DollarSign
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface StockSummaryItem {
  item_code: string;
  item_name: string;
  category_name: string;
  uom: string;
  opening_qty: number;
  total_grn_qty: number;
  total_issued_qty: number;
  current_qty: number;
  calculated_qty: number;
  variance_qty: number;
  unit_cost: number;
  total_value: number;
  last_transaction_date: string;
  reorder_level: number;
  reorder_quantity: number;
  days_since_last_movement: number;
  stock_status: string;
  location: string;
  is_low_stock: boolean;
}

interface StockMetrics {
  total_items: number;
  total_value: number;
  low_stock_count: number;
  zero_stock_count: number;
  avg_stock_age: number;
}

export const EnterpriseStockDashboard = () => {
  const { toast } = useToast();
  const [stockData, setStockData] = useState<StockSummaryItem[]>([]);
  const [filteredData, setFilteredData] = useState<StockSummaryItem[]>([]);
  const [stockMetrics, setStockMetrics] = useState<StockMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadStockData();
  }, []);

  useEffect(() => {
    filterStockData();
  }, [stockData, searchTerm, filterCategory, filterStatus]);

  const loadStockData = async () => {
    try {
      setLoading(true);
      
      // Get organization ID
      const { data: orgId } = await supabase.rpc('dkegl_get_current_user_org');
      if (!orgId) throw new Error('Organization not found');

      // Load stock data and metrics in parallel using comprehensive functions
      const [stockResponse, metricsResponse] = await Promise.all([
        supabase.rpc('dkegl_get_comprehensive_stock_summary', { _org_id: orgId }),
        supabase.rpc('dkegl_get_stock_metrics', { _org_id: orgId })
      ]);

      if (stockResponse.error) throw stockResponse.error;
      if (metricsResponse.error) throw metricsResponse.error;

      const stockData = (stockResponse.data || []).map((item: any) => ({
        ...item,
        is_low_stock: item.stock_status === 'Low Stock' || item.stock_status === 'Out of Stock'
      }));
      const metrics = metricsResponse.data?.[0] || null;

      setStockData(stockData);
      setStockMetrics(metrics);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(stockData.map(item => item.category_name).filter(Boolean))];
      setCategories(uniqueCategories);

    } catch (error: any) {
      console.error('Error loading stock data:', error);
      toast({
        title: "Error",
        description: "Failed to load stock data: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshStockData = async () => {
    try {
      setRefreshing(true);
      await loadStockData();
      toast({
        title: "Success",
        description: "Stock data refreshed successfully",
      });
    } catch (error: any) {
      console.error('Error refreshing stock data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh stock data",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const filterStockData = () => {
    let filtered = stockData;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.item_code.toLowerCase().includes(search) ||
        item.item_name?.toLowerCase().includes(search) ||
        item.category_name?.toLowerCase().includes(search)
      );
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(item => item.category_name === filterCategory);
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => {
        switch (filterStatus) {
          case 'low_stock':
            return item.is_low_stock;
          case 'zero_stock':
            return item.current_qty === 0;
          case 'high_value':
            return item.total_value > 10000;
          default:
            return true;
        }
      });
    }

    setFilteredData(filtered);
  };

  const exportStockData = async (exportFormat: 'excel' | 'csv' = 'excel') => {
    try {
      const formatExtension = exportFormat === 'excel' ? 'xlsx' : 'csv';
      const exportData = filteredData.map(item => ({
        'Item Code': item.item_code,
        'Item Name': item.item_name || '',
        'Category': item.category_name || '',
        'Current Stock': item.current_qty,
        'Unit Cost': item.unit_cost,
        'Total Value': item.total_value,
        'Location': item.location,
        'Reorder Level': item.reorder_level,
        'Low Stock': item.is_low_stock ? 'Yes' : 'No',
        'Last Transaction': item.last_transaction_date || '',
        'Export Date': format(new Date(), 'yyyy-MM-dd HH:mm:ss')
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Stock Summary');

      // Add summary sheet
      const summaryData = [
        { Metric: 'Total Items', Value: stockMetrics?.total_items || 0 },
        { Metric: 'Total Value', Value: stockMetrics?.total_value || 0 },
        { Metric: 'Low Stock Items', Value: stockMetrics?.low_stock_count || 0 },
        { Metric: 'Zero Stock Items', Value: stockMetrics?.zero_stock_count || 0 },
        { Metric: 'Avg Stock Age (Days)', Value: stockMetrics?.avg_stock_age || 0 },
        { Metric: 'Export Date', Value: format(new Date(), 'yyyy-MM-dd HH:mm:ss') }
      ];

      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      const fileName = `stock_summary_${format(new Date(), 'yyyyMMdd_HHmmss')}.${formatExtension}`;
      
      if (exportFormat === 'excel') {
        XLSX.writeFile(wb, fileName);
      } else {
        XLSX.writeFile(wb, fileName, { bookType: 'csv' });
      }

      toast({
        title: "Export Successful",
        description: `Stock data exported to ${fileName}`,
      });
    } catch (error: any) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStockStatusBadge = (item: StockSummaryItem) => {
    if (item.current_qty === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (item.is_low_stock) return <Badge variant="outline">Low Stock</Badge>;
    if (item.total_value > 10000) return <Badge variant="default">High Value</Badge>;
    return <Badge variant="secondary">Normal</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin mr-4" />
        <span className="text-lg">Loading enterprise stock dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enterprise Stock Management</h1>
          <p className="text-muted-foreground">
            Real-time stock monitoring and analytics dashboard
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={refreshStockData} 
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Items</span>
            </div>
            <div className="text-2xl font-bold">{stockMetrics?.total_items?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Total Value</span>
            </div>
            <div className="text-2xl font-bold text-green-600">₹{((stockMetrics?.total_value || 0) / 100000).toFixed(1)}L</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-muted-foreground">Low Stock</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">{stockMetrics?.low_stock_count || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-red-600" />
              <span className="text-sm text-muted-foreground">Zero Stock</span>
            </div>
            <div className="text-2xl font-bold text-red-600">{stockMetrics?.zero_stock_count || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Avg Age</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{Math.round(stockMetrics?.avg_stock_age || 0)}d</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Export */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items, codes, categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="zero_stock">Zero Stock</SelectItem>
                <SelectItem value="high_value">High Value</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => exportStockData('excel')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button variant="outline" onClick={() => exportStockData('csv')}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Stock Items ({filteredData.length} of {stockData.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No stock data available with current filters
              </p>
              <Button onClick={() => {
                setSearchTerm('');
                setFilterCategory('all');
                setFilterStatus('all');
              }}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Current Qty</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Reorder Level</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => (
                    <TableRow key={item.item_code}>
                      <TableCell className="font-medium">{item.item_code}</TableCell>
                      <TableCell>{item.item_name || '-'}</TableCell>
                      <TableCell>{item.category_name || '-'}</TableCell>
                      <TableCell className="text-right font-medium">{item.current_qty.toLocaleString()}</TableCell>
                      <TableCell className="text-right">₹{item.unit_cost.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-medium">₹{item.total_value.toFixed(2)}</TableCell>
                      <TableCell>{item.location}</TableCell>
                      <TableCell className="text-right">{item.reorder_level.toLocaleString()}</TableCell>
                      <TableCell>{getStockStatusBadge(item)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};