import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';
import { useToast } from '@/hooks/use-toast';

interface StockReconciliationResult {
  success: boolean;
  reconciled_items: number;
  total_items: number;
  consolidated_location: string;
  calculation_formula: string;
  reconciliation_timestamp: string;
}

interface StockDataService {
  // Centralized stock data fetching
  fetchComprehensiveStockData: () => Promise<any[]>;
  fetchStockAnalytics: () => Promise<any>;
  runStockReconciliation: () => Promise<StockReconciliationResult>;
  validateStockData: (data: any[]) => { isValid: boolean; errors: string[] };
  
  // Loading states
  loading: boolean;
  error: Error | null;
}

export const useStockDataService = (): StockDataService => {
  const { organization } = useDKEGLAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchComprehensiveStockData = useCallback(async () => {
    if (!organization?.id) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc(
        'dkegl_get_comprehensive_stock_summary',
        { p_org_id: organization.id }
      );
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      const errorMsg = err instanceof Error ? err : new Error('Failed to fetch stock data');
      setError(errorMsg);
      throw errorMsg;
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  const fetchStockAnalytics = useCallback(async () => {
    if (!organization?.id) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc(
        'dkegl_get_stock_analytics_totals',
        { _org_id: organization.id }
      );
      
      if (error) throw error;
      return data?.[0] || null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err : new Error('Failed to fetch analytics');
      setError(errorMsg);
      throw errorMsg;
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  const runStockReconciliation = useCallback(async (): Promise<StockReconciliationResult> => {
    if (!organization?.id) {
      throw new Error('Organization ID is required');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Use the new stock reconciliation function
      const { data, error } = await supabase.rpc('dkegl_reconcile_stock_data', {
        p_org_id: organization.id
      });

      if (error) throw error;
      
      const result = data as unknown as StockReconciliationResult;
      
      toast({
        title: "Stock Consolidation Complete",
        description: `Reconciled ${result?.reconciled_items || 0} items. All stock consolidated under main_warehouse.`,
      });
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err : new Error('Failed to run stock consolidation');
      setError(errorMsg);
      toast({
        title: "Consolidation Failed",
        description: errorMsg.message,
        variant: "destructive",
      });
      throw errorMsg;
    } finally {
      setLoading(false);
    }
  }, [organization?.id, toast]);

  const validateStockData = useCallback((data: any[]) => {
    const errors: string[] = [];
    
    if (!Array.isArray(data)) {
      errors.push('Stock data must be an array');
      return { isValid: false, errors };
    }
    
    // Check for required fields
    const requiredFields = ['item_code', 'current_qty', 'opening_qty'];
    data.forEach((item, index) => {
      requiredFields.forEach(field => {
        if (item[field] === undefined || item[field] === null) {
          errors.push(`Item ${index + 1}: Missing required field '${field}'`);
        }
      });
      
      // Check for negative quantities
      if (item.current_qty < 0) {
        errors.push(`Item ${item.item_code}: Negative current quantity`);
      }
    });
    
    // Check for duplicates
    const itemCodes = data.map(item => item.item_code);
    const duplicates = itemCodes.filter((code, index) => itemCodes.indexOf(code) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate item codes found: ${[...new Set(duplicates)].join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  return {
    fetchComprehensiveStockData,
    fetchStockAnalytics,
    runStockReconciliation,
    validateStockData,
    loading,
    error,
  };
};