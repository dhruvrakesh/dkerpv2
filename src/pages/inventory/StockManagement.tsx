import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { StockMovementChart } from '@/components/analytics/StockMovementChart';
import { StockAgingChart } from '@/components/analytics/StockAgingChart';
import { PricingDashboard } from '@/components/analytics/PricingDashboard';
import { useStockAnalytics } from '@/hooks/useStockAnalytics';
import * as XLSX from 'xlsx';
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
  BarChart3,
  PieChart,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Info
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

interface BulkUploadState {
  isOpen: boolean;
  isProcessing: boolean;
  progress: number;
  processedRows: number;
  totalRows: number;
  errors: Array<{ row: number; error: string; data: any }>;
  successCount: number;
  file: File | null;
}

interface BulkUploadRow {
  item_code: string;
  opening_qty: number;
  unit_cost: number;
  location: string;
  date: string;
}

export default function StockManagement() {
  const { toast } = useToast();
  const analytics = useStockAnalytics();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isOpeningStockDialogOpen, setIsOpeningStockDialogOpen] = useState(false);
  const [availableItems, setAvailableItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Bulk upload state
  const [bulkUpload, setBulkUpload] = useState<BulkUploadState>({
    isOpen: false,
    isProcessing: false,
    progress: 0,
    processedRows: 0,
    totalRows: 0,
    errors: [],
    successCount: 0,
    file: null
  });

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

  // Enterprise-grade Export functionality
  const handleExport = async (format: 'excel' | 'csv' = 'excel') => {
    try {
      const dataToExport = filteredStock.map(item => ({
        'Item Code': item.item_code,
        'Item Name': item.item_name || '',
        'Category': item.category_name || '',
        'Current Stock': item.current_qty,
        'Opening Stock': item.opening_qty,
        'Reorder Level': item.reorder_level || 0,
        'Unit Cost': item.unit_cost || 0,
        'Total Value': item.total_value || 0,
        'Location': item.location || '',
        'Last Transaction Date': item.last_transaction_date || '',
        'Last Updated': new Date(item.last_updated).toLocaleDateString(),
        'Stock Status': getStockStatus(item.current_qty, item.reorder_level || 0).label
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Stock Data');

      // Auto-size columns
      const colWidths = Object.keys(dataToExport[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      ws['!cols'] = colWidths;

      const fileName = `stock_export_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      
      if (format === 'excel') {
        XLSX.writeFile(wb, fileName);
      } else {
        XLSX.writeFile(wb, fileName, { bookType: 'csv' });
      }

      toast({
        title: "Export successful",
        description: `Stock data exported to ${fileName}`
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Generate Excel template for bulk upload
  const downloadTemplate = () => {
    const templateData = [
      {
        'item_code': 'SAMPLE-001',
        'opening_qty': 100,
        'unit_cost': 25.50,
        'location': 'MAIN-STORE',
        'date': '2025-03-31'
      },
      {
        'item_code': 'SAMPLE-002',
        'opening_qty': 50,
        'unit_cost': 45.00,
        'location': 'RAW-MATERIAL',
        'date': '2025-03-31'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Opening Stock Template');

    // Add instructions sheet
    const instructions = [
      { Field: 'item_code', Description: 'Required. User-defined item code (must exist in Item Master)', Example: 'PROD-001' },
      { Field: 'opening_qty', Description: 'Required. Opening quantity (numeric)', Example: '100' },
      { Field: 'unit_cost', Description: 'Required. Unit cost (numeric with 2 decimals)', Example: '25.50' },
      { Field: 'location', Description: 'Required. Storage location', Example: 'MAIN-STORE, RAW-MATERIAL, FINISHED-GOODS, WORK-IN-PROGRESS' },
      { Field: 'date', Description: 'Required. Date in YYYY-MM-DD format', Example: '2025-03-31' }
    ];

    const instructionsWs = XLSX.utils.json_to_sheet(instructions);
    XLSX.utils.book_append_sheet(wb, instructionsWs, 'Instructions');

    XLSX.writeFile(wb, 'opening_stock_template.xlsx');

    toast({
      title: "Template downloaded",
      description: "Opening stock template downloaded successfully"
    });
  };

  // Validate bulk upload data
  const validateUploadData = (data: any[]): { isValid: boolean; errors: Array<{ row: number; error: string; data: any }> } => {
    const errors: Array<{ row: number; error: string; data: any }> = [];
    const availableItemCodes = new Set(availableItems.map(item => item.item_code));
    const validLocations = ['MAIN-STORE', 'RAW-MATERIAL', 'FINISHED-GOODS', 'WORK-IN-PROGRESS'];

    data.forEach((row, index) => {
      const rowNum = index + 2; // Excel row number (1-indexed + header)

      // Check required fields
      if (!row.item_code) {
        errors.push({ row: rowNum, error: 'Item code is required', data: row });
        return;
      }

      if (!availableItemCodes.has(row.item_code)) {
        errors.push({ row: rowNum, error: `Item code '${row.item_code}' not found in Item Master`, data: row });
      }

      if (typeof row.opening_qty !== 'number' || row.opening_qty < 0) {
        errors.push({ row: rowNum, error: 'Opening quantity must be a positive number', data: row });
      }

      if (typeof row.unit_cost !== 'number' || row.unit_cost < 0) {
        errors.push({ row: rowNum, error: 'Unit cost must be a positive number', data: row });
      }

      if (!validLocations.includes(row.location)) {
        errors.push({ row: rowNum, error: `Invalid location. Must be one of: ${validLocations.join(', ')}`, data: row });
      }

      if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
        errors.push({ row: rowNum, error: 'Date must be in YYYY-MM-DD format', data: row });
      }
    });

    return { isValid: errors.length === 0, errors };
  };

  // Process bulk upload
  const processBulkUpload = async (data: BulkUploadRow[]) => {
    setBulkUpload(prev => ({ ...prev, isProcessing: true, progress: 0, errors: [], successCount: 0 }));

    try {
      const { data: userProfile } = await supabase
        .from('dkegl_user_profiles')
        .select('organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!userProfile?.organization_id) {
        throw new Error('Organization not found');
      }

      const batchSize = 10;
      let successCount = 0;
      const errors: Array<{ row: number; error: string; data: any }> = [];

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        for (const row of batch) {
          try {
            const { error } = await supabase
              .from('dkegl_stock')
              .upsert({
                organization_id: userProfile.organization_id,
                item_code: row.item_code,
                opening_qty: row.opening_qty,
                current_qty: row.opening_qty,
                unit_cost: row.unit_cost,
                total_value: row.opening_qty * row.unit_cost,
                location: row.location,
                last_transaction_date: row.date,
                last_updated: new Date().toISOString()
              }, {
                onConflict: 'organization_id,item_code,location'
              });

            if (error) throw error;
            successCount++;
          } catch (error: any) {
            errors.push({ 
              row: data.indexOf(row) + 2, 
              error: error.message, 
              data: row 
            });
          }
        }

        // Update progress
        const progress = Math.min(((i + batchSize) / data.length) * 100, 100);
        setBulkUpload(prev => ({ 
          ...prev, 
          progress, 
          processedRows: i + batchSize,
          successCount,
          errors 
        }));

        // Small delay to prevent overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setBulkUpload(prev => ({ ...prev, isProcessing: false }));

      toast({
        title: "Bulk upload completed",
        description: `Successfully processed ${successCount} records${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
      });

      if (errors.length === 0) {
        loadData(); // Refresh data
      }

    } catch (error: any) {
      setBulkUpload(prev => ({ ...prev, isProcessing: false }));
      toast({
        title: "Bulk upload failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBulkUpload(prev => ({ ...prev, file }));

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as BulkUploadRow[];

          if (jsonData.length === 0) {
            throw new Error('No data found in the uploaded file');
          }

          setBulkUpload(prev => ({ ...prev, totalRows: jsonData.length }));

          // Validate data
          const validation = validateUploadData(jsonData);
          
          if (!validation.isValid) {
            setBulkUpload(prev => ({ ...prev, errors: validation.errors }));
            toast({
              title: "Validation failed",
              description: `Found ${validation.errors.length} validation errors. Please fix them before proceeding.`,
              variant: "destructive"
            });
            return;
          }

          // Process the upload
          await processBulkUpload(jsonData);

        } catch (error: any) {
          toast({
            title: "File processing failed",
            description: error.message,
            variant: "destructive"
          });
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      toast({
        title: "File upload failed",
        description: error.message,
        variant: "destructive"
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetBulkUpload = () => {
    setBulkUpload({
      isOpen: false,
      isProcessing: false,
      progress: 0,
      processedRows: 0,
      totalRows: 0,
      errors: [],
      successCount: 0,
      file: null
    });
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
          <h1 className="text-3xl font-bold tracking-tight">Stock Management & Analytics</h1>
          <p className="text-muted-foreground">
            Monitor inventory levels, analyze stock movements, and optimize pricing
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={bulkUpload.isOpen} onOpenChange={(open) => setBulkUpload(prev => ({ ...prev, isOpen: open }))}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setBulkUpload(prev => ({ ...prev, isOpen: true }))}>
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Enterprise Bulk Upload - Opening Stock
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Template Download */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-500" />
                        Download Template First
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Download the Excel template with sample data and instructions
                      </p>
                    </div>
                    <Button variant="outline" onClick={downloadTemplate}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                </div>

                {/* File Upload */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="bulk-upload">Upload Excel File</Label>
                    <Input
                      id="bulk-upload"
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      disabled={bulkUpload.isProcessing}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Supported formats: Excel (.xlsx, .xls) and CSV (.csv)
                    </p>
                  </div>

                  {/* Upload Progress */}
                  {bulkUpload.isProcessing && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>Processing...</span>
                        <span>{bulkUpload.processedRows} / {bulkUpload.totalRows} rows</span>
                      </div>
                      <Progress value={bulkUpload.progress} className="w-full" />
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          {bulkUpload.successCount} successful
                        </span>
                        {bulkUpload.errors.length > 0 && (
                          <span className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" />
                            {bulkUpload.errors.length} errors
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Upload Summary */}
                  {!bulkUpload.isProcessing && bulkUpload.totalRows > 0 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        {bulkUpload.errors.length === 0 ? (
                          <span className="text-green-600">
                            ✅ Successfully processed {bulkUpload.successCount} records
                          </span>
                        ) : (
                          <span>
                            Processed {bulkUpload.successCount} records with {bulkUpload.errors.length} errors
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Error Display */}
                  {bulkUpload.errors.length > 0 && !bulkUpload.isProcessing && (
                    <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                      <h4 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                        <XCircle className="h-4 w-4" />
                        Validation Errors ({bulkUpload.errors.length})
                      </h4>
                      <div className="space-y-2">
                        {bulkUpload.errors.map((error, index) => (
                          <div key={index} className="bg-red-50 border border-red-200 p-3 rounded text-sm">
                            <div className="font-medium text-red-800">Row {error.row}: {error.error}</div>
                            <div className="text-red-600 mt-1">
                              Data: {JSON.stringify(error.data)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={resetBulkUpload}>
                    {bulkUpload.errors.length === 0 && bulkUpload.successCount > 0 ? 'Close' : 'Cancel'}
                  </Button>
                  {bulkUpload.errors.length > 0 && (
                    <Button variant="outline" onClick={() => setBulkUpload(prev => ({ ...prev, errors: [] }))}>
                      Clear Errors
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
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

      {/* Enhanced Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Stock Overview
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Stock Movements
          </TabsTrigger>
          <TabsTrigger value="aging" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Stock Aging
          </TabsTrigger>
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Pricing Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <StockMovementChart 
            data={[]} 
            selectedItem={searchTerm || undefined}
          />
        </TabsContent>

        <TabsContent value="aging" className="space-y-4">
          <StockAgingChart data={[]} />
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <PricingDashboard 
            onCalculatePricing={analytics.calculateItemPricing}
            items={stockItems.map(item => ({ 
              item_code: item.item_code, 
              item_name: item.item_name || ''
            }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}