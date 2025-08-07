import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  CalendarIcon, 
  TrendingUp, 
  Package, 
  DollarSign,
  Clock,
  BarChart3,
  Download,
  Upload,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';
import { useEnterpriseExport } from '@/hooks/useEnterpriseExport';
import { cn } from '@/lib/utils';

interface OpeningStockRecord {
  id: string;
  item_code: string;
  item_name: string;
  category_name: string;
  opening_qty: number;
  unit_cost: number;
  total_value: number;
  opening_date: string;
  grn_since_opening?: number;
  issues_since_opening?: number;
  current_calculated_qty?: number;
  approval_status: string;
  created_at: string;
  [key: string]: any; // For additional fields from database
}

interface StockAnalytics {
  totalItems: number;
  totalValue: number;
  avgValue: number;
  oldestEntry: string;
  newestEntry: string;
  categoryBreakdown: Record<string, { count: number; value: number }>;
}

export function EnhancedOpeningStockDashboard() {
  const { organization } = useDKEGLAuth();
  const { toast } = useToast();
  const { exportData, isExporting } = useEnterpriseExport();
  
  const [openingStock, setOpeningStock] = useState<OpeningStockRecord[]>([]);
  const [analytics, setAnalytics] = useState<StockAnalytics>({
    totalItems: 0,
    totalValue: 0,
    avgValue: 0,
    oldestEntry: '',
    newestEntry: '',
    categoryBreakdown: {}
  });
  
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dateFilter, setDateFilter] = useState<'all' | 'specific' | 'range'>('all');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  useEffect(() => {
    if (organization?.id) {
      loadOpeningStockData();
    }
  }, [organization?.id, selectedDate, dateFilter, startDate, endDate]);

  const loadOpeningStockData = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('dkegl_opening_stock_with_master')
        .select('*')
        .eq('organization_id', organization?.id);

      // Apply date filters
      if (dateFilter === 'specific' && selectedDate) {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        query = query.eq('opening_date', dateStr);
      } else if (dateFilter === 'range' && startDate && endDate) {
        query = query
          .gte('opening_date', format(startDate, 'yyyy-MM-dd'))
          .lte('opening_date', format(endDate, 'yyyy-MM-dd'));
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Map data to ensure all required fields are present
        const mappedData = data.map((item: any) => ({
          ...item,
          grn_since_opening: (item as any).grn_since_opening || 0,
          issues_since_opening: (item as any).issues_since_opening || 0,
          current_calculated_qty: (item as any).current_calculated_qty || item.opening_qty || 0,
        })) as OpeningStockRecord[];
        
        setOpeningStock(mappedData);
        calculateAnalytics(mappedData);
      }
    } catch (error) {
      console.error('Error loading opening stock:', error);
      toast({
        title: "Error",
        description: "Failed to load opening stock data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (data: OpeningStockRecord[]) => {
    const totalItems = data.length;
    const totalValue = data.reduce((sum, item) => sum + item.total_value, 0);
    const avgValue = totalItems > 0 ? totalValue / totalItems : 0;
    
    const dates = data.map(item => new Date(item.opening_date)).sort();
    const oldestEntry = dates.length > 0 ? format(dates[0], 'yyyy-MM-dd') : '';
    const newestEntry = dates.length > 0 ? format(dates[dates.length - 1], 'yyyy-MM-dd') : '';
    
    const categoryBreakdown = data.reduce((acc, item) => {
      const category = item.category_name || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = { count: 0, value: 0 };
      }
      acc[category].count++;
      acc[category].value += item.total_value;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    setAnalytics({
      totalItems,
      totalValue,
      avgValue,
      oldestEntry,
      newestEntry,
      categoryBreakdown
    });
  };

  const filteredData = openingStock.filter(item =>
    item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.category_name && item.category_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const topCategories = Object.entries(analytics.categoryBreakdown)
    .sort(([,a], [,b]) => b.value - a.value)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Opening Stock Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive opening stock management with date-based analysis
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
            <Button 
              variant={dateFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter('all')}
            >
              All Dates
            </Button>
            <Button 
              variant={dateFilter === 'specific' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter('specific')}
            >
              Specific Date
            </Button>
            <Button 
              variant={dateFilter === 'range' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter('range')}
            >
              Date Range
            </Button>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={async () => {
              if (!organization?.id) return;
              await exportData('stock', 'excel', {
                startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
                endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined
              }, organization.id);
            }}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Data'}
          </Button>
          
          <Button onClick={loadOpeningStockData} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Date Selection Controls */}
      {dateFilter === 'specific' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="date-picker">Opening Stock Date:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>
      )}

      {dateFilter === 'range' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Label>Date Range:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <span>to</span>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{analytics.totalItems.toLocaleString()}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-muted-foreground">Opening stock entries</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.totalValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">Avg: {formatCurrency(analytics.avgValue)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date Range</p>
                <p className="text-lg font-bold">
                  {analytics.oldestEntry && analytics.newestEntry 
                    ? `${Math.ceil((new Date(analytics.newestEntry).getTime() - new Date(analytics.oldestEntry).getTime()) / (1000 * 60 * 60 * 24))} days`
                    : 'N/A'}
                </p>
              </div>
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-muted-foreground">
                {analytics.oldestEntry} to {analytics.newestEntry}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{Object.keys(analytics.categoryBreakdown).length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-muted-foreground">Distinct categories</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="data" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="data">Stock Data</TabsTrigger>
          <TabsTrigger value="analytics">Category Analytics</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="space-y-6">
          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by item code, name, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Badge variant="secondary">
                  {filteredData.length} of {analytics.totalItems} items
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle>Opening Stock Details</CardTitle>
              <CardDescription>
                Comprehensive view of opening stock with real-time calculations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Code</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Opening Qty</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                      <TableHead>Opening Date</TableHead>
                      <TableHead className="text-right">GRN Since</TableHead>
                      <TableHead className="text-right">Issues Since</TableHead>
                      <TableHead className="text-right">Current Calc</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.length > 0 ? (
                      filteredData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.item_code}</TableCell>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell>{item.category_name}</TableCell>
                          <TableCell className="text-right">
                            {item.opening_qty.toLocaleString('en-IN', { minimumFractionDigits: 3 })}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.unit_cost)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.total_value)}
                          </TableCell>
                          <TableCell>
                            {format(new Date(item.opening_date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            +{(item.grn_since_opening || 0).toLocaleString('en-IN', { minimumFractionDigits: 3 })}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            -{(item.issues_since_opening || 0).toLocaleString('en-IN', { minimumFractionDigits: 3 })}
                          </TableCell>
                          <TableCell className="text-right font-medium text-blue-600">
                            {(item.current_calculated_qty || 0).toLocaleString('en-IN', { minimumFractionDigits: 3 })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.approval_status === 'approved' ? 'default' : 'secondary'}>
                              {item.approval_status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8">
                          No opening stock data found for the selected criteria
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>Opening stock value distribution by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topCategories.map(([category, stats], index) => (
                  <div key={category} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{category}</p>
                        <p className="text-sm text-muted-foreground">{stats.count} items</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(stats.value)}</p>
                      <p className="text-sm text-muted-foreground">
                        {((stats.value / analytics.totalValue) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Reconciliation</CardTitle>
              <CardDescription>Compare opening stock with current calculated values</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  Advanced reconciliation features coming soon...
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}