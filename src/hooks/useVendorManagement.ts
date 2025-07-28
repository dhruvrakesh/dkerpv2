import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Vendor {
  id: string;
  organization_id: string;
  vendor_code?: string;
  vendor_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  supplier_type?: string;
  category_id?: string;
  performance_rating?: number;
  quality_rating?: number;
  delivery_rating?: number;
  pricing_rating?: number;
  approval_status?: string;
  is_active?: boolean;
  tax_details?: any;
  bank_details?: any;
  address_details?: any;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface VendorCategory {
  id: string;
  category_name: string;
  category_code: string;
  description?: string;
}

export const useVendorManagement = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchVendors = async (filters?: { 
    category?: string; 
    status?: string; 
    supplier_type?: string;
    search?: string;
  }) => {
    setLoading(true);
    try {
      let query = supabase
        .from('dkegl_vendors')
        .select(`
          *,
          dkegl_vendor_categories (
            category_name,
            category_code
          )
        `)
        .order('vendor_name');

      if (filters?.category) {
        query = query.eq('category_id', filters.category);
      }
      if (filters?.status) {
        query = query.eq('is_active', filters.status === 'active');
      }
      if (filters?.supplier_type) {
        query = query.eq('supplier_type', filters.supplier_type);
      }
      if (filters?.search) {
        query = query.or(`vendor_name.ilike.%${filters.search}%,vendor_code.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setVendors((data || []) as Vendor[]);
    } catch (error: any) {
      toast({
        title: "Error fetching vendors",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('dkegl_vendor_categories')
        .select('*')
        .eq('is_active', true)
        .order('category_name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching categories",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const generateVendorCode = async (): Promise<string> => {
    try {
      const { data, error } = await supabase.rpc('dkegl_generate_vendor_code', {
        _org_id: await getCurrentOrgId()
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      toast({
        title: "Error generating vendor code",
        description: error.message,
        variant: "destructive",
      });
      return '';
    }
  };

  const getCurrentOrgId = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('dkegl_get_current_user_org');
    if (error) throw error;
    return data;
  };

  const createVendor = async (vendorData: Partial<Vendor>) => {
    setLoading(true);
    try {
      const vendor_code = await generateVendorCode();
      
      const { data, error } = await supabase
        .from('dkegl_vendors')
        .insert({
          ...vendorData,
          vendor_code,
          organization_id: await getCurrentOrgId(),
          vendor_name: vendorData.vendor_name || '',
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Vendor created successfully",
        description: `Vendor ${data.vendor_name} (${data.vendor_code}) has been created.`,
      });

      await fetchVendors();
      return data;
    } catch (error: any) {
      toast({
        title: "Error creating vendor",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateVendor = async (id: string, vendorData: Partial<Vendor>) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dkegl_vendors')
        .update(vendorData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Vendor updated successfully",
        description: `Vendor ${data.vendor_name} has been updated.`,
      });

      await fetchVendors();
      return data;
    } catch (error: any) {
      toast({
        title: "Error updating vendor",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteVendor = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('dkegl_vendors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Vendor deleted successfully",
        description: "The vendor has been removed from the system.",
      });

      await fetchVendors();
    } catch (error: any) {
      toast({
        title: "Error deleting vendor",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const approveVendor = async (id: string) => {
    await updateVendor(id, { 
      approval_status: 'approved',
      is_active: true
    });
  };

  const rejectVendor = async (id: string) => {
    await updateVendor(id, { 
      approval_status: 'rejected',
      is_active: false
    });
  };

  useEffect(() => {
    fetchVendors();
    fetchCategories();
  }, []);

  return {
    vendors,
    categories,
    loading,
    fetchVendors,
    fetchCategories,
    createVendor,
    updateVendor,
    deleteVendor,
    approveVendor,
    rejectVendor,
    generateVendorCode,
  };
};