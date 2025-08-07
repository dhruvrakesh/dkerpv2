import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ExportFilters {
  startDate?: string;
  endDate?: string;
  department?: string;
  itemCode?: string;
  supplier?: string;
  status?: string;
}

export const useEnterpriseExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportData = async (
    type: 'grn' | 'issue' | 'stock',
    format: 'excel' | 'csv' = 'excel',
    filters: ExportFilters = {},
    organizationId: string
  ) => {
    try {
      setIsExporting(true);
      
      toast({
        title: "Export started",
        description: "Preparing your data for export...",
      });

      const { data, error } = await supabase.functions.invoke('enterprise-export', {
        body: {
          type,
          format,
          filters,
          organizationId
        }
      });

      if (error) throw error;

      // Get the response as blob for file download
      const response = await fetch(`https://rtggqfnzjeqhopqouthv.supabase.co/functions/v1/enterprise-export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0Z2dxZm56amVxaG9wcW91dGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwMTc3NDUsImV4cCI6MjA1ODU5Mzc0NX0._ulZsOJcKucn2X0Xi4c0JJfMGCB48fKFTdvfQiU3cko`,
        },
        body: JSON.stringify({
          type,
          format,
          filters,
          organizationId
        })
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const recordCount = response.headers.get('X-Record-Count');
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const fileName = `${type}_export_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      link.download = fileName;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export completed",
        description: `Successfully exported ${recordCount || 'all'} records to ${fileName}`,
      });

    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: error.message || "Failed to export data",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportData,
    isExporting
  };
};