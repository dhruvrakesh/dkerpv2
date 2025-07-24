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
  Package, 
  Plus, 
  Search, 
  Filter, 
  Upload, 
  Download,
  Edit,
  Eye,
  Trash2,
  Save,
  X
} from 'lucide-react';

interface Category {
  id: string;
  category_name: string;
  category_code: string;
  description?: string;
}

interface ItemMaster {
  id: string;
  item_code: string;
  item_name: string;
  category_id?: string;
  category_name?: string;
  uom: string;
  hsn_code?: string;
  specifications: any;
  material_properties: any;
  dimensions: any;
  weight_per_unit?: number;
  reorder_level: number;
  reorder_quantity: number;
  lead_time_days: number;
  status: string;
  storage_location?: string;
  created_at: string;
  updated_at: string;
}

export default function ItemMaster() {
  const { toast } = useToast();
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemMaster | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState({
    item_name: '',
    category_id: '',
    uom: 'PCS',
    hsn_code: '',
    specifications: {},
    material_properties: {},
    dimensions: {},
    weight_per_unit: 0,
    reorder_level: 0,
    reorder_quantity: 0,
    lead_time_days: 0,
    storage_location: '',
    status: 'active'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('dkegl_categories')
        .select('*')
        .eq('is_active', true)
        .order('category_name');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Load items with category names
      const { data: itemsData, error: itemsError } = await supabase
        .from('dkegl_item_master')
        .select(`
          *,
          dkegl_categories!inner(category_name)
        `)
        .order('created_at', { ascending: false });

      if (itemsError) throw itemsError;
      
      const formattedItems = itemsData?.map(item => ({
        ...item,
        category_name: item.dkegl_categories?.category_name
      })) || [];
      
      setItems(formattedItems);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateItemCode = async (categoryId: string) => {
    try {
      const { data, error } = await supabase.rpc('dkegl_generate_item_code', {
        _org_id: (await supabase.from('dkegl_user_profiles').select('organization_id').eq('user_id', (await supabase.auth.getUser()).data.user?.id).single()).data?.organization_id,
        category_name: categories.find(c => c.id === categoryId)?.category_name || 'GENERAL',
        qualifier: formData.item_name.substring(0, 10),
        size_mm: '',
        gsm: null
      });
      
      if (error) throw error;
      return data;
    } catch (error: any) {
      toast({
        title: "Error generating item code",
        description: error.message,
        variant: "destructive"
      });
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Generate item code if creating new item
      let itemCode = selectedItem?.item_code;
      if (!selectedItem) {
        itemCode = await generateItemCode(formData.category_id);
        if (!itemCode) return;
      }

      const itemData = {
        ...formData,
        item_code: itemCode,
        organization_id: (await supabase.from('dkegl_user_profiles').select('organization_id').eq('user_id', (await supabase.auth.getUser()).data.user?.id).single()).data?.organization_id
      };

      if (selectedItem) {
        // Update existing item
        const { error } = await supabase
          .from('dkegl_item_master')
          .update(itemData)
          .eq('id', selectedItem.id);
        
        if (error) throw error;
        
        toast({
          title: "Item updated successfully",
          description: `${formData.item_name} has been updated.`
        });
      } else {
        // Create new item
        const { error } = await supabase
          .from('dkegl_item_master')
          .insert([itemData]);
        
        if (error) throw error;
        
        toast({
          title: "Item created successfully",
          description: `${formData.item_name} (${itemCode}) has been created.`
        });
      }

      setIsCreateDialogOpen(false);
      setSelectedItem(null);
      setIsEditMode(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: "Error saving item",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      item_name: '',
      category_id: '',
      uom: 'PCS',
      hsn_code: '',
      specifications: {},
      material_properties: {},
      dimensions: {},
      weight_per_unit: 0,
      reorder_level: 0,
      reorder_quantity: 0,
      lead_time_days: 0,
      storage_location: '',
      status: 'active'
    });
  };

  const handleEdit = (item: ItemMaster) => {
    setSelectedItem(item);
    setFormData({
      item_name: item.item_name,
      category_id: item.category_id || '',
      uom: item.uom,
      hsn_code: item.hsn_code || '',
      specifications: item.specifications || {},
      material_properties: item.material_properties || {},
      dimensions: item.dimensions || {},
      weight_per_unit: item.weight_per_unit || 0,
      reorder_level: item.reorder_level,
      reorder_quantity: item.reorder_quantity,
      lead_time_days: item.lead_time_days,
      storage_location: item.storage_location || '',
      status: item.status
    });
    setIsCreateDialogOpen(true);
    setIsEditMode(true);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.item_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category_id === filterCategory;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
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
          <h1 className="text-3xl font-bold tracking-tight">Item Master</h1>
          <p className="text-muted-foreground">
            Manage your inventory items and specifications
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setSelectedItem(null); setIsEditMode(false); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {isEditMode ? 'Edit Item' : 'Create New Item'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="item_name">Item Name *</Label>
                    <Input
                      id="item_name"
                      value={formData.item_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, item_name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="category_id">Category</Label>
                    <Select value={formData.category_id} onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.category_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="uom">Unit of Measure</Label>
                    <Select value={formData.uom} onValueChange={(value) => setFormData(prev => ({ ...prev, uom: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PCS">PCS</SelectItem>
                        <SelectItem value="KG">KG</SelectItem>
                        <SelectItem value="M">M</SelectItem>
                        <SelectItem value="SQM">SQM</SelectItem>
                        <SelectItem value="ROLL">ROLL</SelectItem>
                        <SelectItem value="SHEET">SHEET</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="hsn_code">HSN Code</Label>
                    <Input
                      id="hsn_code"
                      value={formData.hsn_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, hsn_code: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="weight_per_unit">Weight per Unit (kg)</Label>
                    <Input
                      id="weight_per_unit"
                      type="number"
                      step="0.001"
                      value={formData.weight_per_unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, weight_per_unit: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="storage_location">Storage Location</Label>
                    <Input
                      id="storage_location"
                      value={formData.storage_location}
                      onChange={(e) => setFormData(prev => ({ ...prev, storage_location: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reorder_level">Reorder Level</Label>
                    <Input
                      id="reorder_level"
                      type="number"
                      value={formData.reorder_level}
                      onChange={(e) => setFormData(prev => ({ ...prev, reorder_level: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reorder_quantity">Reorder Quantity</Label>
                    <Input
                      id="reorder_quantity"
                      type="number"
                      value={formData.reorder_quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, reorder_quantity: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lead_time_days">Lead Time (Days)</Label>
                    <Input
                      id="lead_time_days"
                      type="number"
                      value={formData.lead_time_days}
                      onChange={(e) => setFormData(prev => ({ ...prev, lead_time_days: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="discontinued">Discontinued</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setSelectedItem(null);
                      setIsEditMode(false);
                      resetForm();
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditMode ? 'Update' : 'Create'} Item
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
                  placeholder="Search items by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.category_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="discontinued">Discontinued</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Items ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono">{item.item_code}</TableCell>
                  <TableCell className="font-medium">{item.item_name}</TableCell>
                  <TableCell>{item.category_name}</TableCell>
                  <TableCell>{item.uom}</TableCell>
                  <TableCell>{item.reorder_level}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        item.status === 'active' ? 'default' : 
                        item.status === 'inactive' ? 'secondary' : 'destructive'
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
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