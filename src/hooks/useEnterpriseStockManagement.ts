import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';

export interface PaginatedStockItem {
  item_code: string;
  item_name: string;
  category_name: string;
  current_qty: number;
  unit_cost: number;
  total_value: number;
  location: string;
  uom: string;
  reorder_level: number;
  is_low_stock: boolean;
  last_transaction_date: string | null;
  last_updated: string;
  total_count: number;
}

export interface StockSnapshot {
  id: string;
  snapshot_date: string;
  file_name: string;
  record_count: number;
  total_value: number;
  metadata: any;
  snapshot_data?: any[];
  created_at: string;
  updated_at: string;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface FilterState {
  search: string;
  category: string;
  status: string;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
}

export const useEnterpriseStockManagement = () => {
  const { toast } = useToast();
  const { organization } = useDKEGLAuth();
  
  const [stockData, setStockData] = useState<PaginatedStockItem[]>([]);
  const [snapshots, setSnapshots] = useState<StockSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 50,
    totalCount: 0,
    totalPages: 0,
  });
  
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: '',
    status: '',
    sortColumn: 'item_code',
    sortDirection: 'asc',
  });

  // Fetch paginated stock data
  const fetchStockData = useCallback(async (
    page: number = pagination.page,
    pageSize: number = pagination.pageSize,
    searchTerm: string = filters.search,
    categoryFilter: string = filters.category,
    statusFilter: string = filters.status,
    sortColumn: string = filters.sortColumn,
    sortDirection: 'asc' | 'desc' = filters.sortDirection
  ) => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('dkegl_get_paginated_stock', {
        _org_id: organization.id,
        _page: page,
        _page_size: pageSize,
        _search: searchTerm || null,
        _category_filter: categoryFilter || null,
        _status_filter: statusFilter || null,
        _sort_column: sortColumn,
        _sort_direction: sortDirection,
      });

      if (error) throw error;

      setStockData(data || []);
      
      if (data && data.length > 0) {
        const totalCount = data[0].total_count;
        setPagination({
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        });
      } else {
        setPagination(prev => ({ ...prev, totalCount: 0, totalPages: 0 }));
      }
    } catch (error) {
      console.error('Error fetching stock data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch stock data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [organization?.id, pagination.page, pagination.pageSize, filters, toast]);

  // Update filters and refresh data
  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    
    // Reset to page 1 when filters change
    fetchStockData(1, pagination.pageSize, 
      updatedFilters.search, 
      updatedFilters.category, 
      updatedFilters.status,
      updatedFilters.sortColumn,
      updatedFilters.sortDirection
    );
  }, [filters, pagination.pageSize, fetchStockData]);

  // Change page
  const changePage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchStockData(newPage);
    }
  }, [pagination.totalPages, fetchStockData]);

  // Change page size
  const changePageSize = useCallback((newPageSize: number) => {
    fetchStockData(1, newPageSize);
  }, [fetchStockData]);

  // Export stock data
  const exportStockData = useCallback(async (format: 'excel' | 'csv' | 'pdf' = 'excel') => {
    if (!organization?.id) return;
    
    setExporting(true);
    try {
      // Fetch all data for export (no pagination)
      const { data, error } = await supabase.rpc('dkegl_get_paginated_stock', {
        _org_id: organization.id,
        _page: 1,
        _page_size: 999999, // Large number to get all records
        _search: filters.search || null,
        _category_filter: filters.category || null,
        _status_filter: filters.status || null,
        _sort_column: filters.sortColumn,
        _sort_direction: filters.sortDirection,
      });

      if (error) throw error;

      // Dynamic import for export libraries
      const XLSX = await import('xlsx');
      
      if (format === 'excel') {
        const worksheet = XLSX.utils.json_to_sheet(data.map(item => ({
          'Item Code': item.item_code,
          'Item Name': item.item_name,
          'Category': item.category_name,
          'Current Qty': item.current_qty,
          'Unit Cost': item.unit_cost,
          'Total Value': item.total_value,
          'Location': item.location,
          'UOM': item.uom,
          'Reorder Level': item.reorder_level,
          'Stock Status': item.is_low_stock ? 'Low Stock' : 'In Stock',
          'Last Transaction': item.last_transaction_date,
          'Last Updated': item.last_updated,
        })));
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Stock Data');
        
        const filename = `stock_export_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, filename);
      } else if (format === 'csv') {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `stock_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      }

      toast({
        title: "Export Successful",
        description: `Stock data exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export stock data",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }, [organization?.id, filters, toast]);

  // Capture daily stock snapshot
  const captureSnapshot = useCallback(async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('dkegl_capture_daily_stock_snapshot', {
        _org_id: organization.id,
      });

      if (error) throw error;

      toast({
        title: "Snapshot Captured",
        description: `Stock snapshot saved successfully`,
      });
      
      // Refresh snapshots list
      fetchSnapshots();
    } catch (error) {
      console.error('Error capturing snapshot:', error);
      toast({
        title: "Snapshot Failed",
        description: "Failed to capture stock snapshot",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [organization?.id, toast]);

  // Fetch historical snapshots
  const fetchSnapshots = useCallback(async () => {
    if (!organization?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('dkegl_stock_snapshots')
        .select('*')
        .eq('organization_id', organization.id)
        .order('snapshot_date', { ascending: false })
        .limit(30);

      if (error) throw error;
      setSnapshots((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching snapshots:', error);
      toast({
        title: "Error",
        description: "Failed to fetch historical snapshots",
        variant: "destructive",
      });
    }
  }, [organization?.id, toast]);

  return {
    // Data
    stockData,
    snapshots,
    pagination,
    filters,
    
    // States
    loading,
    exporting,
    
    // Actions
    fetchStockData,
    updateFilters,
    changePage,
    changePageSize,
    exportStockData,
    captureSnapshot,
    fetchSnapshots,
  };
};