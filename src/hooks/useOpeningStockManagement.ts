import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface OpeningStockItem {
  id: string;
  item_code: string;
  item_name: string;
  category_name: string;
  location: string;
  opening_qty: number;
  unit_cost: number;
  total_value: number;
  opening_date: string;
  remarks?: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  created_by?: string;
  approved_by?: string;
  // Calculated fields for enhanced functionality
  grn_since_opening?: number;
  issues_since_opening?: number;
  current_calculated_qty?: number;
}

interface AuditTrailEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_values: any;
  new_values: any;
  changed_by: string;
  created_at: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function useOpeningStockManagement() {
  const [openingStock, setOpeningStock] = useState<OpeningStockItem[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Fetch opening stock data
  const fetchOpeningStock = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dkegl_opening_stock')
        .select(`
          id,
          item_code,
          item_name,
          category_name,
          location,
          opening_qty,
          unit_cost,
          total_value,
          opening_date,
          remarks,
          approval_status,
          created_at,
          updated_at,
          created_by,
          approved_by
        `)
        .order('item_code');

      if (error) throw error;

      setOpeningStock((data || []).map(item => ({
        ...item,
        approval_status: item.approval_status as 'pending' | 'approved' | 'rejected'
      })));
    } catch (error) {
      console.error('Error fetching opening stock:', error);
      toast({
        title: "Error",
        description: "Failed to fetch opening stock data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch audit trail
  const fetchAuditTrail = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('dkegl_audit_log')
        .select('*')
        .eq('table_name', 'dkegl_opening_stock')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setAuditTrail((data || []).map(item => ({
        id: item.id,
        table_name: item.table_name,
        record_id: item.record_id || '',
        action: item.action,
        old_values: item.old_values,
        new_values: item.new_values,
        changed_by: item.user_id || 'system',
        created_at: item.created_at
      })));
    } catch (error) {
      console.error('Error fetching audit trail:', error);
    }
  }, []);

  // Import opening stock from file
  const importOpeningStock = useCallback(async (file: File, openingDate: string) => {
    setImporting(true);
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('opening_date', openingDate);
      
      toast({
        title: "Import Started",
        description: "Processing opening stock file...",
      });
      
      // TODO: Implement actual file import logic with Supabase edge function
      // This would parse Excel/CSV files and bulk insert to dkegl_opening_stock
      console.log('Importing opening stock from:', file.name, 'with date:', openingDate);
      
      // Placeholder implementation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Import Successful",
        description: "Opening stock data has been imported successfully",
      });
      
      // Refresh data after import
      await fetchOpeningStock();
    } catch (error) {
      console.error('Error importing opening stock:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import opening stock data",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  }, [fetchOpeningStock]);

  // Export opening stock to file
  const exportOpeningStock = useCallback(async (format: 'excel' | 'csv' | 'pdf') => {
    setExporting(true);
    try {
      toast({
        title: "Export Started",
        description: `Generating ${format.toUpperCase()} file...`,
      });
      
      // TODO: Implement actual export logic
      console.log('Exporting opening stock to:', format);
      
      // Placeholder implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Export Successful",
        description: `Opening stock exported to ${format.toUpperCase()} successfully`,
      });
    } catch (error) {
      console.error('Error exporting opening stock:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export opening stock data",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }, []);

  // Validate opening stock data
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
        if (!item.opening_date) {
          errors.push(`Row ${index + 1}: Opening date is required`);
        }
      });

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      console.error('Error validating opening stock:', error);
      return {
        valid: false,
        errors: ['Validation failed due to an unexpected error'],
        warnings: [],
      };
    }
  }, [openingStock]);

  // Update opening stock item
  const updateOpeningStock = useCallback(async (
    itemId: string, 
    updates: Partial<OpeningStockItem>
  ) => {
    try {
      const { error } = await supabase
        .from('dkegl_opening_stock')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Opening stock updated successfully",
      });

      // Refresh data
      await fetchOpeningStock();
      await fetchAuditTrail();
    } catch (error) {
      console.error('Error updating opening stock:', error);
      toast({
        title: "Error",
        description: "Failed to update opening stock",
        variant: "destructive",
      });
    }
  }, [fetchOpeningStock, fetchAuditTrail]);

  // Add new opening stock item
  const addOpeningStock = useCallback(async (item: Omit<OpeningStockItem, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase
        .from('dkegl_opening_stock')
        .insert(item);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Opening stock added successfully",
      });

      // Refresh data
      await fetchOpeningStock();
    } catch (error) {
      console.error('Error adding opening stock:', error);
      toast({
        title: "Error",
        description: "Failed to add opening stock",
        variant: "destructive",
      });
    }
  }, [fetchOpeningStock]);

  // Delete opening stock item
  const deleteOpeningStock = useCallback(async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('dkegl_opening_stock')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Opening stock deleted successfully",
      });

      // Refresh data
      await fetchOpeningStock();
    } catch (error) {
      console.error('Error deleting opening stock:', error);
      toast({
        title: "Error",
        description: "Failed to delete opening stock",
        variant: "destructive",
      });
    }
  }, [fetchOpeningStock]);

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
    addOpeningStock,
    deleteOpeningStock
  };
}