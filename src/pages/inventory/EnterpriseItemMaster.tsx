import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Download, Edit, FileText, Plus, Upload, Package, Cog, Archive, Zap } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Category {
  id: string;
  category_name: string;
}

interface ItemMaster {
  id?: string;
  item_code: string;
  item_name: string;
  category_id: string;
  uom: string;
  reorder_level: number;
  reorder_quantity: number;
  status: string;
  category_name?: string;
  item_type?: 'raw_material' | 'work_in_progress' | 'consumable' | 'finished_good';
  artwork_reference?: string;
  specification_reference?: string;
  parent_item_code?: string;
  technical_specs?: Record<string, any>;
  quality_specs?: Record<string, any>;
  hsn_code?: string;
  storage_location?: string;
  lead_time_days?: number;
  weight_per_unit?: number;
  stock_qty?: number;
  stock_status?: string;
}

interface BulkUploadState {
  isUploading: boolean;
  progress: number;
  errors: string[];
  successCount: number;
  totalCount: number;
}

export const EnterpriseItemMaster = () => {
  const { userProfile } = useDKEGLAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State management
  const [items, setItems] = useState<ItemMaster[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkUploadState, setBulkUploadState] = useState<BulkUploadState>({
    isUploading: false,
    progress: 0,
    errors: [],
    successCount: 0,
    totalCount: 0
  });

  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('all');
  const [activeView, setActiveView] = useState<string>('all');

  // Form data
  const [formData, setFormData] = useState<ItemMaster>({
    item_code: '',
    item_name: '',
    category_id: '',
    uom: 'PCS',
    reorder_level: 0,
    reorder_quantity: 0,
    status: 'active',
    item_type: 'raw_material',
    artwork_reference: '',
    specification_reference: '',
    parent_item_code: '',
    technical_specs: {},
    quality_specs: {},
    hsn_code: '',
    storage_location: '',
    lead_time_days: 0,
    weight_per_unit: 0
  });

  useEffect(() => {
    loadData();
  }, [userProfile]);

  const loadData = async () => {
    if (!userProfile?.organization_id) return;
    
    setLoading(true);
    try {
      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('dkegl_categories')
        .select('*')
        .eq('organization_id', userProfile.organization_id)
        .eq('is_active', true);

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Load items based on active view
      let query = supabase.from('dkegl_item_master').select(`
        *,
        dkegl_categories!inner(category_name)
      `).eq('organization_id', userProfile.organization_id);

      if (activeView !== 'all') {
        query = query.eq('item_type', activeView as 'raw_material' | 'work_in_progress' | 'consumable' | 'finished_good');
      }

      const { data: itemsData, error: itemsError } = await query;

      if (itemsError) throw itemsError;
      
      const formattedItems: ItemMaster[] = itemsData?.map(item => ({
        id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        category_id: item.category_id || '',
        uom: item.uom,
        reorder_level: item.reorder_level,
        reorder_quantity: item.reorder_quantity,
        status: item.status || 'active',
        category_name: item.dkegl_categories?.category_name,
        item_type: item.item_type as 'raw_material' | 'work_in_progress' | 'consumable' | 'finished_good',
        artwork_reference: item.artwork_reference || '',
        specification_reference: item.specification_reference || '',
        parent_item_code: item.parent_item_code || '',
        technical_specs: typeof item.technical_specs === 'object' ? item.technical_specs as Record<string, any> : {},
        quality_specs: typeof item.quality_specs === 'object' ? item.quality_specs as Record<string, any> : {},
        hsn_code: item.hsn_code || '',
        storage_location: item.storage_location || '',
        lead_time_days: item.lead_time_days || 0,
        weight_per_unit: item.weight_per_unit || 0
      })) || [];
      
      setItems(formattedItems);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const { data, error } = await supabase
        .from('dkegl_item_master')
        .select(`
          *,
          dkegl_categories!inner(category_name)
        `)
        .eq('organization_id', userProfile?.organization_id);

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "No Data Found",
          description: "No items found to export.",
          variant: "destructive",
        });
        return;
      }

      // Transform data for export with enterprise fields
      const exportData = data.map(item => ({
        'Item Code': item.item_code,
        'Item Name': item.item_name,
        'Category': item.dkegl_categories?.category_name || '',
        'UOM': item.uom,
        'Reorder Level': item.reorder_level,
        'Reorder Quantity': item.reorder_quantity,
        'Status': item.status,
        'Item Type': item.item_type || 'raw_material',
        'Artwork Reference': item.artwork_reference || '',
        'Specification Reference': item.specification_reference || '',
        'Parent Item Code': item.parent_item_code || '',
        'Technical Specs': item.technical_specs ? JSON.stringify(item.technical_specs) : '{}',
        'Quality Specs': item.quality_specs ? JSON.stringify(item.quality_specs) : '{}',
        'Storage Location': item.storage_location || '',
        'HSN Code': item.hsn_code || '',
        'Lead Time (Days)': item.lead_time_days || 0,
        'Weight Per Unit': item.weight_per_unit || 0,
        'Created At': new Date(item.created_at).toLocaleDateString()
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Enterprise Item Master');
      
      const filename = `enterprise_item_master_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast({
        title: "Export Successful",
        description: `${data.length} items exported successfully as ${filename}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export item master data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Item Code (Auto-generated if empty)': '',
        'Item Name': 'Sample Raw Material',
        'Category Name': 'Raw Materials',
        'UOM': 'KG',
        'Reorder Level': 10,
        'Reorder Quantity': 100,
        'Status': 'active',
        'Item Type': 'raw_material',
        'Artwork Reference': '',
        'Specification Reference': '',
        'Parent Item Code': '',
        'Technical Specs (JSON)': '{"thickness": "0.5mm", "material": "BOPP"}',
        'Quality Specs (JSON)': '{"tolerance": "±0.1mm", "strength": "high"}',
        'HSN Code': '39199090',
        'Storage Location': 'WH-A-01',
        'Lead Time (Days)': '7',
        'Weight Per Unit': '1.5'
      },
      {
        'Item Code (Auto-generated if empty)': '',
        'Item Name': 'Sample Finished Good',
        'Category Name': 'Packaging Materials',
        'UOM': 'PCS',
        'Reorder Level': 5,
        'Reorder Quantity': 50,
        'Status': 'active',
        'Item Type': 'finished_good',
        'Artwork Reference': 'ART001',
        'Specification Reference': 'SPEC001',
        'Parent Item Code': '',
        'Technical Specs (JSON)': '{"size": "100x200mm", "print_colors": 4}',
        'Quality Specs (JSON)': '{"print_quality": "high", "durability": "UV_resistant"}',
        'HSN Code': '48219090',
        'Storage Location': 'FG-A-01',
        'Lead Time (Days)': '14',
        'Weight Per Unit': '0.25'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Enterprise Item Master Template');
    XLSX.writeFile(wb, 'enterprise_item_master_template.xlsx');

    toast({
      title: "Enterprise Template Downloaded",
      description: "Enterprise-grade item master template with item types and specifications has been downloaded.",
    });
  };

  const resetForm = () => {
    setFormData({
      item_code: '',
      item_name: '',
      category_id: '',
      uom: 'PCS',
      reorder_level: 0,
      reorder_quantity: 0,
      status: 'active',
      item_type: 'raw_material',
      artwork_reference: '',
      specification_reference: '',
      parent_item_code: '',
      technical_specs: {},
      quality_specs: {},
      hsn_code: '',
      storage_location: '',
      lead_time_days: 0,
      weight_per_unit: 0
    });
    setIsEditing(false);
    setIsDialogOpen(false);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.item_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesItemType = itemTypeFilter === 'all' || item.item_type === itemTypeFilter;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesItemType;
  });

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'raw_material': return <Package className="h-4 w-4" />;
      case 'work_in_progress': return <Cog className="h-4 w-4" />;
      case 'consumable': return <Archive className="h-4 w-4" />;
      case 'finished_good': return <Zap className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'raw_material': return 'Raw Material';
      case 'work_in_progress': return 'Work in Progress';
      case 'consumable': return 'Consumable';
      case 'finished_good': return 'Finished Good';
      default: return 'Raw Material';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading enterprise item master...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Enterprise Item Master</h1>
          <p className="text-muted-foreground">
            Manage raw materials, WIP, consumables, and finished goods with enterprise features
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <FileText className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
            </DialogTrigger>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Tabs for different item types */}
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Items</TabsTrigger>
          <TabsTrigger value="raw_material">Raw Materials</TabsTrigger>
          <TabsTrigger value="work_in_progress">WIP</TabsTrigger>
          <TabsTrigger value="consumable">Consumables</TabsTrigger>
          <TabsTrigger value="finished_good">Finished Goods</TabsTrigger>
        </TabsList>

        <TabsContent value={activeView} className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search by item name or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.category_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                {activeView === 'all' && (
                  <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="raw_material">Raw Material</SelectItem>
                      <SelectItem value="work_in_progress">Work in Progress</SelectItem>
                      <SelectItem value="consumable">Consumable</SelectItem>
                      <SelectItem value="finished_good">Finished Good</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                {getItemTypeLabel(activeView === 'all' ? 'all' : activeView)} 
                <span className="text-muted-foreground ml-2">({filteredItems.length} items)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    {activeView === 'all' && <TableHead>Type</TableHead>}
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
                      {activeView === 'all' && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getItemTypeIcon(item.item_type || 'raw_material')}
                            <Badge variant="outline" className="capitalize">
                              {getItemTypeLabel(item.item_type || 'raw_material')}
                            </Badge>
                          </div>
                        </TableCell>
                      )}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFormData(item);
                            setIsEditing(true);
                            setIsDialogOpen(true);
                          }}
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
      </Tabs>
    </div>
  );
};