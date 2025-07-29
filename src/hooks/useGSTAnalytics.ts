import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GSTSummary {
  total_gst_liability: number;
  total_input_tax_credit: number;
  net_gst_payable: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_taxable_turnover: number;
  gst_rate_wise_breakdown: any[];
  monthly_gst_trend: any[];
  vendor_wise_gst: any[];
  customer_wise_gst: any[];
}

export interface GSTReturns {
  return_data: any;
  summary: any;
  validation_errors: any[];
}

export interface GSTCompliance {
  compliance_score: number;
  pending_returns: any[];
  upcoming_deadlines: any[];
  penalty_calculations: any[];
  recommendations: any[];
}

export const useGSTAnalytics = () => {
  const [gstSummary, setGSTSummary] = useState<GSTSummary | null>(null);
  const [gstReturns, setGSTReturns] = useState<GSTReturns | null>(null);
  const [compliance, setCompliance] = useState<GSTCompliance | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getCurrentOrgId = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('dkegl_get_current_user_org');
    if (error) throw error;
    return data;
  };

  const fetchGSTSummary = async (startDate?: string, endDate?: string) => {
    setLoading(true);
    try {
      const orgId = await getCurrentOrgId();
      const { data, error } = await supabase.rpc('dkegl_get_gst_summary', {
        _org_id: orgId,
        _start_date: startDate || null,
        _end_date: endDate || null
      });

      if (error) throw error;
      setGSTSummary(data?.[0] as GSTSummary);
    } catch (error: any) {
      toast({
        title: "Error fetching GST summary",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateGSTReturns = async (returnType: 'GSTR1' | 'GSTR3B', month: number, year: number) => {
    setLoading(true);
    try {
      const orgId = await getCurrentOrgId();
      const { data, error } = await supabase.rpc('dkegl_generate_gstr_returns', {
        _org_id: orgId,
        _return_type: returnType,
        _month: month,
        _year: year
      });

      if (error) throw error;
      setGSTReturns(data?.[0] as GSTReturns);
    } catch (error: any) {
      toast({
        title: "Error generating GST returns",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchComplianceStatus = async () => {
    setLoading(true);
    try {
      const orgId = await getCurrentOrgId();
      const { data, error } = await supabase.rpc('dkegl_track_gst_compliance', {
        _org_id: orgId
      });

      if (error) throw error;
      setCompliance(data?.[0] as GSTCompliance);
    } catch (error: any) {
      toast({
        title: "Error fetching compliance status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportGSTData = async (format: 'json' | 'excel', data: any) => {
    try {
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gst-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Excel export would require additional library
        toast({
          title: "Excel export",
          description: "Excel export feature coming soon",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error exporting data",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    gstSummary,
    gstReturns,
    compliance,
    loading,
    fetchGSTSummary,
    generateGSTReturns,
    fetchComplianceStatus,
    exportGSTData,
  };
};