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
  Package
} from 'lucide-react';

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
          dkegl_item_master!inner(item_name, uom)
        `)
        .order('created_at', { ascending: false });

      if (issueError) throw issueError;
      
      const formattedIssues = issueData?.map(issue => ({
        ...issue,
        item_name: issue.dkegl_item_master?.item_name,
        uom: issue.dkegl_item_master?.uom
      })) || [];
      
      setIssueRecords(formattedIssues);

      // Load available items with current stock
      const { data: stockData, error: stockError } = await supabase
        .from('dkegl_stock')
        .select(`
          item_code,
          current_qty,
          dkegl_item_master!inner(id, item_name, uom)
        `)
        .gt('current_qty', 0)
        .order('dkegl_item_master.item_name');

      if (stockError) throw stockError;
      
      const formattedStock = stockData?.map(stock => ({
        id: stock.dkegl_item_master.id,
        item_code: stock.item_code,
        item_name: stock.dkegl_item_master.item_name,
        uom: stock.dkegl_item_master.uom,
        current_qty: stock.current_qty
      })) || [];
      
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

      const issueData = {
        ...issueForm,
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
                    <Select value={issueForm.item_code} onValueChange={handleItemSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select item" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableItems.map(item => (
                          <SelectItem key={item.id} value={item.item_code}>
                            {item.item_code} - {item.item_name} (Stock: {item.current_qty})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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