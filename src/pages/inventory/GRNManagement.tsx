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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Upload, 
  Download,
  Edit,
  CheckCircle,
  AlertCircle,
  Clock,
  Save,
  X
} from 'lucide-react';

interface GRNRecord {
  id: string;
  grn_number: string;
  item_code: string;
  item_name?: string;
  supplier_name?: string;
  date: string;
  qty_received: number;
  unit_rate?: number;
  total_amount?: number;
  invoice_number?: string;
  invoice_date?: string;
  quality_status: 'pending' | 'approved' | 'rejected';
  remarks?: string;
  created_at: string;
  uom?: string;
}

interface GRNForm {
  grn_number: string;
  item_code: string;
  supplier_name: string;
  date: string;
  qty_received: number;
  unit_rate: number;
  invoice_number: string;
  invoice_date: string;
  quality_status: 'pending' | 'approved' | 'rejected';
  remarks: string;
  uom: string;
}

export default function GRNManagement() {
  const { toast } = useToast();
  const [grnRecords, setGrnRecords] = useState<GRNRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState<GRNRecord | null>(null);
  const [availableItems, setAvailableItems] = useState<any[]>([]);

  const [grnForm, setGrnForm] = useState<GRNForm>({
    grn_number: '',
    item_code: '',
    supplier_name: '',
    date: new Date().toISOString().split('T')[0],
    qty_received: 0,
    unit_rate: 0,
    invoice_number: '',
    invoice_date: '',
    quality_status: 'pending',
    remarks: '',
    uom: 'PCS'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load GRN records with item details
      const { data: grnData, error: grnError } = await supabase
        .from('dkegl_grn_log')
        .select(`
          *,
          dkegl_item_master!inner(item_name, uom)
        `)
        .order('created_at', { ascending: false });

      if (grnError) throw grnError;
      
      const formattedGrn = grnData?.map(grn => ({
        ...grn,
        item_name: grn.dkegl_item_master?.item_name,
        uom: grn.dkegl_item_master?.uom || grn.uom
      })) || [];
      
      setGrnRecords(formattedGrn);

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
        title: "Error loading GRN data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateGrnNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `GRN${year}${month}${day}${timestamp}`;
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

      const grnData = {
        ...grnForm,
        organization_id: userProfile.organization_id,
        total_amount: grnForm.qty_received * grnForm.unit_rate,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      if (selectedGrn) {
        // Update existing GRN
        const { error } = await supabase
          .from('dkegl_grn_log')
          .update(grnData)
          .eq('id', selectedGrn.id);
        
        if (error) throw error;
        
        toast({
          title: "GRN updated successfully",
          description: `GRN ${grnForm.grn_number} has been updated.`
        });
      } else {
        // Create new GRN
        const { error } = await supabase
          .from('dkegl_grn_log')
          .insert([grnData]);
        
        if (error) throw error;
        
        toast({
          title: "GRN created successfully",
          description: `GRN ${grnForm.grn_number} has been created and stock updated.`
        });
      }

      setIsCreateDialogOpen(false);
      setSelectedGrn(null);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: "Error saving GRN",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setGrnForm({
      grn_number: generateGrnNumber(),
      item_code: '',
      supplier_name: '',
      date: new Date().toISOString().split('T')[0],
      qty_received: 0,
      unit_rate: 0,
      invoice_number: '',
      invoice_date: '',
      quality_status: 'pending',
      remarks: '',
      uom: 'PCS'
    });
  };

  const handleEdit = (grn: GRNRecord) => {
    setSelectedGrn(grn);
    setGrnForm({
      grn_number: grn.grn_number,
      item_code: grn.item_code,
      supplier_name: grn.supplier_name || '',
      date: grn.date,
      qty_received: grn.qty_received,
      unit_rate: grn.unit_rate || 0,
      invoice_number: grn.invoice_number || '',
      invoice_date: grn.invoice_date || '',
      quality_status: grn.quality_status,
      remarks: grn.remarks || '',
      uom: grn.uom || 'PCS'
    });
    setIsCreateDialogOpen(true);
  };

  const handleItemSelect = (itemCode: string) => {
    const selectedItem = availableItems.find(item => item.item_code === itemCode);
    if (selectedItem) {
      setGrnForm(prev => ({
        ...prev,
        item_code: itemCode,
        uom: selectedItem.uom
      }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <AlertCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredGrn = grnRecords.filter(grn => {
    const matchesSearch = grn.grn_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         grn.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         grn.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         grn.item_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || grn.quality_status === filterStatus;
    
    let matchesDate = true;
    if (filterDateRange !== 'all') {
      const grnDate = new Date(grn.date);
      const now = new Date();
      const daysDiff = Math.ceil((now.getTime() - grnDate.getTime()) / (1000 * 3600 * 24));
      
      switch (filterDateRange) {
        case '7d': matchesDate = daysDiff <= 7; break;
        case '30d': matchesDate = daysDiff <= 30; break;
        case '90d': matchesDate = daysDiff <= 90; break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
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
          <h1 className="text-3xl font-bold tracking-tight">GRN Management</h1>
          <p className="text-muted-foreground">
            Goods Received Notes - Track incoming inventory
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setSelectedGrn(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                New GRN
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedGrn ? 'Edit GRN' : 'Create New GRN'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="grn_number">GRN Number *</Label>
                    <Input
                      id="grn_number"
                      value={grnForm.grn_number}
                      onChange={(e) => setGrnForm(prev => ({ ...prev, grn_number: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={grnForm.date}
                      onChange={(e) => setGrnForm(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="item_code">Item *</Label>
                    <Select value={grnForm.item_code} onValueChange={handleItemSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableItems.map(item => (
                          <SelectItem key={item.id} value={item.item_code}>
                            {item.item_code} - {item.item_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="supplier_name">Supplier Name *</Label>
                    <Input
                      id="supplier_name"
                      value={grnForm.supplier_name}
                      onChange={(e) => setGrnForm(prev => ({ ...prev, supplier_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="qty_received">Quantity Received *</Label>
                    <Input
                      id="qty_received"
                      type="number"
                      step="0.001"
                      value={grnForm.qty_received}
                      onChange={(e) => setGrnForm(prev => ({ ...prev, qty_received: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="uom">UOM</Label>
                    <Input
                      id="uom"
                      value={grnForm.uom}
                      onChange={(e) => setGrnForm(prev => ({ ...prev, uom: e.target.value }))}
                      readOnly
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit_rate">Unit Rate</Label>
                    <Input
                      id="unit_rate"
                      type="number"
                      step="0.01"
                      value={grnForm.unit_rate}
                      onChange={(e) => setGrnForm(prev => ({ ...prev, unit_rate: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label>Total Amount</Label>
                    <Input
                      value={`₹${(grnForm.qty_received * grnForm.unit_rate).toFixed(2)}`}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice_number">Invoice Number</Label>
                    <Input
                      id="invoice_number"
                      value={grnForm.invoice_number}
                      onChange={(e) => setGrnForm(prev => ({ ...prev, invoice_number: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="invoice_date">Invoice Date</Label>
                    <Input
                      id="invoice_date"
                      type="date"
                      value={grnForm.invoice_date}
                      onChange={(e) => setGrnForm(prev => ({ ...prev, invoice_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="quality_status">Quality Status</Label>
                    <Select value={grnForm.quality_status} onValueChange={(value: any) => setGrnForm(prev => ({ ...prev, quality_status: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={grnForm.remarks}
                    onChange={(e) => setGrnForm(prev => ({ ...prev, remarks: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setSelectedGrn(null);
                      resetForm();
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {selectedGrn ? 'Update' : 'Create'} GRN
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by GRN number, item code, or supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterDateRange} onValueChange={setFilterDateRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* GRN Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            GRN Records ({filteredGrn.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GRN Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Rate</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Quality Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGrn.map((grn) => (
                <TableRow key={grn.id}>
                  <TableCell className="font-mono">{grn.grn_number}</TableCell>
                  <TableCell>{new Date(grn.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{grn.item_code}</div>
                      <div className="text-sm text-muted-foreground">{grn.item_name}</div>
                    </div>
                  </TableCell>
                  <TableCell>{grn.supplier_name}</TableCell>
                  <TableCell className="text-right">
                    {grn.qty_received.toLocaleString()} {grn.uom}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{grn.unit_rate?.toFixed(2) || '0.00'}
                  </TableCell>
                  <TableCell className="text-right">
                    ₹{grn.total_amount?.toLocaleString() || '0'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(grn.quality_status) as any} className="flex items-center gap-1 w-fit">
                      {getStatusIcon(grn.quality_status)}
                      {grn.quality_status.charAt(0).toUpperCase() + grn.quality_status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(grn)}
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
    </div>
  );
}