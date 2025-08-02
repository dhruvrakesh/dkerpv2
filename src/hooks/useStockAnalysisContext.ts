import { useState, useCallback } from 'react';
import { useComprehensiveStockAnalytics } from './useComprehensiveStockAnalytics';

interface StockAnalysisContext {
  stockData: any[];
  analyticsData: any;
  refreshData: () => void;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to provide stock data context for AI analysis
 * This bridges the comprehensive stock data with AI chat interface
 */
export function useStockAnalysisContext(): StockAnalysisContext {
  const [error, setError] = useState<string | null>(null);
  
  const {
    stockData,
    analyticsData,
    isLoading,
    refreshData: refreshStockData,
    error: stockError
  } = useComprehensiveStockAnalytics();

  const refreshData = useCallback(() => {
    setError(null);
    try {
      refreshStockData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh stock data');
    }
  }, [refreshStockData]);

  return {
    stockData: stockData || [],
    analyticsData,
    refreshData,
    loading: isLoading,
    error: error || (stockError ? stockError.message : null)
  };
}