import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Search,
  Bell,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Package
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PricingAlert {
  id: string;
  item_code: string;
  item_name: string;
  alert_type: 'grn_variance' | 'market_change' | 'tolerance_exceeded';
  current_standard_cost: number;
  current_market_price: number;
  variance_percentage: number;
  alert_severity: 'low' | 'medium' | 'high' | 'critical';
  grn_reference?: string;
  vendor_name?: string;
  is_acknowledged: boolean;
  created_at: string;
  last_updated: string;
}

interface PricingTrend {
  date: string;
  standard_cost: number;
  market_price: number;
  variance: number;
  item_code: string;
}

interface AlertSummary {
  total_alerts: number;
  critical_alerts: number;
  high_alerts: number;
  acknowledged_today: number;
  avg_response_time: number;
}

export function PricingVarianceMonitor() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<PricingAlert[]>([]);
  const [trendData, setTrendData] = useState<PricingTrend[]>([]);
  const [alertSummary, setAlertSummary] = useState<AlertSummary>({
    total_alerts: 0,
    critical_alerts: 0,
    high_alerts: 0,
    acknowledged_today: 0,
    avg_response_time: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('all');

  useEffect(() => {
    loadVarianceData();
    const interval = setInterval(loadVarianceData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadVarianceData = async () => {
    try {
      setLoading(true);

      // Load pricing variance alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('dkegl_pricing_variance_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (alertsError) throw alertsError;

      // Enhance alerts with item names and vendor info
      const enhancedAlerts = await Promise.all(
        (alertsData || []).map(async (alert) => {
          // Get item name
          const { data: itemData } = await supabase
            .from('dkegl_item_master')
            .select('item_name')
            .eq('item_code', alert.item_code)
            .eq('organization_id', alert.organization_id)
            .single();

          // Mock vendor name for now
          let vendorName = 'Vendor Name';

          return {
            id: alert.id,
            item_code: alert.item_code,
            item_name: itemData?.item_name || 'Unknown',
            alert_type: alert.alert_type as 'grn_variance' | 'market_change' | 'tolerance_exceeded',
            current_standard_cost: alert.current_master_price,
            current_market_price: alert.new_market_price,
            variance_percentage: alert.variance_percentage,
            alert_severity: alert.alert_severity as 'low' | 'medium' | 'high' | 'critical',
            grn_reference: alert.grn_reference,
            vendor_name: vendorName,
            is_acknowledged: !!alert.acknowledged_at,
            created_at: alert.created_at,
            last_updated: alert.updated_at
          };
        })
      );

      setAlerts(enhancedAlerts);

      // Calculate alert summary
      const summary: AlertSummary = {
        total_alerts: enhancedAlerts.filter(a => !a.is_acknowledged).length,
        critical_alerts: enhancedAlerts.filter(a => !a.is_acknowledged && a.alert_severity === 'critical').length,
        high_alerts: enhancedAlerts.filter(a => !a.is_acknowledged && a.alert_severity === 'high').length,
        acknowledged_today: enhancedAlerts.filter(a => a.is_acknowledged && 
          new Date(a.last_updated).toDateString() === new Date().toDateString()).length,
        avg_response_time: 4.2 // Mock value in hours
      };

      setAlertSummary(summary);

      // Generate trend data for charts
      const trends: PricingTrend[] = enhancedAlerts
        .slice(0, 10)
        .map(alert => ({
          date: new Date(alert.created_at).toLocaleDateString(),
          standard_cost: alert.current_standard_cost,
          market_price: alert.current_market_price,
          variance: alert.variance_percentage,
          item_code: alert.item_code
        }));

      setTrendData(trends);

    } catch (error: any) {
      toast({
        title: "Error loading variance data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('dkegl_pricing_variance_alerts')
        .update({ 
          acknowledged_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: "Alert acknowledged",
        description: "Variance alert has been acknowledged and resolved"
      });

      loadVarianceData();
    } catch (error: any) {
      toast({
        title: "Error acknowledging alert",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'high': return <TrendingUp className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    const variant = severity === 'critical' ? 'destructive' 
                   : severity === 'high' ? 'secondary'
                   : severity === 'medium' ? 'outline' : 'default';
    return <Badge variant={variant}>{severity.toUpperCase()}</Badge>;
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'grn_variance': return 'GRN Price Variance';
      case 'market_change': return 'Market Price Change';
      case 'tolerance_exceeded': return 'Tolerance Exceeded';
      default: return type;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.item_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = selectedSeverity === 'all' || alert.alert_severity === selectedSeverity;
    return matchesSearch && matchesSeverity && !alert.is_acknowledged;
  });

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
          <h1 className="text-3xl font-bold tracking-tight">Pricing Variance Monitor</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of pricing discrepancies and variance alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={alertSummary.critical_alerts > 0 ? 'destructive' : 'default'} className="animate-pulse">
            <Bell className="h-3 w-3 mr-1" />
            {alertSummary.total_alerts} Active Alerts
          </Badge>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {alertSummary.critical_alerts > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{alertSummary.critical_alerts} critical pricing variance alerts</strong> require immediate attention.
            These represent significant deviations from standard costs that could impact profitability.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
                <p className="text-xl font-bold">{alertSummary.total_alerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical</p>
                <p className="text-xl font-bold">{alertSummary.critical_alerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                <p className="text-xl font-bold">{alertSummary.high_alerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resolved Today</p>
                <p className="text-xl font-bold">{alertSummary.acknowledged_today}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response</p>
                <p className="text-xl font-bold">{alertSummary.avg_response_time}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <select 
          value={selectedSeverity} 
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="border rounded px-3 py-2 bg-background"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Variance Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing Variance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="variance" 
                  stroke="hsl(var(--destructive))" 
                  strokeWidth={2} 
                  name="Variance %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Pricing Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Item Code</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Alert Type</TableHead>
                <TableHead>Standard Cost</TableHead>
                <TableHead>Market Price</TableHead>
                <TableHead>Variance</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(alert.alert_severity)}
                      {getSeverityBadge(alert.alert_severity)}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{alert.item_code}</TableCell>
                  <TableCell>{alert.item_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getAlertTypeLabel(alert.alert_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>₹{alert.current_standard_cost.toFixed(2)}</TableCell>
                  <TableCell>₹{alert.current_market_price.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {alert.variance_percentage > 0 ? (
                        <TrendingUp className="h-4 w-4 text-red-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      )}
                      <span className={alert.variance_percentage > 0 ? 'text-red-500' : 'text-green-500'}>
                        {alert.variance_percentage > 0 ? '+' : ''}{alert.variance_percentage.toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{alert.vendor_name || '-'}</TableCell>
                  <TableCell>{new Date(alert.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAcknowledgeAlert(alert.id)}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredAlerts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No active alerts matching your criteria
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}