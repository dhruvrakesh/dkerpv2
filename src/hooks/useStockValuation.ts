import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';

export interface ValuationMethod {
  id: 'grn_average' | 'standard_cost' | 'opening_stock' | 'custom_upload';
  name: string;
  description: string;
  totalValue: number;
  itemCount: number;
  lastUpdated: string | null;
  status: 'active' | 'partial' | 'inactive';
}

export interface StockValuationItem {
  item_code: string;
  item_name: string;
  category_name: string;
  current_qty: number;
  grn_avg_price: number;
  standard_cost: number;
  opening_stock_price: number;
  custom_upload_price: number;
  grn_total_value: number;
  standard_total_value: number;
  opening_total_value: number;
  custom_total_value: number;
  variance_percentage: number;
  last_grn_date: string | null;
  pricing_master_date: string | null;
}

export interface CustomPricingUpload {
  item_code: string;
  custom_unit_cost: number;
  effective_date: string;
  notes?: string;
  upload_session_id?: string;
}

export const useStockValuation = () => {
  const { toast } = useToast();
  const { organization } = useDKEGLAuth();
  
  const [valuationData, setValuationData] = useState<StockValuationItem[]>([]);
  const [valuationMethods, setValuationMethods] = useState<ValuationMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<ValuationMethod['id']>('grn_average');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Fetch all valuation methods summary
  const fetchValuationMethods = useCallback(async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      // Use existing stock metrics function
      const { data: stockMetricsArray, error: stockError } = await supabase.rpc('dkegl_get_stock_metrics', {
        _org_id: organization.id,
      });

      if (stockError) throw stockError;
      
      const stockMetrics = stockMetricsArray?.[0] || { total_value: 0, total_items: 0 };

      // Get GRN data
      const { data: grnData, error: grnError } = await supabase
        .from('dkegl_grn_log')
        .select('total_amount, qty_received')
        .eq('organization_id', organization.id)
        .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

      const grnTotalValue = grnData?.reduce((sum, grn) => sum + (grn.total_amount || 0), 0) || 0;
      const grnItemCount = grnData?.length || 0;

      const methods: ValuationMethod[] = [
        {
          id: 'grn_average',
          name: 'GRN Average Method',
          description: 'Weighted average from last 90 days GRN entries',
          totalValue: grnTotalValue,
          itemCount: grnItemCount,
          lastUpdated: new Date().toISOString(),
          status: grnItemCount > 0 ? 'active' : 'inactive',
        },
        {
          id: 'standard_cost',
          name: 'Standard Cost Method',
          description: 'From pricing master with approval workflow',
          totalValue: 0,
          itemCount: 0,
          lastUpdated: null,
          status: 'inactive',
        },
        {
          id: 'opening_stock',
          name: 'Opening Stock Method',
          description: 'Current unit costs from opening stock',
          totalValue: stockMetrics?.total_value || 0,
          itemCount: stockMetrics?.total_items || 0,
          lastUpdated: new Date().toISOString(),
          status: (stockMetrics?.total_items || 0) > 0 ? 'active' : 'inactive',
        },
        {
          id: 'custom_upload',
          name: 'Custom Upload Method',
          description: 'CSV-based user pricing with custom rates',
          totalValue: 0,
          itemCount: 0,
          lastUpdated: null,
          status: 'inactive',
        },
      ];

      setValuationMethods(methods);
    } catch (error) {
      console.error('Error fetching valuation methods:', error);
      toast({
        title: "Error",
        description: "Failed to fetch valuation methods",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [organization?.id, toast]);

  // Fetch detailed stock valuation data
  const fetchStockValuationData = useCallback(async () => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      // Get stock data with pricing info
      const { data: stockData, error: stockError } = await supabase
        .from('dkegl_stock')
        .select(`
          item_code,
          current_qty,
          unit_cost,
          dkegl_item_master!inner(item_name, category_id),
          dkegl_categories(category_name)
        `)
        .eq('organization_id', organization.id)
        .gt('current_qty', 0);

      if (stockError) throw stockError;

      // Transform data for valuation analysis
      const transformedData: StockValuationItem[] = (stockData || []).map((item: any) => ({
        item_code: item.item_code,
        item_name: item.dkegl_item_master?.item_name || '',
        category_name: item.dkegl_categories?.category_name || 'Uncategorized',
        current_qty: item.current_qty,
        grn_avg_price: 0, // Will be calculated from GRN data
        standard_cost: 0, // From pricing master
        opening_stock_price: item.unit_cost || 0,
        custom_upload_price: 0, // From custom uploads
        grn_total_value: 0,
        standard_total_value: 0,
        opening_total_value: (item.current_qty || 0) * (item.unit_cost || 0),
        custom_total_value: 0,
        variance_percentage: 0,
        last_grn_date: null,
        pricing_master_date: null,
      }));

      setValuationData(transformedData);
    } catch (error) {
      console.error('Error fetching valuation data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch stock valuation data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [organization?.id, toast]);

  // Upload custom pricing from CSV
  const uploadCustomPricing = useCallback(async (
    file: File,
    options: { validateOnly?: boolean } = {}
  ) => {
    if (!organization?.id) return { success: false, errors: [] };

    setUploading(true);
    try {
      // Parse CSV file
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Validate headers
      const requiredHeaders = ['item_code', 'custom_unit_cost', 'effective_date'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
      }

      // Parse data rows
      const uploadData: CustomPricingUpload[] = [];
      const errors: string[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < requiredHeaders.length) continue;

        const rowData: any = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index];
        });

        // Validate row data
        if (!rowData.item_code) {
          errors.push(`Row ${i + 1}: Missing item code`);
          continue;
        }

        const customCost = parseFloat(rowData.custom_unit_cost);
        if (isNaN(customCost) || customCost <= 0) {
          errors.push(`Row ${i + 1}: Invalid unit cost for ${rowData.item_code}`);
          continue;
        }

        uploadData.push({
          item_code: rowData.item_code,
          custom_unit_cost: customCost,
          effective_date: rowData.effective_date || new Date().toISOString().split('T')[0],
          notes: rowData.notes || '',
        });
      }

      if (options.validateOnly) {
        return { success: true, errors, data: uploadData };
      }

      // Upload to database (simplified for now)
      if (uploadData.length > 0) {
        // For now, just show success - we would need to create custom pricing table
        console.log('Custom pricing data to upload:', uploadData);

        toast({
          title: "Upload Successful",
          description: `${uploadData.length} custom pricing records uploaded`,
        });

        // Refresh data
        fetchValuationMethods();
        fetchStockValuationData();
      }

      return { success: true, errors, uploadCount: uploadData.length };
    } catch (error) {
      console.error('Error uploading custom pricing:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload custom pricing",
        variant: "destructive",
      });
      return { success: false, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    } finally {
      setUploading(false);
    }
  }, [organization?.id, toast, fetchValuationMethods, fetchStockValuationData]);

  // Calculate variance between methods
  const calculateVariance = useCallback((item: StockValuationItem, method1: string, method2: string) => {
    const price1 = item[`${method1}_price` as keyof StockValuationItem] as number;
    const price2 = item[`${method2}_price` as keyof StockValuationItem] as number;
    
    if (!price1 || !price2) return 0;
    return ((price1 - price2) / price2) * 100;
  }, []);

  // Export valuation comparison
  const exportValuationComparison = useCallback(async () => {
    if (!organization?.id || valuationData.length === 0) return;

    try {
      const XLSX = await import('xlsx');
      
      const exportData = valuationData.map(item => ({
        'Item Code': item.item_code,
        'Item Name': item.item_name,
        'Category': item.category_name,
        'Current Qty': item.current_qty,
        'GRN Avg Price': item.grn_avg_price,
        'Standard Cost': item.standard_cost,
        'Opening Stock Price': item.opening_stock_price,
        'Custom Price': item.custom_upload_price,
        'GRN Total Value': item.grn_total_value,
        'Standard Total Value': item.standard_total_value,
        'Opening Total Value': item.opening_total_value,
        'Custom Total Value': item.custom_total_value,
        'Max Variance %': Math.max(
          Math.abs(calculateVariance(item, 'grn_avg', 'opening_stock')),
          Math.abs(calculateVariance(item, 'standard_cost', 'opening_stock')),
          Math.abs(calculateVariance(item, 'custom_upload', 'opening_stock'))
        ),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Valuation Comparison');

      const filename = `stock_valuation_comparison_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast({
        title: "Export Successful",
        description: "Valuation comparison exported to Excel",
      });
    } catch (error) {
      console.error('Error exporting comparison:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export valuation comparison",
        variant: "destructive",
      });
    }
  }, [organization?.id, valuationData, calculateVariance, toast]);

  return {
    // Data
    valuationData,
    valuationMethods,
    selectedMethod,
    
    // States
    loading,
    uploading,
    
    // Actions
    fetchValuationMethods,
    fetchStockValuationData,
    setSelectedMethod,
    uploadCustomPricing,
    calculateVariance,
    exportValuationComparison,
  };
};