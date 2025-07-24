import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  DollarSign,
  Plus,
  Search,
  Edit,
  History,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Filter,
  Download,
  Upload
} from 'lucide-react';

interface PricingMasterRecord {
  id: string;
  item_code: string;
  item_name?: string;
  standard_cost: number;
  valuation_method: string;
  price_tolerance_percentage: number;
  effective_from: string;
  effective_until?: string;
  is_active: boolean;
  approval_status: string;
  version_number: number;
  pricing_notes?: string;
  approved_by?: string;
  updated_at: string;
}

interface PricingVarianceAlert {
  id: string;
  item_code: string;
  item_name?: string;
  alert_type: string;
  current_master_price: number;
  new_market_price: number;
  variance_percentage: number;
  grn_reference?: string;
  alert_severity: string;
  is_acknowledged: boolean;
  created_at: string;
}

interface PricingForm {
  item_code: string;
  standard_cost: number;
  valuation_method: string;
  price_tolerance_percentage: number;
  effective_from: string;
  effective_until: string;
  pricing_notes: string;
}

export default function PricingMaster() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pricingRecords, setPricingRecords] = useState<PricingMasterRecord[]>([]);
  const [varianceAlerts, setVarianceAlerts] = useState<PricingVarianceAlert[]>([]);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PricingMasterRecord | null>(null);

  const [pricingForm, setPricingForm] = useState<PricingForm>({
    item_code: '',
    standard_cost: 0,
    valuation_method: 'standard_cost',
    price_tolerance_percentage: 10,
    effective_from: new Date().toISOString().split('T')[0],
    effective_until: '',
    pricing_notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load pricing master records
      const { data: pricingData, error: pricingError } = await supabase
        .from('dkegl_pricing_master')
        .select(`
          *
        `)
        .order('updated_at', { ascending: false });

      if (pricingError) throw pricingError;

      // Get item names for pricing records
      const pricingWithNames = await Promise.all(
        (pricingData || []).map(async (record) => {
          const { data: itemData } = await supabase
            .from('dkegl_item_master')
            .select('item_name')
            .eq('item_code', record.item_code)
            .eq('organization_id', record.organization_id)
            .single();
          
          return {
            ...record,
            item_name: itemData?.item_name
          };
        })
      );

      setPricingRecords(pricingWithNames);

      // Load variance alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('dkegl_pricing_variance_alerts')
        .select('*')
        .eq('acknowledged_at', null)
        .order('created_at', { ascending: false });

      if (alertsError) throw alertsError;

      // Get item names for alerts
      const alertsWithNames = await Promise.all(
        (alertsData || []).map(async (alert) => {
          const { data: itemData } = await supabase
            .from('dkegl_item_master')
            .select('item_name')
            .eq('item_code', alert.item_code)
            .eq('organization_id', alert.organization_id)
            .single();
          
          return {
            ...alert,
            item_name: itemData?.item_name,
            is_acknowledged: !alert.acknowledged_at
          };
        })
      );

      setVarianceAlerts(alertsWithNames);

      // Load available items
      const { data: itemsData, error: itemsError } = await supabase
        .from('dkegl_item_master')
        .select('id, item_code, item_name, uom')
        .eq('status', 'active')
        .order('item_name');

      if (itemsError) throw itemsError;
      setAvailableItems(itemsData || []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const { data: userProfile } = await supabase
        .from('dkegl_user_profiles')
        .select('organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!userProfile?.organization_id) {
        throw new Error('Organization not found');
      }

      const pricingData = {
        ...pricingForm,
        organization_id: userProfile.organization_id,
        effective_until: pricingForm.effective_until || null,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      if (selectedRecord) {
        // Create new version instead of updating
        const { error } = await supabase
          .from('dkegl_pricing_master')
          .insert([{
            ...pricingData,
            version_number: selectedRecord.version_number + 1
          }]);

        if (error) throw error;

        toast({
          title: "Pricing updated successfully",
          description: `New pricing version created for ${pricingForm.item_code}`
        });
      } else {
        // Create new pricing record
        const { error } = await supabase
          .from('dkegl_pricing_master')
          .insert([pricingData]);

        if (error) throw error;

        toast({
          title: "Pricing created successfully",
          description: `Pricing master created for ${pricingForm.item_code}`
        });
      }

      setIsCreateDialogOpen(false);
      setSelectedRecord(null);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: "Error saving pricing",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPricingForm({
      item_code: '',
      standard_cost: 0,
      valuation_method: 'standard_cost',
      price_tolerance_percentage: 10,
      effective_from: new Date().toISOString().split('T')[0],
      effective_until: '',
      pricing_notes: ''
    });
  };

  const handleEdit = (record: PricingMasterRecord) => {
    setSelectedRecord(record);
    setPricingForm({
      item_code: record.item_code,
      standard_cost: record.standard_cost,
      valuation_method: record.valuation_method,
      price_tolerance_percentage: record.price_tolerance_percentage,
      effective_from: record.effective_from,
      effective_until: record.effective_until || '',
      pricing_notes: record.pricing_notes || ''
    });
    setIsCreateDialogOpen(true);
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('dkegl_pricing_variance_alerts')
        .update({ acknowledged_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) throw error;

      toast({
        title: "Alert acknowledged",
        description: "Variance alert has been acknowledged"
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error acknowledging alert",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const getVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
      switch (status) {
        case 'approved': return 'default';
        case 'pending': return 'secondary';
        case 'rejected': return 'destructive';
        default: return 'secondary';
      }
    };
    return <Badge variant={getVariant(status)}>{status}</Badge>;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-destructive';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  const filteredRecords = pricingRecords.filter(record => {
    const matchesSearch = record.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || record.approval_status === filterStatus;
    return matchesSearch && matchesStatus;
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
          <h1 className="text-3xl font-bold tracking-tight">Pricing Master</h1>
          <p className="text-muted-foreground">
            Manage standard costs and pricing policies for inventory items
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setSelectedRecord(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Pricing
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {selectedRecord ? 'Update Pricing Master' : 'Create Pricing Master'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="item_code">Item Code</Label>
                    <Select 
                      value={pricingForm.item_code} 
                      onValueChange={(value) => setPricingForm(prev => ({ ...prev, item_code: value }))}
                      disabled={!!selectedRecord}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableItems.map(item => (
                          <SelectItem key={item.item_code} value={item.item_code}>
                            {item.item_code} - {item.item_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="standard_cost">Standard Cost</Label>
                    <Input
                      id="standard_cost"
                      type="number"
                      step="0.01"
                      value={pricingForm.standard_cost}
                      onChange={(e) => setPricingForm(prev => ({ ...prev, standard_cost: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valuation_method">Valuation Method</Label>
                    <Select 
                      value={pricingForm.valuation_method} 
                      onValueChange={(value) => setPricingForm(prev => ({ ...prev, valuation_method: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard_cost">Standard Cost</SelectItem>
                        <SelectItem value="weighted_average">Weighted Average</SelectItem>
                        <SelectItem value="fifo">FIFO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price_tolerance">Price Tolerance (%)</Label>
                    <Input
                      id="price_tolerance"
                      type="number"
                      step="0.1"
                      value={pricingForm.price_tolerance_percentage}
                      onChange={(e) => setPricingForm(prev => ({ ...prev, price_tolerance_percentage: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="effective_from">Effective From</Label>
                    <Input
                      id="effective_from"
                      type="date"
                      value={pricingForm.effective_from}
                      onChange={(e) => setPricingForm(prev => ({ ...prev, effective_from: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="effective_until">Effective Until (Optional)</Label>
                    <Input
                      id="effective_until"
                      type="date"
                      value={pricingForm.effective_until}
                      onChange={(e) => setPricingForm(prev => ({ ...prev, effective_until: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pricing_notes">Pricing Notes</Label>
                  <Textarea
                    id="pricing_notes"
                    value={pricingForm.pricing_notes}
                    onChange={(e) => setPricingForm(prev => ({ ...prev, pricing_notes: e.target.value }))}
                    placeholder="Additional notes about this pricing..."
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : selectedRecord ? 'Update Pricing' : 'Create Pricing'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Pricing</p>
                <p className="text-xl font-bold">{pricingRecords.filter(r => r.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
                <p className="text-xl font-bold">{pricingRecords.filter(r => r.approval_status === 'pending').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Variance Alerts</p>
                <p className="text-xl font-bold">{varianceAlerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Approved</p>
                <p className="text-xl font-bold">{pricingRecords.filter(r => r.approval_status === 'approved').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="pricing" className="w-full">
        <TabsList>
          <TabsTrigger value="pricing">Pricing Master</TabsTrigger>
          <TabsTrigger value="alerts">
            Variance Alerts
            {varianceAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                {varianceAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by item code or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pricing Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Standard Cost</TableHead>
                    <TableHead>Valuation Method</TableHead>
                    <TableHead>Tolerance (%)</TableHead>
                    <TableHead>Effective From</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono">{record.item_code}</TableCell>
                      <TableCell>{record.item_name}</TableCell>
                      <TableCell>₹{record.standard_cost.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.valuation_method}</Badge>
                      </TableCell>
                      <TableCell>{record.price_tolerance_percentage}%</TableCell>
                      <TableCell>{new Date(record.effective_from).toLocaleDateString()}</TableCell>
                      <TableCell>{getStatusBadge(record.approval_status)}</TableCell>
                      <TableCell>v{record.version_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(record)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
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
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Master Price</TableHead>
                    <TableHead>Market Price</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>GRN Reference</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {varianceAlerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="font-mono">{alert.item_code}</TableCell>
                      <TableCell>₹{alert.current_master_price.toFixed(2)}</TableCell>
                      <TableCell>₹{alert.new_market_price.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {alert.new_market_price > alert.current_master_price ? (
                            <TrendingUp className="h-4 w-4 text-red-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-green-500" />
                          )}
                          <span className={getSeverityColor(alert.alert_severity)}>
                            {alert.variance_percentage.toFixed(1)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={alert.alert_severity === 'critical' ? 'destructive' : 'secondary'}>
                          {alert.alert_severity}
                        </Badge>
                      </TableCell>
                      <TableCell>{alert.grn_reference}</TableCell>
                      <TableCell>{new Date(alert.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Acknowledge
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}