import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Upload, 
  Download,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Warehouse,
  BarChart3
} from 'lucide-react';

interface StockItem {
  id: string;
  item_code: string;
  item_name?: string;
  category_name?: string;
  current_qty: number;
  opening_qty: number;
  unit_cost?: number;
  total_value?: number;
  location?: string;
  last_transaction_date?: string;
  reorder_level?: number;
  last_updated: string;
}

interface OpeningStockForm {
  item_code: string;
  opening_qty: number;
  unit_cost: number;
  location: string;
  date: string;
}

export default function StockManagement() {
  const { toast } = useToast();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isOpeningStockDialogOpen, setIsOpeningStockDialogOpen] = useState(false);
  const [availableItems, setAvailableItems] = useState<any[]>([]);

  const [openingStockForm, setOpeningStockForm] = useState<OpeningStockForm>({
    item_code: '',
    opening_qty: 0,
    unit_cost: 0,
    location: 'MAIN-STORE',
    date: '2025-03-31' // Financial year opening
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load stock items with item details
      const { data: stockData, error: stockError } = await supabase
        .from('dkegl_stock')
        .select(`
          *,
          dkegl_item_master!inner(
            item_name,
            reorder_level,
            dkegl_categories(category_name)
          )
        `)
        .order('last_updated', { ascending: false });

      if (stockError) throw stockError;
      
      const formattedStock = stockData?.map(stock => ({
        ...stock,
        item_name: stock.dkegl_item_master?.item_name,
        category_name: stock.dkegl_item_master?.dkegl_categories?.category_name,
        reorder_level: stock.dkegl_item_master?.reorder_level
      })) || [];
      
      setStockItems(formattedStock);

      // Load available items for opening stock
      const { data: itemsData, error: itemsError } = await supabase
        .from('dkegl_item_master')
        .select('id, item_code, item_name')
        .eq('status', 'active')
        .order('item_name');

      if (itemsError) throw itemsError;
      setAvailableItems(itemsData || []);

    } catch (error: any) {
      toast({
        title: "Error loading stock data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpeningStockSubmit = async (e: React.FormEvent) => {
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

      // Insert or update opening stock
      const { error } = await supabase
        .from('dkegl_stock')
        .upsert({
          organization_id: userProfile.organization_id,
          item_code: openingStockForm.item_code,
          opening_qty: openingStockForm.opening_qty,
          current_qty: openingStockForm.opening_qty,
          unit_cost: openingStockForm.unit_cost,
          total_value: openingStockForm.opening_qty * openingStockForm.unit_cost,
          location: openingStockForm.location,
          last_transaction_date: openingStockForm.date,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'organization_id,item_code,location'
        });

      if (error) throw error;

      toast({
        title: "Opening stock updated successfully",
        description: `Opening stock for ${openingStockForm.item_code} has been set.`
      });

      setIsOpeningStockDialogOpen(false);
      resetOpeningStockForm();
      loadData();
    } catch (error: any) {
      toast({
        title: "Error updating opening stock",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetOpeningStockForm = () => {
    setOpeningStockForm({
      item_code: '',
      opening_qty: 0,
      unit_cost: 0,
      location: 'MAIN-STORE',
      date: '2025-03-31'
    });
  };

  const getStockStatus = (current: number, reorder: number) => {
    if (current <= 0) return { status: 'out-of-stock', label: 'Out of Stock', color: 'destructive' };
    if (current <= reorder) return { status: 'low-stock', label: 'Low Stock', color: 'warning' };
    return { status: 'in-stock', label: 'In Stock', color: 'default' };
  };

  const filteredStock = stockItems.filter(item => {
    const matchesSearch = item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.item_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = filterLocation === 'all' || item.location === filterLocation;
    
    let matchesStatus = true;
    if (filterStatus !== 'all') {
      const status = getStockStatus(item.current_qty, item.reorder_level || 0);
      matchesStatus = status.status === filterStatus;
    }
    
    return matchesSearch && matchesLocation && matchesStatus;
  });

  const stockSummary = {
    totalItems: stockItems.length,
    totalValue: stockItems.reduce((sum, item) => sum + (item.total_value || 0), 0),
    lowStockItems: stockItems.filter(item => item.current_qty <= (item.reorder_level || 0)).length,
    outOfStockItems: stockItems.filter(item => item.current_qty <= 0).length
  };

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
          <h1 className="text-3xl font-bold tracking-tight">Stock Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage your inventory levels
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
          <Dialog open={isOpeningStockDialogOpen} onOpenChange={setIsOpeningStockDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetOpeningStockForm}>
                <Plus className="h-4 w-4 mr-2" />
                Opening Stock
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set Opening Stock (Mar 31, 2025)</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleOpeningStockSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="item_code">Item *</Label>
                  <Select value={openingStockForm.item_code} onValueChange={(value) => setOpeningStockForm(prev => ({ ...prev, item_code: value }))}>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="opening_qty">Opening Quantity *</Label>
                    <Input
                      id="opening_qty"
                      type="number"
                      value={openingStockForm.opening_qty}
                      onChange={(e) => setOpeningStockForm(prev => ({ ...prev, opening_qty: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="unit_cost">Unit Cost *</Label>
                    <Input
                      id="unit_cost"
                      type="number"
                      step="0.01"
                      value={openingStockForm.unit_cost}
                      onChange={(e) => setOpeningStockForm(prev => ({ ...prev, unit_cost: parseFloat(e.target.value) || 0 }))}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Select value={openingStockForm.location} onValueChange={(value) => setOpeningStockForm(prev => ({ ...prev, location: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MAIN-STORE">Main Store</SelectItem>
                      <SelectItem value="RAW-MATERIAL">Raw Material</SelectItem>
                      <SelectItem value="FINISHED-GOODS">Finished Goods</SelectItem>
                      <SelectItem value="WORK-IN-PROGRESS">Work in Progress</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={openingStockForm.date}
                    onChange={(e) => setOpeningStockForm(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsOpeningStockDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    Set Opening Stock
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stock Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-semibold">{stockSummary.totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-semibold">₹{stockSummary.totalValue.toLocaleString()}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-semibold text-yellow-600">{stockSummary.lowStockItems}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-semibold text-red-600">{stockSummary.outOfStockItems}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by item name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="w-[180px]">
                <Warehouse className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="MAIN-STORE">Main Store</SelectItem>
                <SelectItem value="RAW-MATERIAL">Raw Material</SelectItem>
                <SelectItem value="FINISHED-GOODS">Finished Goods</SelectItem>
                <SelectItem value="WORK-IN-PROGRESS">Work in Progress</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Current Stock ({filteredStock.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStock.map((item) => {
                const status = getStockStatus(item.current_qty, item.reorder_level || 0);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.item_code}</TableCell>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell>{item.category_name}</TableCell>
                    <TableCell className="text-right">
                      {item.current_qty.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.reorder_level?.toLocaleString() || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{item.unit_cost?.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{item.total_value?.toLocaleString() || '0'}
                    </TableCell>
                    <TableCell>{item.location}</TableCell>
                    <TableCell>
                      <Badge variant={status.color as any}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(item.last_updated).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}