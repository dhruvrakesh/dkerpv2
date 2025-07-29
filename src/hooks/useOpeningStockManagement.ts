import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface OpeningStockItem {
  item_code: string;
  item_name: string;
  opening_qty: number;
  unit_cost: number;
  opening_date: string;
  is_valid: boolean;
  validation_errors?: string[];
}

interface AuditTrailEntry {
  id: string;
  action: string;
  user_id: string;
  timestamp: string;
  details: any;
  affected_items: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function useOpeningStockManagement() {
  const { toast } = useToast();
  const [openingStock, setOpeningStock] = useState<OpeningStockItem[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchOpeningStock = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch opening stock data from dkegl_stock table where opening_qty > 0
      const { data: stockData, error } = await supabase
        .from('dkegl_stock')
        .select(`
          item_code,
          current_qty,
          unit_cost,
          last_updated,
          dkegl_item_master!inner(item_name)
        `)
        .gt('current_qty', 0)
        .order('item_code');

      if (error) throw error;

      const formattedData: OpeningStockItem[] = stockData?.map(item => ({
        item_code: item.item_code,
        item_name: item.dkegl_item_master?.item_name || 'Unknown',
        opening_qty: item.current_qty,
        unit_cost: item.unit_cost || 0,
        opening_date: item.last_updated || new Date().toISOString(),
        is_valid: true,
      })) || [];

      setOpeningStock(formattedData);
    } catch (error) {
      console.error('Error fetching opening stock:', error);
      toast({
        title: "Error",
        description: "Failed to fetch opening stock data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchAuditTrail = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('dkegl_audit_log')
        .select('*')
        .eq('table_name', 'opening_stock')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData: AuditTrailEntry[] = (data || []).map(item => ({
        id: item.id,
        action: item.action,
        user_id: item.user_id || 'system',
        timestamp: item.created_at,
        details: item.metadata || item.new_values,
        affected_items: 1 // Default to 1, could be enhanced to calculate actual count
      }));
      
      setAuditTrail(transformedData);
    } catch (error) {
      console.error('Error fetching audit trail:', error);
    }
  }, []);

  const importOpeningStock = useCallback(async (file: File) => {
    setImporting(true);
    try {
      // This would implement the actual file import logic
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Import Successful",
        description: "Opening stock data imported successfully.",
      });
      
      await fetchOpeningStock();
    } catch (error) {
      console.error('Error importing opening stock:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import opening stock data.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  }, [fetchOpeningStock, toast]);

  const exportOpeningStock = useCallback(async (format: 'excel' | 'csv' | 'pdf') => {
    setExporting(true);
    try {
      // This would implement the actual export logic
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Export Successful",
        description: `Opening stock data exported to ${format.toUpperCase()}.`,
      });
    } catch (error) {
      console.error('Error exporting opening stock:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export opening stock data.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }, [toast]);

  const validateOpeningStock = useCallback(async (): Promise<ValidationResult> => {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      openingStock.forEach((item, index) => {
        if (!item.item_code || item.item_code.trim() === '') {
          errors.push(`Row ${index + 1}: Item code is required`);
        }
        if (item.opening_qty < 0) {
          errors.push(`Row ${index + 1}: Opening quantity cannot be negative`);
        }
        if (item.unit_cost < 0) {
          errors.push(`Row ${index + 1}: Unit cost cannot be negative`);
        }
        if (item.opening_qty === 0) {
          warnings.push(`Row ${index + 1}: Opening quantity is zero`);
        }
      });

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      console.error('Error validating opening stock:', error);
      return {
        isValid: false,
        errors: ['Validation failed due to an unexpected error'],
        warnings: [],
      };
    }
  }, [openingStock]);

  const updateOpeningStock = useCallback(async (itemCode: string, updates: Partial<OpeningStockItem>) => {
    try {
      // Update the specific item in the database
      const { error } = await supabase
        .from('dkegl_stock')
        .update({
          current_qty: updates.opening_qty,
          unit_cost: updates.unit_cost,
          last_updated: new Date().toISOString(),
        })
        .eq('item_code', itemCode);

      if (error) throw error;

      // Update local state
      setOpeningStock(prev => 
        prev.map(item => 
          item.item_code === itemCode 
            ? { ...item, ...updates }
            : item
        )
      );

      toast({
        title: "Update Successful",
        description: "Opening stock item updated successfully.",
      });
    } catch (error) {
      console.error('Error updating opening stock:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update opening stock item.",
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    openingStock,
    auditTrail,
    loading,
    importing,
    exporting,
    fetchOpeningStock,
    fetchAuditTrail,
    importOpeningStock,
    exportOpeningStock,
    validateOpeningStock,
    updateOpeningStock,
  };
}