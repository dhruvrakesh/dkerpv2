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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [duplicateConflicts, setDuplicateConflicts] = useState<any[]>([]);

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

  const resetBulkUpload = () => {
    setBulkUploadState({
      isUploading: false,
      progress: 0,
      errors: [],
      successCount: 0,
      totalCount: 0
    });
    setValidationResults(null);
    setShowValidation(false);
    setDuplicateConflicts([]);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Enhanced category mapping with common industry codes
  const createEnhancedCategoryMap = () => {
    const categoryMap = new Map();
    const categoryCodeMap = new Map();
    
    categories.forEach(cat => {
      // Map by name
      categoryMap.set(cat.category_name.toLowerCase(), cat.id);
      
      // Map by common codes based on user's existing categories
      const name = cat.category_name.toLowerCase();
      if (name.includes('adhesive')) {
        categoryCodeMap.set('adh', cat.id);
        categoryCodeMap.set('adhesive', cat.id);
      }
      if (name.includes('bopp') || name.includes('film')) {
        categoryCodeMap.set('bopp', cat.id);
        categoryCodeMap.set('film', cat.id);
      }
      if (name.includes('chemical') || name.includes('chem')) {
        categoryCodeMap.set('chem', cat.id);
        categoryCodeMap.set('chemical', cat.id);
      }
      if (name.includes('consumable') || name.includes('supplies')) {
        categoryCodeMap.set('consumable', cat.id);
        categoryCodeMap.set('supplies', cat.id);
      }
      if (name.includes('core') || name.includes('roll')) {
        categoryCodeMap.set('core', cat.id);
        categoryCodeMap.set('roll', cat.id);
      }
      if (name.includes('cpp') || name.includes('polypropylene')) {
        categoryCodeMap.set('cpp', cat.id);
        categoryCodeMap.set('polypropylene', cat.id);
      }
      if (name.includes('finished') || name.includes('fg')) {
        categoryCodeMap.set('fg', cat.id);
        categoryCodeMap.set('finished', cat.id);
      }
      if (name.includes('ink') || name.includes('printing')) {
        categoryCodeMap.set('ink', cat.id);
        categoryCodeMap.set('printing', cat.id);
      }
      if (name.includes('ldpe') || name.includes('lamination') || name.includes('laminated')) {
        categoryCodeMap.set('ldpelam', cat.id);
        categoryCodeMap.set('ldpe', cat.id);
        categoryCodeMap.set('lamination', cat.id);
        categoryCodeMap.set('laminated', cat.id);
      }
      if (name.includes('machinery') || name.includes('equipment')) {
        categoryCodeMap.set('machinery', cat.id);
        categoryCodeMap.set('equipment', cat.id);
      }
      if (name.includes('paper')) {
        categoryCodeMap.set('paper', cat.id);
      }
      if (name.includes('pet') || name.includes('polyester')) {
        categoryCodeMap.set('pet', cat.id);
        categoryCodeMap.set('polyester', cat.id);
      }
      if (name.includes('wip') || name.includes('work in progress') || name.includes('progress')) {
        categoryCodeMap.set('wip', cat.id);
        categoryCodeMap.set('work in progress', cat.id);
        categoryCodeMap.set('progress', cat.id);
      }
      if (name.includes('machinery') || name.includes('equipment')) {
        categoryCodeMap.set('machinery', cat.id);
        categoryCodeMap.set('equipment', cat.id);
      }
      if (name.includes('paper')) {
        categoryCodeMap.set('paper', cat.id);
      }
      if (name.includes('pet') || name.includes('polyester')) {
        categoryCodeMap.set('pet', cat.id);
        categoryCodeMap.set('polyester', cat.id);
      }
      if (name.includes('finished') || name.includes('fg')) {
        categoryCodeMap.set('fg', cat.id);
        categoryCodeMap.set('finished', cat.id);
        categoryCodeMap.set('finished goods', cat.id);
      }
    });

    return { categoryMap, categoryCodeMap };
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast({
          title: "Empty File",
          description: "The uploaded file contains no data.",
          variant: "destructive",
        });
        return;
      }

      if (jsonData.length > 1000) {
        toast({
          title: "File Too Large",
          description: "Maximum 1000 items allowed per upload. Please split your file.",
          variant: "destructive",
        });
        return;
      }

      // Pre-validate all data before upload
      await validateFileData(jsonData);
    } catch (error) {
      console.error('File processing error:', error);
      toast({
        title: "File Processing Error",
        description: "Failed to process the Excel file. Please check the format.",
        variant: "destructive",
      });
    }
  };

  const processBulkUpload = async (data: any[]) => {
    if (!userProfile?.organization_id) return;

    setBulkUploadState(prev => ({
      ...prev,
      isUploading: true,
      progress: 0,
      errors: [],
      successCount: 0,
      totalCount: data.length
    }));

    const batchSize = 10;
    let processedCount = 0;
    let successCount = 0;
    const errors: string[] = [];

    // Create enhanced category mapping for quick lookup
    const categoryMaps = createEnhancedCategoryMap();

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (row, batchIndex) => {
        const rowIndex = i + batchIndex + 1;
        
        try {
          // Validate and process row data
          const itemData = await validateAndProcessRow(row, categoryMaps, rowIndex);
          if (!itemData) return;

          // Insert into database
          const { error } = await supabase
            .from('dkegl_item_master')
            .insert({
              ...itemData,
              organization_id: userProfile.organization_id
            });

          if (error) {
            errors.push(`Row ${rowIndex}: Database error - ${error.message}`);
          } else {
            successCount++;
          }
        } catch (error) {
          errors.push(`Row ${rowIndex}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        processedCount++;
        setBulkUploadState(prev => ({
          ...prev,
          progress: (processedCount / data.length) * 100,
          successCount,
          errors: [...errors]
        }));
      }));

      // Small delay to prevent overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setBulkUploadState(prev => ({
      ...prev,
      isUploading: false
    }));

    toast({
      title: "Bulk Upload Completed",
      description: `Successfully imported ${successCount} out of ${data.length} items.`,
      variant: successCount === data.length ? "default" : "destructive",
    });

    if (successCount > 0) {
      loadData(); // Refresh the data
    }
  };

  const normalizeItemType = (itemType: string): string => {
    const typeMap: Record<string, string> = {
      'raw material': 'raw_material',
      'raw materials': 'raw_material',
      'raw_material': 'raw_material',
      'work in progress': 'work_in_progress',
      'wip': 'work_in_progress',
      'work_in_progress': 'work_in_progress',
      'consumable': 'consumable',
      'consumables': 'consumable',
      'finished good': 'finished_good',
      'finished goods': 'finished_good',
      'finished_good': 'finished_good',
      'fg': 'finished_good'
    };
    
    const normalized = itemType.toLowerCase().trim();
    return typeMap[normalized] || 'raw_material';
  };

  // Enhanced category finding with code mapping
  const findCategoryId = (categoryName: string, { categoryMap, categoryCodeMap }: any): string | null => {
    if (!categoryName) return null;
    
    const searchName = categoryName.toLowerCase().trim();
    
    // First try exact match by name
    let categoryId = categoryMap.get(searchName);
    if (categoryId) return categoryId;
    
    // Try by category code
    categoryId = categoryCodeMap.get(searchName);
    if (categoryId) return categoryId;
    
    // Fuzzy matching - try partial matches
    for (const category of categories) {
      const catName = category.category_name.toLowerCase();
      if (catName.includes(searchName) || searchName.includes(catName)) {
        return category.id;
      }
    }
    
    return null;
  };

  // Pre-upload validation function
  const validateFileData = async (data: any[]) => {
    const { categoryMap, categoryCodeMap } = createEnhancedCategoryMap();
    const validationResults = {
      totalRows: data.length,
      validRows: 0,
      invalidRows: 0,
      errors: [] as any[],
      warnings: [] as any[],
      duplicates: [] as any[],
      preview: data.slice(0, 10), // Preview for display only
      validatedData: [] as any[] // All valid data for processing
    };

    // Check for existing item codes in database
    const existingCodes = new Set();
    if (data.some(row => row['Item Code (Auto-generated if empty)']?.toString().trim())) {
      const itemCodes = data
        .map(row => row['Item Code (Auto-generated if empty)']?.toString().trim())
        .filter(Boolean);
      
      if (itemCodes.length > 0) {
        const { data: existingItems } = await supabase
          .from('dkegl_item_master')
          .select('item_code')
          .in('item_code', itemCodes)
          .eq('organization_id', userProfile?.organization_id);
        
        existingItems?.forEach(item => existingCodes.add(item.item_code));
      }
    }

    // Track duplicates within the file
    const seenCodes = new Set();

    data.forEach((row, index) => {
      const rowIndex = index + 1;
      const rowErrors: string[] = [];
      const rowWarnings: string[] = [];

      // Required field validation
      const itemName = row['Item Name']?.toString().trim();
      if (!itemName) {
        rowErrors.push('Item Name is required');
      }

      const categoryName = row['Category Name']?.toString().trim();
      if (!categoryName) {
        rowErrors.push('Category Name is required');
      } else {
        const categoryId = findCategoryId(categoryName, { categoryMap, categoryCodeMap });
        if (!categoryId) {
          const suggestions = categories
            .filter(c => c.category_name.toLowerCase().includes(categoryName.toLowerCase()) || 
                          categoryName.toLowerCase().includes(c.category_name.toLowerCase()))
            .map(c => c.category_name)
            .slice(0, 3);
          
          const suggestionText = suggestions.length > 0 ? 
            ` Did you mean: ${suggestions.join(', ')}?` : 
            ` Available: ${categories.map(c => c.category_name).slice(0, 5).join(', ')}`;
          
          rowErrors.push(`Category "${categoryName}" not found.${suggestionText}`);
        }
      }

      // Item code validation
      const itemCode = row['Item Code (Auto-generated if empty)']?.toString().trim();
      if (itemCode) {
        if (existingCodes.has(itemCode)) {
          rowErrors.push(`Item code "${itemCode}" already exists in database`);
        }
        if (seenCodes.has(itemCode)) {
          validationResults.duplicates.push({
            row: rowIndex,
            type: 'Duplicate Code',
            value: itemCode,
            message: `Item code "${itemCode}" appears multiple times in the file`
          });
        }
        seenCodes.add(itemCode);
      }

      // Item type validation
      const rawItemType = row['Item Type']?.toString() || 'raw_material';
      const itemType = normalizeItemType(rawItemType);
      const validItemTypes = ['raw_material', 'work_in_progress', 'consumable', 'finished_good'];
      if (!validItemTypes.includes(itemType)) {
        rowErrors.push(`Invalid Item Type: "${rawItemType}". Must be one of: Raw Material, WIP, Consumable, Finished Good`);
      }

      // JSON validation
      try {
        if (row['Technical Specs (JSON)'] && row['Technical Specs (JSON)'].toString().trim()) {
          JSON.parse(row['Technical Specs (JSON)']);
        }
      } catch (e) {
        rowWarnings.push('Invalid Technical Specs JSON format');
      }

      try {
        if (row['Quality Specs (JSON)'] && row['Quality Specs (JSON)'].toString().trim()) {
          JSON.parse(row['Quality Specs (JSON)']);
        }
      } catch (e) {
        rowWarnings.push('Invalid Quality Specs JSON format');
      }

      // Numeric validation
      const reorderLevel = Number(row['Reorder Level']);
      if (row['Reorder Level'] && (isNaN(reorderLevel) || reorderLevel < 0)) {
        rowWarnings.push('Reorder Level should be a positive number');
      }

      if (rowErrors.length > 0) {
        validationResults.errors.push({
          row: rowIndex,
          errors: rowErrors,
          data: row
        });
        validationResults.invalidRows++;
      } else {
        validationResults.validRows++;
        validationResults.validatedData.push(row); // Add valid row to validated data
      }

      if (rowWarnings.length > 0) {
        validationResults.warnings.push({
          row: rowIndex,
          warnings: rowWarnings,
          data: row
        });
      }
    });

    setValidationResults(validationResults);
    setShowValidation(true);
  };

  // Process validated data
  const processValidatedUpload = async () => {
    if (!validationResults || validationResults.invalidRows > 0) {
      toast({
        title: "Cannot Process Upload",
        description: "Please fix all validation errors before proceeding.",
        variant: "destructive",
      });
      return;
    }

    const validData = validationResults.validatedData; // Use all validated data
    await processBulkUpload(validData);
    setShowValidation(false);
  };

  const generateItemCodeWithDB = async (categoryName: string, itemName: string): Promise<string> => {
    try {
      const { data, error } = await supabase.rpc('dkegl_generate_item_code', {
        _org_id: userProfile?.organization_id,
        category_name: categoryName,
        qualifier: itemName.split(' ')[0] || '',
        size_mm: '',
        gsm: null
      });
      
      if (error) throw error;
      return data || `GEN_${Date.now().toString().slice(-6)}`;
    } catch (error) {
      console.warn('DB item code generation failed, using fallback:', error);
      return `GEN_${Date.now().toString().slice(-6)}`;
    }
  };

  const validateAndProcessRow = async (row: any, categoryMaps: any, rowIndex: number): Promise<any | null> => {
    const errors: string[] = [];

    // Required fields validation
    const itemName = row['Item Name']?.toString().trim();
    if (!itemName) {
      errors.push('Item Name is required');
    }

    const categoryName = row['Category Name']?.toString().trim();
    if (!categoryName) {
      errors.push('Category Name is required');
    }

    // Enhanced category matching
    const categoryId = findCategoryId(categoryName, categoryMaps);
    if (categoryName && !categoryId) {
      const availableCategories = categories.map(c => c.category_name).join(', ');
      errors.push(`Category '${categoryName}' not found. Available categories: ${availableCategories}`);
    }

    const uom = row['UOM']?.toString().trim() || 'PCS';
    const status = row['Status']?.toString().toLowerCase() || 'active';
    
    // Enhanced item type normalization
    const rawItemType = row['Item Type']?.toString() || 'raw_material';
    const itemType = normalizeItemType(rawItemType);

    // Validate item type (after normalization)
    const validItemTypes = ['raw_material', 'work_in_progress', 'consumable', 'finished_good'];
    if (!validItemTypes.includes(itemType)) {
      errors.push(`Invalid Item Type: '${rawItemType}' (normalized to '${itemType}'). Must be one of: Raw Material, Work in Progress, Consumable, Finished Good`);
    }

    // Validate status
    const validStatuses = ['active', 'inactive'];
    if (!validStatuses.includes(status)) {
      errors.push(`Invalid Status: ${status}. Must be 'active' or 'inactive'`);
    }

    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }

    // Enhanced item code generation
    let itemCode = row['Item Code (Auto-generated if empty)']?.toString().trim();
    if (!itemCode) {
      try {
        itemCode = await generateItemCodeWithDB(categoryName, itemName);
      } catch (error) {
        console.warn('Fallback to simple item code generation:', error);
        const prefix = itemType.substring(0, 2).toUpperCase();
        const timestamp = Date.now().toString().slice(-6);
        itemCode = `${prefix}${timestamp}`;
      }
    }

    // Parse JSON fields safely
    let technicalSpecs = {};
    let qualitySpecs = {};

    try {
      if (row['Technical Specs (JSON)']) {
        technicalSpecs = JSON.parse(row['Technical Specs (JSON)']);
      }
    } catch (e) {
      console.warn(`Row ${rowIndex}: Invalid Technical Specs JSON, using empty object`);
    }

    try {
      if (row['Quality Specs (JSON)']) {
        qualitySpecs = JSON.parse(row['Quality Specs (JSON)']);
      }
    } catch (e) {
      console.warn(`Row ${rowIndex}: Invalid Quality Specs JSON, using empty object`);
    }

    return {
      item_code: itemCode,
      item_name: itemName,
      category_id: categoryId,
      uom,
      reorder_level: Number(row['Reorder Level']) || 0,
      reorder_quantity: Number(row['Reorder Quantity']) || 0,
      status,
      item_type: itemType,
      artwork_reference: row['Artwork Reference']?.toString().trim() || '',
      specification_reference: row['Specification Reference']?.toString().trim() || '',
      parent_item_code: row['Parent Item Code']?.toString().trim() || '',
      technical_specs: technicalSpecs,
      quality_specs: qualitySpecs,
      hsn_code: row['HSN Code']?.toString().trim() || '',
      storage_location: row['Storage Location']?.toString().trim() || '',
      lead_time_days: Number(row['Lead Time (Days)']) || 0,
      weight_per_unit: Number(row['Weight Per Unit']) || 0
    };
  };

  const downloadErrorReport = () => {
    if (bulkUploadState.errors.length === 0) return;

    const errorData = bulkUploadState.errors.map((error, index) => ({
      'Error #': index + 1,
      'Description': error
    }));

    const ws = XLSX.utils.json_to_sheet(errorData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bulk Upload Errors');
    
    const filename = `bulk_upload_errors_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);

    toast({
      title: "Error Report Downloaded",
      description: `Error report saved as ${filename}`,
    });
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.item_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesItemType = itemTypeFilter === 'all' || item.item_type === itemTypeFilter;
    const matchesActiveView = activeView === 'all' || item.item_type === activeView;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesItemType && matchesActiveView;
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bulk Import Item Master</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 min-h-0">
                {!bulkUploadState.isUploading && bulkUploadState.totalCount === 0 && (
                  <>
                    {/* File Upload Section */}
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        Upload an Excel file (.xlsx or .xls) with item master data. Download the template first to see the required format.
                      </div>
                      
                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      
                      {/* Drag and Drop Area */}
                      <div 
                        className="border-2 border-dashed border-muted rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const files = e.dataTransfer.files;
                          if (files[0]) {
                            const event = { target: { files } } as any;
                            handleFileChange(event);
                          }
                        }}
                      >
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <div className="text-lg font-medium mb-2">
                          Drop your Excel file here or click to browse
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Supports .xlsx and .xls files
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => fileInputRef.current?.click()}
                          className="flex-1"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Choose File
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={downloadTemplate}
                          className="flex-1"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Download Template
                        </Button>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="font-medium mb-2">Upload Instructions:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Download the template and fill in your data</li>
                        <li>• Required fields: Item Name, Category Name</li>
                        <li>• Item codes will be auto-generated if left empty</li>
                        <li>• Category names must match existing categories</li>
                        <li>• Technical and Quality specs should be valid JSON</li>
                        <li>• Maximum 1000 items per upload</li>
                      </ul>
                    </div>
                  </>
                )}

                {/* Validation Results */}
                {showValidation && validationResults && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-lg font-medium mb-2">File Validation Results</div>
                      <div className="text-sm text-muted-foreground">
                        Review the validation results before proceeding with the upload
                      </div>
                    </div>

                    {/* Validation Summary */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-blue-600">{validationResults.totalRows}</div>
                        <div className="text-sm text-blue-600">Total Rows</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">{validationResults.validRows}</div>
                        <div className="text-sm text-green-600">Valid</div>
                      </div>
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-red-600">{validationResults.invalidRows}</div>
                        <div className="text-sm text-red-600">Invalid</div>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-yellow-600">{validationResults.warnings.length}</div>
                        <div className="text-sm text-yellow-600">Warnings</div>
                      </div>
                    </div>

                    {/* Data Preview */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Data Preview (First 5 rows)</h4>
                      <div className="border rounded-lg overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Row</TableHead>
                              <TableHead>Item Name</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Item Type</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {validationResults.preview.slice(0, 5).map((row: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{row['Item Name'] || '-'}</TableCell>
                                <TableCell>{row['Category Name'] || '-'}</TableCell>
                                <TableCell>{row['Item Type'] || 'raw_material'}</TableCell>
                                <TableCell>
                                  <Badge variant={
                                    validationResults.errors.some((e: any) => e.row === index + 1) ? 'destructive' : 
                                    validationResults.warnings.some((w: any) => w.row === index + 1) ? 'secondary' : 'default'
                                  }>
                                    {validationResults.errors.some((e: any) => e.row === index + 1) ? 'Error' :
                                     validationResults.warnings.some((w: any) => w.row === index + 1) ? 'Warning' : 'Valid'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Errors */}
                    {validationResults.errors.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-destructive">Validation Errors ({validationResults.errors.length})</h4>
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 max-h-40 overflow-y-auto">
                          {validationResults.errors.map((error: any, index: number) => (
                            <div key={index} className="mb-3 pb-3 border-b border-destructive/20 last:border-b-0">
                              <div className="font-medium text-destructive mb-1">Row {error.row}:</div>
                              <ul className="text-sm space-y-1">
                                {error.errors.map((err: string, i: number) => (
                                  <li key={i} className="text-destructive">• {err}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Warnings */}
                    {validationResults.warnings.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-yellow-600">Warnings ({validationResults.warnings.length})</h4>
                        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 max-h-40 overflow-y-auto">
                          {validationResults.warnings.map((warning: any, index: number) => (
                            <div key={index} className="mb-3 pb-3 border-b border-yellow-200 dark:border-yellow-800 last:border-b-0">
                              <div className="font-medium text-yellow-600 mb-1">Row {warning.row}:</div>
                              <ul className="text-sm space-y-1">
                                {warning.warnings.map((warn: string, i: number) => (
                                  <li key={i} className="text-yellow-600">• {warn}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Duplicates */}
                    {validationResults.duplicates.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-orange-600">Duplicates Found ({validationResults.duplicates.length})</h4>
                        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 max-h-40 overflow-y-auto">
                          {validationResults.duplicates.map((dup: any, index: number) => (
                            <div key={index} className="mb-2 text-sm">
                              <span className="font-medium">Row {dup.row}:</span> {dup.message}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowValidation(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      {validationResults.invalidRows === 0 && (
                        <Button 
                          onClick={processValidatedUpload}
                          className="flex-1"
                        >
                          Proceed with Upload ({validationResults.validRows} items)
                        </Button>
                      )}
                      {validationResults.invalidRows > 0 && (
                        <Button 
                          variant="destructive"
                          disabled
                          className="flex-1"
                        >
                          Fix {validationResults.invalidRows} errors to proceed
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Upload Progress */}
                {bulkUploadState.isUploading && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-lg font-medium mb-2">Processing Upload...</div>
                      <div className="text-sm text-muted-foreground">
                        Processing {bulkUploadState.totalCount} items
                      </div>
                    </div>
                    
                    <Progress value={bulkUploadState.progress} className="w-full" />
                    
                    <div className="flex justify-between text-sm">
                      <span>Progress: {Math.round(bulkUploadState.progress)}%</span>
                      <span>Successful: {bulkUploadState.successCount}/{bulkUploadState.totalCount}</span>
                    </div>

                    {bulkUploadState.errors.length > 0 && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-destructive mb-2">
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-medium">Errors Found ({bulkUploadState.errors.length})</span>
                        </div>
                        <div className="text-sm max-h-32 overflow-y-auto">
                          {bulkUploadState.errors.slice(0, 5).map((error, index) => (
                            <div key={index} className="mb-1">{error}</div>
                          ))}
                          {bulkUploadState.errors.length > 5 && (
                            <div className="text-muted-foreground">
                              ... and {bulkUploadState.errors.length - 5} more errors
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Upload Complete */}
                {!bulkUploadState.isUploading && bulkUploadState.totalCount > 0 && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-lg font-medium mb-2">Upload Complete</div>
                      <div className="text-sm text-muted-foreground">
                        {bulkUploadState.successCount} out of {bulkUploadState.totalCount} items imported successfully
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">{bulkUploadState.successCount}</div>
                        <div className="text-sm text-green-600">Successful</div>
                      </div>
                      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-red-600">{bulkUploadState.errors.length}</div>
                        <div className="text-sm text-red-600">Errors</div>
                      </div>
                    </div>

                    {/* Error Report */}
                    {bulkUploadState.errors.length > 0 && (
                      <div className="space-y-3">
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-destructive mb-3">
                            <AlertCircle className="h-4 w-4" />
                            <span className="font-medium">Upload Errors</span>
                          </div>
                          <div className="text-sm max-h-40 overflow-y-auto space-y-1">
                            {bulkUploadState.errors.map((error, index) => (
                              <div key={index} className="font-mono text-xs bg-background/50 p-2 rounded border">
                                {error}
                              </div>
                            ))}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={downloadErrorReport}
                            className="mt-3"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Error Report
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={resetBulkUpload}
                        className="flex-1"
                      >
                        Upload Another File
                      </Button>
                      <Button 
                        onClick={() => setIsBulkDialogOpen(false)}
                        className="flex-1"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
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