import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnterpriseItemSelector } from '@/components/ui/enterprise-item-selector';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowRight, 
  Plus, 
  Search, 
  Filter, 
  Upload, 
  Download,
  Edit,
  AlertTriangle,
  Save,
  X,
  Package,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface IssueRecord {
  id: string;
  item_code: string;
  item_name?: string;
  date: string;
  qty_issued: number;
  department?: string;
  purpose?: string;
  requested_by?: string;
  approved_by?: string;
  remarks?: string;
  current_stock?: number;
  created_at: string;
  uom?: string;
}

interface IssueForm {
  item_code: string;
  date: string;
  qty_issued: number;
  department: string;
  purpose: string;
  requested_by: string;
  remarks: string;
}

export default function IssueManagement() {
  const { toast } = useToast();
  const [issueRecords, setIssueRecords] = useState<IssueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<IssueRecord | null>(null);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [stockInfo, setStockInfo] = useState<any>({});

  const [issueForm, setIssueForm] = useState<IssueForm>({
    item_code: '',
    date: new Date().toISOString().split('T')[0],
    qty_issued: 0,
    department: '',
    purpose: '',
    requested_by: '',
    remarks: ''
  });

  const departments = [
    'Production',
    'Quality Control',
    'Maintenance',
    'Research & Development',
    'Packaging',
    'Administration',
    'Security',
    'Other'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load issue records with item details
      const { data: issueData, error: issueError } = await supabase
        .from('dkegl_issue_log')
        .select(`
          *,
          dkegl_item_master!fk_issue_item_master(item_name, uom)
        `)
        .order('created_at', { ascending: false });

      if (issueError) throw issueError;
      
      const formattedIssues = issueData?.map(issue => ({
        ...issue,
        item_name: issue.dkegl_item_master?.item_name,
        uom: issue.dkegl_item_master?.uom
      })) || [];
      
      setIssueRecords(formattedIssues);

      // Get organization ID
      const { data: userProfile } = await supabase
        .from('dkegl_user_profiles')
        .select('organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!userProfile?.organization_id) {
        throw new Error('Organization not found');
      }

      // Load available items with current stock and category info
      const { data: stockData, error: stockError } = await supabase
        .from('dkegl_stock')
        .select(`
          item_code,
          current_qty,
          dkegl_item_master!inner (
            id, 
            item_name, 
            uom,
            status,
            dkegl_categories (category_name)
          )
        `)
        .eq('organization_id', userProfile.organization_id)
        .eq('dkegl_item_master.status', 'active')
        .gt('current_qty', 0);

      if (stockError) throw stockError;

      // Get usage statistics
      const { data: usageData, error: usageError } = await supabase
        .from('dkegl_issue_log')
        .select('item_code, date, qty_issued')
        .eq('organization_id', userProfile.organization_id)
        .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (usageError) throw usageError;

      // Calculate usage statistics
      const usageStats = usageData?.reduce((acc, usage) => {
        if (!acc[usage.item_code]) {
          acc[usage.item_code] = { count: 0, lastUsed: null };
        }
        acc[usage.item_code].count++;
        const usageDate = new Date(usage.date);
        if (!acc[usage.item_code].lastUsed || usageDate > acc[usage.item_code].lastUsed) {
          acc[usage.item_code].lastUsed = usageDate;
        }
        return acc;
      }, {} as Record<string, { count: number; lastUsed: Date | null }>) || {};
      
      const formattedStock = stockData?.map(stock => {
        const usage = usageStats[stock.item_code] || { count: 0, lastUsed: null };
        return {
          id: stock.dkegl_item_master.id,
          item_code: stock.item_code,
          item_name: stock.dkegl_item_master.item_name,
          uom: stock.dkegl_item_master.uom,
          category_name: (stock.dkegl_item_master.dkegl_categories as any)?.category_name,
          status: stock.dkegl_item_master.status,
          current_qty: stock.current_qty,
          usage_frequency: usage.count,
          last_used: usage.lastUsed
        };
      }).sort((a, b) => a.item_name.localeCompare(b.item_name)) || [];
      
      setAvailableItems(formattedStock);

      // Create stock info lookup
      const stockLookup = formattedStock.reduce((acc, item) => {
        acc[item.item_code] = {
          current_qty: item.current_qty,
          uom: item.uom
        };
        return acc;
      }, {} as any);
      setStockInfo(stockLookup);

    } catch (error: any) {
      toast({
        title: "Error loading issue data",
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
      
      // Check if we have enough stock
      const currentStock = stockInfo[issueForm.item_code]?.current_qty || 0;
      if (issueForm.qty_issued > currentStock) {
        toast({
          title: "Insufficient stock",
          description: `Only ${currentStock} units available. Cannot issue ${issueForm.qty_issued} units.`,
          variant: "destructive"
        });
        return;
      }

      const { data: userProfile } = await supabase
        .from('dkegl_user_profiles')
        .select('organization_id, full_name')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!userProfile?.organization_id) {
        throw new Error('Organization not found');
      }

      // Generate issue number
      const issueNumber = `ISS-${Date.now()}`;
      
      const issueData = {
        ...issueForm,
        issue_number: issueNumber,
        uom: getUom(issueForm.item_code),
        organization_id: userProfile.organization_id,
        requested_by: issueForm.requested_by || userProfile.full_name,
        approved_by: userProfile.full_name, // Auto-approve for now
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      if (selectedIssue) {
        // Update existing issue (Note: This will affect stock via triggers)
        const { error } = await supabase
          .from('dkegl_issue_log')
          .update(issueData)
          .eq('id', selectedIssue.id);
        
        if (error) throw error;
        
        toast({
          title: "Issue updated successfully",
          description: "Stock levels have been adjusted accordingly."
        });
      } else {
        // Create new issue
        const { error } = await supabase
          .from('dkegl_issue_log')
          .insert([issueData]);
        
        if (error) throw error;
        
        toast({
          title: "Issue created successfully",
          description: `${issueForm.qty_issued} units of ${issueForm.item_code} issued to ${issueForm.department}.`
        });
      }

      setIsCreateDialogOpen(false);
      setSelectedIssue(null);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: "Error saving issue",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setIssueForm({
      item_code: '',
      date: new Date().toISOString().split('T')[0],
      qty_issued: 0,
      department: '',
      purpose: '',
      requested_by: '',
      remarks: ''
    });
  };

  const handleEdit = (issue: IssueRecord) => {
    setSelectedIssue(issue);
    setIssueForm({
      item_code: issue.item_code,
      date: issue.date,
      qty_issued: issue.qty_issued,
      department: issue.department || '',
      purpose: issue.purpose || '',
      requested_by: issue.requested_by || '',
      remarks: issue.remarks || ''
    });
    setIsCreateDialogOpen(true);
  };

  const handleItemSelect = (itemCode: string) => {
    const selectedItem = availableItems.find(item => item.item_code === itemCode);
    if (selectedItem) {
      setIssueForm(prev => ({
        ...prev,
        item_code: itemCode
      }));
    }
  };

  const getCurrentStock = (itemCode: string) => {
    return stockInfo[itemCode]?.current_qty || 0;
  };

  const getUom = (itemCode: string) => {
    return stockInfo[itemCode]?.uom || 'PCS';
  };

  const handleExport = () => {
    try {
      const exportData = filteredIssues.map(issue => ({
        'Issue Number': issue.id.slice(0, 8),
        'Date': issue.date,
        'Item Code': issue.item_code,
        'Item Name': issue.item_name || '',
        'Quantity Issued': issue.qty_issued,
        'UOM': issue.uom || '',
        'Department': issue.department || '',
        'Purpose': issue.purpose || '',
        'Requested By': issue.requested_by || '',
        'Approved By': issue.approved_by || '',
        'Remarks': issue.remarks || '',
        'Created At': new Date(issue.created_at).toLocaleString()
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Issue Records');
      
      // Auto-size columns
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const colWidths = [];
      for (let col = range.s.c; col <= range.e.c; col++) {
        let maxWidth = 10;
        for (let row = range.s.r; row <= range.e.r; row++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          if (cell && cell.v) {
            maxWidth = Math.max(maxWidth, cell.v.toString().length);
          }
        }
        colWidths.push({ width: Math.min(maxWidth + 2, 50) });
      }
      worksheet['!cols'] = colWidths;

      const fileName = `issue_records_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: "Export successful",
        description: `${exportData.length} records exported to ${fileName}`
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const { data: userProfile } = await supabase
        .from('dkegl_user_profiles')
        .select('organization_id, full_name')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!userProfile?.organization_id) {
        throw new Error('Organization not found');
      }

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const [index, row] of jsonData.entries()) {
        try {
          const rowData = row as any;
          
          // Validate required fields
          if (!rowData['Item Code'] || !rowData['Quantity Issued'] || !rowData['Department']) {
            errors.push(`Row ${index + 2}: Missing required fields (Item Code, Quantity Issued, Department)`);
            errorCount++;
            continue;
          }

          // Check if item exists
          const itemExists = availableItems.find(item => item.item_code === rowData['Item Code']);
          if (!itemExists) {
            errors.push(`Row ${index + 2}: Item '${rowData['Item Code']}' not found`);
            errorCount++;
            continue;
          }

          // Check stock availability
          const currentStock = getCurrentStock(rowData['Item Code']);
          const qtyToIssue = parseFloat(rowData['Quantity Issued']) || 0;
          if (qtyToIssue > currentStock) {
            errors.push(`Row ${index + 2}: Insufficient stock for '${rowData['Item Code']}' (Available: ${currentStock}, Requested: ${qtyToIssue})`);
            errorCount++;
            continue;
          }

          const issueData = {
            issue_number: `ISS-${Date.now()}-${index}`,
            item_code: rowData['Item Code'],
            date: rowData['Date'] ? new Date(rowData['Date']).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            qty_issued: qtyToIssue,
            department: rowData['Department'],
            purpose: rowData['Purpose'] || '',
            requested_by: rowData['Requested By'] || userProfile.full_name,
            approved_by: userProfile.full_name,
            remarks: rowData['Remarks'] || '',
            uom: getUom(rowData['Item Code']),
            organization_id: userProfile.organization_id,
            created_by: (await supabase.auth.getUser()).data.user?.id
          };

          const { error } = await supabase
            .from('dkegl_issue_log')
            .insert([issueData]);

          if (error) throw error;
          successCount++;

        } catch (error: any) {
          errors.push(`Row ${index + 2}: ${error.message}`);
          errorCount++;
        }
      }

      // Reset file input
      event.target.value = '';

      if (successCount > 0) {
        toast({
          title: "Bulk upload completed",
          description: `${successCount} records processed successfully${errorCount > 0 ? `, ${errorCount} errors` : ''}`
        });
        loadData();
      }

      if (errors.length > 0) {
        console.error('Upload errors:', errors);
        toast({
          title: errorCount === jsonData.length ? "Upload failed" : "Partial upload completed",
          description: `${errorCount} errors occurred. Check console for details.`,
          variant: errorCount === jsonData.length ? "destructive" : "default"
        });
      }

    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Item Code': 'RAW_ADHESIVE_001',
        'Date': new Date().toISOString().split('T')[0],
        'Quantity Issued': 10,
        'Department': 'Production',
        'Purpose': 'Production Order #123',
        'Requested By': 'John Doe',
        'Remarks': 'For urgent production'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Issue Template');
    
    XLSX.writeFile(workbook, 'issue_upload_template.xlsx');
    
    toast({
      title: "Template downloaded",
      description: "Use this template for bulk upload"
    });
  };

  const filteredIssues = issueRecords.filter(issue => {
    const matchesSearch = issue.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         issue.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         issue.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         issue.purpose?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = filterDepartment === 'all' || issue.department === filterDepartment;
    
    let matchesDate = true;
    if (filterDateRange !== 'all') {
      const issueDate = new Date(issue.date);
      const now = new Date();
      const daysDiff = Math.ceil((now.getTime() - issueDate.getTime()) / (1000 * 3600 * 24));
      
      switch (filterDateRange) {
        case '7d': matchesDate = daysDiff <= 7; break;
        case '30d': matchesDate = daysDiff <= 30; break;
        case '90d': matchesDate = daysDiff <= 90; break;
      }
    }
    
    return matchesSearch && matchesDepartment && matchesDate;
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
          <h1 className="text-3xl font-bold tracking-tight">Issue Management</h1>
          <p className="text-muted-foreground">
            Track material issues and stock consumption
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="bulk-upload"
            />
            <Button variant="outline" size="sm" asChild>
              <label htmlFor="bulk-upload" className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </label>
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Template
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setSelectedIssue(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                New Issue
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedIssue ? 'Edit Issue' : 'Create New Issue'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="item_code">Item *</Label>
                    <EnterpriseItemSelector
                      items={availableItems}
                      value={issueForm.item_code}
                      onValueChange={handleItemSelect}
                      placeholder="Select item to issue"
                      searchPlaceholder="Search by item code, name, or category..."
                      showCategories={true}
                      showRecentItems={true}
                    />
                    {issueForm.item_code && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Stock: {getCurrentStock(issueForm.item_code)} {getUom(issueForm.item_code)}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={issueForm.date}
                      onChange={(e) => setIssueForm(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="qty_issued">Quantity to Issue *</Label>
                    <div className="relative">
                      <Input
                        id="qty_issued"
                        type="number"
                        step="0.001"
                        value={issueForm.qty_issued}
                        onChange={(e) => setIssueForm(prev => ({ ...prev, qty_issued: parseFloat(e.target.value) || 0 }))}
                        required
                        className={issueForm.item_code && issueForm.qty_issued > getCurrentStock(issueForm.item_code) ? 'border-red-500' : ''}
                      />
                      {issueForm.item_code && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Available: {getCurrentStock(issueForm.item_code)} {getUom(issueForm.item_code)}
                          {issueForm.qty_issued > getCurrentStock(issueForm.item_code) && (
                            <span className="text-red-500 flex items-center gap-1 mt-1">
                              <AlertTriangle className="h-3 w-3" />
                              Insufficient stock
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="department">Department *</Label>
                    <Select value={issueForm.department} onValueChange={(value) => setIssueForm(prev => ({ ...prev, department: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="purpose">Purpose</Label>
                    <Input
                      id="purpose"
                      value={issueForm.purpose}
                      onChange={(e) => setIssueForm(prev => ({ ...prev, purpose: e.target.value }))}
                      placeholder="e.g., Production Order #123"
                    />
                  </div>
                  <div>
                    <Label htmlFor="requested_by">Requested By</Label>
                    <Input
                      id="requested_by"
                      value={issueForm.requested_by}
                      onChange={(e) => setIssueForm(prev => ({ ...prev, requested_by: e.target.value }))}
                      placeholder="Employee name"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={issueForm.remarks}
                    onChange={(e) => setIssueForm(prev => ({ ...prev, remarks: e.target.value }))}
                    rows={3}
                    placeholder="Additional notes or comments"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setSelectedIssue(null);
                      resetForm();
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading || (issueForm.item_code && issueForm.qty_issued > getCurrentStock(issueForm.item_code))}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {selectedIssue ? 'Update' : 'Create'} Issue
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
                  placeholder="Search by item code, department, or purpose..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
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

      {/* Issue Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Issue Records ({filteredIssues.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIssues.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell>{new Date(issue.date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{issue.item_code}</div>
                      <div className="text-sm text-muted-foreground">{issue.item_name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {issue.qty_issued.toLocaleString()} {issue.uom}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{issue.department}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{issue.purpose}</TableCell>
                  <TableCell>{issue.requested_by}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(issue)}
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