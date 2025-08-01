import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Search,
  Filter,
  Download,
  DollarSign,
  Package,
  Users,
  Calendar
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface GRNPriceTrend {
  item_code: string;
  item_name: string;
  vendor_name: string;
  grn_date: string;
  unit_rate: number;
  qty_received: number;
  total_amount: number;
  price_variance_pct: number;
  is_outlier: boolean;
}

interface VendorPerformance {
  vendor_id: string;
  vendor_name: string;
  avg_price: number;
  price_stability: number;
  total_grns: number;
  total_value: number;
  performance_score: number;
}

interface PriceAlert {
  item_code: string;
  item_name: string;
  current_price: number;
  previous_avg: number;
  variance_pct: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  grn_reference: string;
  vendor_name: string;
}

export function GRNPricingAnalytics() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [grnTrends, setGrnTrends] = useState<GRNPriceTrend[]>([]);
  const [vendorPerformance, setVendorPerformance] = useState<VendorPerformance[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState('all');
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    loadPricingData();
  }, [dateRange, selectedVendor]);

  const loadPricingData = async () => {
    try {
      setLoading(true);

      // Calculate date filter
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      // Load GRN pricing trends
      const { data: grnData, error: grnError } = await supabase
        .from('dkegl_grn_log')
        .select(`
          *
        `)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .not('unit_rate', 'is', null)
        .gt('unit_rate', 0)
        .order('date', { ascending: false });

      if (grnError) throw grnError;

      // Process GRN trends with variance calculation
      const trendsWithVariance = await Promise.all(
        (grnData || []).map(async (grn) => {
          // Calculate historical average for variance
          const { data: histData } = await supabase
            .from('dkegl_grn_log')
            .select('unit_rate')
            .eq('item_code', grn.item_code)
            .lt('date', grn.date)
            .not('unit_rate', 'is', null)
            .gt('unit_rate', 0)
            .order('date', { ascending: false })
            .limit(5);

          const histAvg = histData && histData.length > 0 
            ? histData.reduce((sum, h) => sum + h.unit_rate, 0) / histData.length
            : grn.unit_rate;

          const variance = histAvg > 0 ? ((grn.unit_rate - histAvg) / histAvg) * 100 : 0;

          return {
            item_code: grn.item_code,
            item_name: 'Item Name',
            vendor_name: 'Vendor',
            grn_date: grn.date,
            unit_rate: grn.unit_rate,
            qty_received: grn.qty_received,
            total_amount: grn.total_amount || 0,
            price_variance_pct: variance,
            is_outlier: Math.abs(variance) > 20
          };
        })
      );

      setGrnTrends(trendsWithVariance);

      // Calculate vendor performance
      const vendorStats = new Map<string, {
        vendor_name: string;
        prices: number[];
        total_grns: number;
        total_value: number;
      }>();

      trendsWithVariance.forEach(trend => {
        const key = trend.vendor_name;
        if (!vendorStats.has(key)) {
          vendorStats.set(key, {
            vendor_name: key,
            prices: [],
            total_grns: 0,
            total_value: 0
          });
        }
        const stats = vendorStats.get(key)!;
        stats.prices.push(trend.unit_rate);
        stats.total_grns += 1;
        stats.total_value += trend.total_amount;
      });

      const vendorPerf: VendorPerformance[] = Array.from(vendorStats.entries()).map(([_, stats]) => {
        const avgPrice = stats.prices.reduce((sum, p) => sum + p, 0) / stats.prices.length;
        const variance = stats.prices.length > 1 
          ? Math.sqrt(stats.prices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / (stats.prices.length - 1))
          : 0;
        const stability = variance > 0 ? Math.max(0, 100 - (variance / avgPrice) * 100) : 100;
        
        return {
          vendor_id: stats.vendor_name,
          vendor_name: stats.vendor_name,
          avg_price: avgPrice,
          price_stability: stability,
          total_grns: stats.total_grns,
          total_value: stats.total_value,
          performance_score: (stability * 0.6) + (Math.min(stats.total_grns / 10, 1) * 40)
        };
      }).sort((a, b) => b.performance_score - a.performance_score);

      setVendorPerformance(vendorPerf);

      // Generate price alerts for significant variances
      const alerts: PriceAlert[] = trendsWithVariance
        .filter(trend => Math.abs(trend.price_variance_pct) > 15)
        .map(trend => ({
          item_code: trend.item_code,
          item_name: trend.item_name,
          current_price: trend.unit_rate,
          previous_avg: trend.unit_rate / (1 + trend.price_variance_pct / 100),
          variance_pct: trend.price_variance_pct,
          severity: Math.abs(trend.price_variance_pct) > 50 ? 'critical' as const
                   : Math.abs(trend.price_variance_pct) > 30 ? 'high' as const
                   : Math.abs(trend.price_variance_pct) > 20 ? 'medium' as const : 'low' as const,
          grn_reference: `GRN-${trend.grn_date}`,
          vendor_name: trend.vendor_name
        }))
        .slice(0, 20);

      setPriceAlerts(alerts);

    } catch (error: any) {
      toast({
        title: "Error loading pricing data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-destructive';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-blue-500';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variant = severity === 'critical' ? 'destructive' 
                   : severity === 'high' ? 'secondary'
                   : severity === 'medium' ? 'outline' : 'default';
    return <Badge variant={variant}>{severity.toUpperCase()}</Badge>;
  };

  // Filter data based on search and vendor selection
  const filteredTrends = grnTrends.filter(trend => {
    const matchesSearch = trend.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trend.item_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVendor = selectedVendor === 'all' || trend.vendor_name === selectedVendor;
    return matchesSearch && matchesVendor;
  });

  const filteredAlerts = priceAlerts.filter(alert => 
    alert.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.item_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Prepare chart data
  const priceChartData = filteredTrends
    .slice(0, 20)
    .map(trend => ({
      date: new Date(trend.grn_date).toLocaleDateString(),
      price: trend.unit_rate,
      item: trend.item_code,
      variance: trend.price_variance_pct
    }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GRN Purchase Pricing Analytics</h1>
          <p className="text-muted-foreground">
            Monitor vendor pricing trends, analyze purchase costs, and track price variations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/inventory/pricing')}>
            <DollarSign className="h-4 w-4 mr-2" />
            Stock Valuation
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={selectedVendor} onValueChange={setSelectedVendor}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Vendors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendorPerformance.map(vendor => (
              <SelectItem key={vendor.vendor_id} value={vendor.vendor_name}>
                {vendor.vendor_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Purchase Price</p>
                <p className="text-xl font-bold">
                  ₹{filteredTrends.length > 0 
                    ? (filteredTrends.reduce((sum, t) => sum + t.unit_rate, 0) / filteredTrends.length).toFixed(2)
                    : '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total GRNs</p>
                <p className="text-xl font-bold">{filteredTrends.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Price Alerts</p>
                <p className="text-xl font-bold">{filteredAlerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Vendors</p>
                <p className="text-xl font-bold">{vendorPerformance.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Price Trends</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Performance</TabsTrigger>
          <TabsTrigger value="alerts">Price Alerts</TabsTrigger>
          <TabsTrigger value="analysis">Cost Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Price Movements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>GRN Purchase History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Unit Rate</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrends.slice(0, 10).map((trend, index) => (
                    <TableRow key={index}>
                      <TableCell>{new Date(trend.grn_date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-mono">{trend.item_code}</TableCell>
                      <TableCell>{trend.item_name}</TableCell>
                      <TableCell>{trend.vendor_name}</TableCell>
                      <TableCell>₹{trend.unit_rate.toFixed(2)}</TableCell>
                      <TableCell>{trend.qty_received}</TableCell>
                      <TableCell>₹{trend.total_amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {trend.price_variance_pct > 0 ? (
                            <TrendingUp className="h-4 w-4 text-red-500" />
                          ) : trend.price_variance_pct < 0 ? (
                            <TrendingDown className="h-4 w-4 text-green-500" />
                          ) : null}
                          <span className={trend.price_variance_pct > 10 ? 'text-red-500' : trend.price_variance_pct < -10 ? 'text-green-500' : ''}>
                            {trend.price_variance_pct.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendor Pricing Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor Name</TableHead>
                    <TableHead>Avg Price</TableHead>
                    <TableHead>Price Stability</TableHead>
                    <TableHead>Total GRNs</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Performance Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorPerformance.map((vendor, index) => (
                    <TableRow key={vendor.vendor_id}>
                      <TableCell className="font-medium">{vendor.vendor_name}</TableCell>
                      <TableCell>₹{vendor.avg_price.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-muted rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full" 
                              style={{ width: `${vendor.price_stability}%` }}
                            />
                          </div>
                          <span className="text-sm">{vendor.price_stability.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{vendor.total_grns}</TableCell>
                      <TableCell>₹{vendor.total_value.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={vendor.performance_score > 80 ? 'default' : vendor.performance_score > 60 ? 'secondary' : 'outline'}>
                          {vendor.performance_score.toFixed(0)}/100
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Price Variance Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Current Price</TableHead>
                    <TableHead>Previous Avg</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>GRN Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.map((alert, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{alert.item_code}</TableCell>
                      <TableCell>{alert.item_name}</TableCell>
                      <TableCell>₹{alert.current_price.toFixed(2)}</TableCell>
                      <TableCell>₹{alert.previous_avg.toFixed(2)}</TableCell>
                      <TableCell className={getSeverityColor(alert.severity)}>
                        {alert.variance_pct > 0 ? '+' : ''}{alert.variance_pct.toFixed(1)}%
                      </TableCell>
                      <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                      <TableCell>{alert.vendor_name}</TableCell>
                      <TableCell className="font-mono">{alert.grn_reference}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Price Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priceChartData.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="item" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="price" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Variance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Items with positive variance</span>
                    <span className="font-medium">{filteredTrends.filter(t => t.price_variance_pct > 0).length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Items with negative variance</span>
                    <span className="font-medium">{filteredTrends.filter(t => t.price_variance_pct < 0).length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Price outliers detected</span>
                    <span className="font-medium text-orange-500">{filteredTrends.filter(t => t.is_outlier).length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Average variance</span>
                    <span className="font-medium">
                      {filteredTrends.length > 0 
                        ? (filteredTrends.reduce((sum, t) => sum + Math.abs(t.price_variance_pct), 0) / filteredTrends.length).toFixed(1)
                        : '0.0'}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}