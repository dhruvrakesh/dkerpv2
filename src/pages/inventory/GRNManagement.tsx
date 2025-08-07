import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnterpriseItemSelector, type ItemOption } from '@/components/ui/enterprise-item-selector';
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
  X,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';
import { useEnterpriseExport } from '@/hooks/useEnterpriseExport';
import { GRNFormFields } from '@/components/inventory/GRNFormFix';

type QualityStatus = 'approved' | 'failed' | 'in_review' | 'passed' | 'pending' | 'rework_required';

interface GRNRecord {
  id: string;
  grn_number: string;
  item_code: string;
  item_name?: string;
  supplier_name: string;
  date: string;
  qty_received: number;
  unit_rate: number;
  total_amount: number;
  quality_status?: QualityStatus;
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
  uom: string;
  quality_status: QualityStatus;
  remarks: string;
}

export default function GRNManagement() {
  const { organization } = useDKEGLAuth();
  const { toast } = useToast();
  const { exportData, isExporting } = useEnterpriseExport();
  const [grnRecords, setGrnRecords] = useState<GRNRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedGrn, setSelectedGrn] = useState<GRNRecord | null>(null);
  const [availableItems, setAvailableItems] = useState<ItemOption[]>([]);

  const [grnForm, setGrnForm] = useState<GRNForm>({
    grn_number: '',
    item_code: '',
    supplier_name: '',
    date: new Date().toISOString().split('T')[0],
    qty_received: 0,
    unit_rate: 0,
    uom: 'PCS',
    quality_status: 'approved',
    remarks: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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

      // Load GRN records
      const { data: grnData, error: grnError } = await supabase
        .from('dkegl_grn_log')
        .select(`
          *,
          dkegl_item_master!inner(item_name, uom)
        `)
        .eq('organization_id', userProfile.organization_id)
        .order('date', { ascending: false });

      if (grnError) throw grnError;

      // Transform data to include item_name
      const transformedGrnData = grnData?.map(grn => ({
        ...grn,
        item_name: grn.dkegl_item_master?.item_name || '',
        uom: grn.dkegl_item_master?.uom || 'PCS'
      })) || [];

      setGrnRecords(transformedGrnData);

      // Load items for dropdown
      const { data: itemsData, error: itemsError } = await supabase
        .from('dkegl_item_master')
        .select('*')
        .eq('organization_id', userProfile.organization_id)
        .eq('status', 'active');

      if (itemsError) throw itemsError;

      const formattedItems: ItemOption[] = itemsData?.map(item => ({
        id: item.id,
        value: item.item_code,
        label: `${item.item_code} - ${item.item_name}`,
        item_code: item.item_code,
        item_name: item.item_name,
        category: item.category_id || 'general',
        uom: item.uom,
        specifications: item.specifications || {}
      })) || [];

      setAvailableItems(formattedItems);

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
          .insert(grnData);
        
        if (error) throw error;
        
        toast({
          title: "GRN created successfully",
          description: `GRN ${grnForm.grn_number} has been created and stock updated.`
        });
      }

      setIsCreateDialogOpen(false);
      setSelectedGrn(null);
      resetForm();
      await loadData();
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
      uom: 'PCS',
      quality_status: 'approved',
      remarks: ''
    });
  };

  const handleEdit = (grn: GRNRecord) => {
    setSelectedGrn(grn);
    setGrnForm({
      grn_number: grn.grn_number,
      item_code: grn.item_code,
      supplier_name: grn.supplier_name,
      date: grn.date,
      qty_received: grn.qty_received,
      unit_rate: grn.unit_rate,
      uom: grn.uom || 'PCS',
      quality_status: grn.quality_status || 'approved',
      remarks: grn.remarks || ''
    });
    setIsCreateDialogOpen(true);
  };

  const handleItemSelect = (itemCode: string) => {
    const selectedItem = availableItems.find(item => item.item_code === itemCode);
    if (selectedItem) {
      setGrnForm(prev => ({
        ...prev,
        item_code: itemCode,
        uom: selectedItem.uom || 'PCS'
      }));
    }
  };

  const getStatusColor = (status?: QualityStatus) => {
    switch (status) {
      case 'approved': 
      case 'passed': return 'bg-green-100 text-green-800';
      case 'failed': 
      case 'rework_required': return 'bg-red-100 text-red-800';
      case 'pending': 
      case 'in_review': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status?: QualityStatus) => {
    switch (status) {
      case 'approved': 
      case 'passed': return <CheckCircle className="h-4 w-4" />;
      case 'failed': 
      case 'rework_required': return <AlertCircle className="h-4 w-4" />;
      case 'pending': 
      case 'in_review': return <Clock className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleExport = async () => {
    if (!organization?.id) return;
    
    const filters = {
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    };

    await exportData('grn', 'excel', filters, organization.id);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'GRN Number': 'GRN202401010001',
        'Item Code': 'ITEM001',
        'Supplier Name': 'ABC Suppliers Ltd',
        'Date': '2024-01-01',
        'Quantity Received': 100,
        'Unit Rate': 50.00,
        'Quality Status': 'approved',
        'Remarks': 'Sample entry'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'GRN Template');
    XLSX.writeFile(wb, 'grn_upload_template.xlsx');
  };

  const filteredGrn = grnRecords.filter(grn => {
    const matchesSearch = !searchTerm || 
      grn.grn_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grn.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grn.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSupplier = filterSupplier === 'all' || grn.supplier_name === filterSupplier;
    const matchesStatus = filterStatus === 'all' || grn.quality_status === filterStatus;
    
    return matchesSearch && matchesSupplier && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">GRN Management</h2>
          <p className="text-muted-foreground">Manage goods received notes and stock entries</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Template
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
                    <EnterpriseItemSelector
                      items={availableItems}
                      value={grnForm.item_code}
                      onValueChange={handleItemSelect}
                      placeholder="Select item..."
                      searchPlaceholder="Search items by code, name, or category..."
                      showCategories={true}
                      showRecentItems={true}
                      maxResults={50}
                      className="w-full"
                    />
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
                  <GRNFormFields 
                    grnForm={grnForm}
                    handleInputChange={(field, value) => {
                      setGrnForm(prev => ({ 
                        ...prev, 
                        [field]: field === 'qty_received' || field === 'unit_rate' ? parseFloat(value) || 0 : value 
                      }));
                    }}
                  />
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
                    <Label>Total Amount</Label>
                    <Input
                      value={`₹${(grnForm.qty_received * grnForm.unit_rate).toFixed(2)}`}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quality_status">Quality Status</Label>
                    <Select value={grnForm.quality_status} onValueChange={(value: QualityStatus) => setGrnForm(prev => ({ ...prev, quality_status: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_review">In Review</SelectItem>
                        <SelectItem value="passed">Passed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                        <SelectItem value="rework_required">Rework Required</SelectItem>
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
                    placeholder="Additional notes..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button type="submit">
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
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by GRN number, item code, or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
                
              />
            </div>
            <Select value={filterSupplier} onValueChange={setFilterSupplier}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {[...new Set(grnRecords.map(grn => grn.supplier_name))].map(supplier => (
                  <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="rework_required">Rework Required</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* GRN Table */}
      <Card>
        <CardHeader>
          <CardTitle>GRN Records</CardTitle>
          <CardDescription>
            {filteredGrn.length} of {grnRecords.length} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>GRN Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Item Code</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Qty Received</TableHead>
                <TableHead>Unit Rate</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Quality Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGrn.map((grn) => (
                <TableRow key={grn.id}>
                  <TableCell className="font-medium">{grn.grn_number}</TableCell>
                  <TableCell>{new Date(grn.date).toLocaleDateString()}</TableCell>
                  <TableCell>{grn.item_code}</TableCell>
                  <TableCell>{grn.item_name}</TableCell>
                  <TableCell>{grn.supplier_name}</TableCell>
                  <TableCell>{grn.qty_received.toLocaleString()} {grn.uom}</TableCell>
                  <TableCell>₹{grn.unit_rate.toFixed(2)}</TableCell>
                  <TableCell>₹{grn.total_amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(grn.quality_status)}>
                      {getStatusIcon(grn.quality_status)}
                      <span className="ml-1">{grn.quality_status || 'pending'}</span>
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