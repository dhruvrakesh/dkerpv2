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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  DollarSign,
  Plus,
  Search,
  Edit,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  TrendingUp,
  Calculator,
  FileCheck,
  History
} from 'lucide-react';

interface StandardCostRecord {
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
  market_comparison?: {
    last_grn_price: number;
    variance_pct: number;
    avg_market_price: number;
  };
}

interface ApprovalWorkflow {
  id: string;
  item_code: string;
  old_cost: number;
  new_cost: number;
  change_reason: string;
  requested_by: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
}

interface ValuationSummary {
  total_items: number;
  total_stock_value: number;
  pending_approvals: number;
  variance_alerts: number;
  avg_valuation_age: number;
}

export function EnhancedStockValuationMaster() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [standardCosts, setStandardCosts] = useState<StandardCostRecord[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalWorkflow[]>([]);
  const [valuationSummary, setValuationSummary] = useState<ValuationSummary>({
    total_items: 0,
    total_stock_value: 0,
    pending_approvals: 0,
    variance_alerts: 0,
    avg_valuation_age: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<StandardCostRecord | null>(null);

  const [costForm, setCostForm] = useState({
    item_code: '',
    standard_cost: 0,
    valuation_method: 'standard_cost',
    price_tolerance_percentage: 10,
    effective_from: new Date().toISOString().split('T')[0],
    effective_until: '',
    pricing_notes: '',
    change_reason: ''
  });

  useEffect(() => {
    loadValuationData();
  }, []);

  const loadValuationData = async () => {
    try {
      setLoading(true);

      // Load standard cost records with market comparison
      const { data: costData, error: costError } = await supabase
        .from('dkegl_pricing_master')
        .select(`
          *
        `)
        .eq('approval_status', 'approved')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (costError) throw costError;

      // Enhance with item names and market comparison
      const enhancedCosts = await Promise.all(
        (costData || []).map(async (record) => {
          // Get item name
          const { data: itemData } = await supabase
            .from('dkegl_item_master')
            .select('item_name')
            .eq('item_code', record.item_code)
            .eq('organization_id', record.organization_id)
            .single();

          // Get latest GRN price for comparison
          const { data: grnData } = await supabase
            .from('dkegl_grn_log')
            .select('unit_rate, total_amount, qty_received')
            .eq('item_code', record.item_code)
            .eq('organization_id', record.organization_id)
            .not('unit_rate', 'is', null)
            .gt('unit_rate', 0)
            .order('date', { ascending: false })
            .limit(5);

          let marketComparison = undefined;
          if (grnData && grnData.length > 0) {
            const avgMarketPrice = grnData.reduce((sum, grn) => sum + grn.unit_rate, 0) / grnData.length;
            const variance = ((avgMarketPrice - record.standard_cost) / record.standard_cost) * 100;
            
            marketComparison = {
              last_grn_price: grnData[0].unit_rate,
              variance_pct: variance,
              avg_market_price: avgMarketPrice
            };
          }

          return {
            ...record,
            item_name: itemData?.item_name,
            market_comparison: marketComparison
          };
        })
      );

      setStandardCosts(enhancedCosts);

      // Load pending approvals (mock data for now)
      setPendingApprovals([]);

      // Calculate valuation summary
      const summary: ValuationSummary = {
        total_items: enhancedCosts.length,
        total_stock_value: enhancedCosts.reduce((sum, cost) => sum + (cost.standard_cost * 100), 0), // Mock calculation
        pending_approvals: 0,
        variance_alerts: enhancedCosts.filter(cost => 
          cost.market_comparison && Math.abs(cost.market_comparison.variance_pct) > cost.price_tolerance_percentage
        ).length,
        avg_valuation_age: 30 // Mock value
      };

      setValuationSummary(summary);

    } catch (error: any) {
      toast({
        title: "Error loading valuation data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCostChange = async (e: React.FormEvent) => {
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

      // For significant cost changes, require approval workflow
      const costChange = selectedRecord ? Math.abs((costForm.standard_cost - selectedRecord.standard_cost) / selectedRecord.standard_cost) * 100 : 0;
      const requiresApproval = costChange > 20; // More than 20% change requires approval

      if (requiresApproval && !selectedRecord) {
        // Create approval request
        toast({
          title: "Approval Required",
          description: "This cost change requires approval due to significant variance",
          variant: "default"
        });
        setIsCreateDialogOpen(false);
        return;
      }

      const costData = {
        ...costForm,
        organization_id: userProfile.organization_id,
        effective_until: costForm.effective_until || null,
        created_by: (await supabase.auth.getUser()).data.user?.id,
        approval_status: requiresApproval ? 'pending' : 'approved'
      };

      if (selectedRecord) {
        // Create new version
        const { error } = await supabase
          .from('dkegl_pricing_master')
          .insert([{
            ...costData,
            version_number: selectedRecord.version_number + 1
          }]);

        if (error) throw error;

        toast({
          title: "Cost updated successfully",
          description: `New valuation version created for ${costForm.item_code}`
        });
      } else {
        // Create new cost record
        const { error } = await supabase
          .from('dkegl_pricing_master')
          .insert([costData]);

        if (error) throw error;

        toast({
          title: "Standard cost created",
          description: `Valuation master created for ${costForm.item_code}`
        });
      }

      setIsCreateDialogOpen(false);
      setSelectedRecord(null);
      resetForm();
      loadValuationData();
    } catch (error: any) {
      toast({
        title: "Error saving cost",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCostForm({
      item_code: '',
      standard_cost: 0,
      valuation_method: 'standard_cost',
      price_tolerance_percentage: 10,
      effective_from: new Date().toISOString().split('T')[0],
      effective_until: '',
      pricing_notes: '',
      change_reason: ''
    });
  };

  const handleEdit = (record: StandardCostRecord) => {
    setSelectedRecord(record);
    setCostForm({
      item_code: record.item_code,
      standard_cost: record.standard_cost,
      valuation_method: record.valuation_method,
      price_tolerance_percentage: record.price_tolerance_percentage,
      effective_from: record.effective_from,
      effective_until: record.effective_until || '',
      pricing_notes: record.pricing_notes || '',
      change_reason: ''
    });
    setIsCreateDialogOpen(true);
  };

  const getVarianceBadge = (variance?: number, tolerance?: number) => {
    if (!variance || !tolerance) return null;
    
    const isSignificant = Math.abs(variance) > tolerance;
    const variant = isSignificant ? 'destructive' : 'default';
    const icon = variance > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />;
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {icon}
        {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
      </Badge>
    );
  };

  const filteredCosts = standardCosts.filter(cost => {
    const matchesSearch = cost.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cost.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'variance_alert' && cost.market_comparison && 
                          Math.abs(cost.market_comparison.variance_pct) > cost.price_tolerance_percentage);
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
          <h1 className="text-3xl font-bold tracking-tight">Stock Valuation Master</h1>
          <p className="text-muted-foreground">
            Manage standard costs and valuation methods for accurate stock pricing
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setSelectedRecord(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                Set Standard Cost
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {selectedRecord ? 'Update Standard Cost' : 'Set New Standard Cost'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmitCostChange} className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Standard costs are used for stock valuation. Changes exceeding 20% require approval.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="item_code">Item Code</Label>
                    <Input
                      id="item_code"
                      value={costForm.item_code}
                      onChange={(e) => setCostForm(prev => ({ ...prev, item_code: e.target.value }))}
                      placeholder="Enter item code"
                      disabled={!!selectedRecord}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="standard_cost">Standard Cost (₹)</Label>
                    <Input
                      id="standard_cost"
                      type="number"
                      step="0.01"
                      value={costForm.standard_cost}
                      onChange={(e) => setCostForm(prev => ({ ...prev, standard_cost: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valuation_method">Valuation Method</Label>
                    <Select 
                      value={costForm.valuation_method} 
                      onValueChange={(value) => setCostForm(prev => ({ ...prev, valuation_method: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard_cost">Standard Cost</SelectItem>
                        <SelectItem value="weighted_average">Weighted Average</SelectItem>
                        <SelectItem value="fifo">FIFO</SelectItem>
                        <SelectItem value="moving_average">Moving Average</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price_tolerance">Variance Tolerance (%)</Label>
                    <Input
                      id="price_tolerance"
                      type="number"
                      step="0.1"
                      value={costForm.price_tolerance_percentage}
                      onChange={(e) => setCostForm(prev => ({ ...prev, price_tolerance_percentage: parseFloat(e.target.value) || 0 }))}
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
                      value={costForm.effective_from}
                      onChange={(e) => setCostForm(prev => ({ ...prev, effective_from: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="effective_until">Effective Until (Optional)</Label>
                    <Input
                      id="effective_until"
                      type="date"
                      value={costForm.effective_until}
                      onChange={(e) => setCostForm(prev => ({ ...prev, effective_until: e.target.value }))}
                    />
                  </div>
                </div>

                {selectedRecord && (
                  <div className="space-y-2">
                    <Label htmlFor="change_reason">Reason for Change</Label>
                    <Textarea
                      id="change_reason"
                      value={costForm.change_reason}
                      onChange={(e) => setCostForm(prev => ({ ...prev, change_reason: e.target.value }))}
                      placeholder="Explain why this cost change is necessary..."
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="pricing_notes">Valuation Notes</Label>
                  <Textarea
                    id="pricing_notes"
                    value={costForm.pricing_notes}
                    onChange={(e) => setCostForm(prev => ({ ...prev, pricing_notes: e.target.value }))}
                    placeholder="Additional notes about this valuation..."
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : selectedRecord ? 'Update Cost' : 'Set Standard Cost'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Stock Value</p>
                <p className="text-xl font-bold">₹{(valuationSummary.total_stock_value / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calculator className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Items Valued</p>
                <p className="text-xl font-bold">{valuationSummary.total_items}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
                <p className="text-xl font-bold">{valuationSummary.pending_approvals}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Variance Alerts</p>
                <p className="text-xl font-bold">{valuationSummary.variance_alerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <History className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Age (days)</p>
                <p className="text-xl font-bold">{valuationSummary.avg_valuation_age}</p>
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
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="variance_alert">Variance Alerts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="valuations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="valuations">Standard Costs</TabsTrigger>
          <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
          <TabsTrigger value="analysis">Valuation Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="valuations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Standard Cost Management</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Standard Cost</TableHead>
                    <TableHead>Valuation Method</TableHead>
                    <TableHead>Market Comparison</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Tolerance</TableHead>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCosts.map((cost) => (
                    <TableRow key={cost.id}>
                      <TableCell className="font-mono">{cost.item_code}</TableCell>
                      <TableCell>{cost.item_name || 'Unknown'}</TableCell>
                      <TableCell>₹{cost.standard_cost.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{cost.valuation_method}</Badge>
                      </TableCell>
                      <TableCell>
                        {cost.market_comparison ? (
                          <div className="text-sm">
                            <div>Last GRN: ₹{cost.market_comparison.last_grn_price.toFixed(2)}</div>
                            <div className="text-muted-foreground">
                              Avg: ₹{cost.market_comparison.avg_market_price.toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No data</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getVarianceBadge(cost.market_comparison?.variance_pct, cost.price_tolerance_percentage)}
                      </TableCell>
                      <TableCell>±{cost.price_tolerance_percentage}%</TableCell>
                      <TableCell>{new Date(cost.effective_from).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(cost)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Approval Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                No pending approvals
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Valuation Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {((filteredCosts.filter(c => c.market_comparison && Math.abs(c.market_comparison.variance_pct) <= c.price_tolerance_percentage).length / filteredCosts.length) * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Within Tolerance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-500">
                    {filteredCosts.filter(c => c.market_comparison && Math.abs(c.market_comparison.variance_pct) > c.price_tolerance_percentage).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Require Review</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-muted-foreground">
                    {filteredCosts.filter(c => !c.market_comparison).length}
                  </div>
                  <div className="text-sm text-muted-foreground">No Market Data</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}