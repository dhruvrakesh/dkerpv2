import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

export interface VendorUploadData {
  vendor_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  supplier_type: 'MANUFACTURER' | 'DISTRIBUTOR' | 'VENDOR' | 'AGENT';
  category_code?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  tax_number?: string;
  bank_name?: string;
  account_number?: string;
  row_number?: number;
  errors?: string[];
}

export interface UploadResult {
  total_rows: number;
  success_count: number;
  error_count: number;
  errors: Array<{ row: number; errors: string[] }>;
  successful_vendors: string[];
}

export const useBulkVendorUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const { toast } = useToast();

  const validateVendorData = (vendor: VendorUploadData, rowNumber: number): string[] => {
    const errors: string[] = [];

    if (!vendor.vendor_name?.trim()) {
      errors.push('Vendor name is required');
    }

    if (vendor.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendor.email)) {
      errors.push('Invalid email format');
    }

    if (vendor.phone && !/^[\+]?[1-9][\d]{9,14}$/.test(vendor.phone.replace(/\s/g, ''))) {
      errors.push('Invalid phone number format');
    }

    if (!['MANUFACTURER', 'DISTRIBUTOR', 'VENDOR', 'AGENT'].includes(vendor.supplier_type)) {
      errors.push('Invalid supplier type. Must be: MANUFACTURER, DISTRIBUTOR, VENDOR, or AGENT');
    }

    return errors;
  };

  const parseExcelFile = (file: File): Promise<VendorUploadData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

          // Skip header row
          const rows = jsonData.slice(1) as any[][];
          
          const vendors: VendorUploadData[] = rows.map((row, index) => ({
            vendor_name: row[0]?.toString()?.trim() || '',
            contact_person: row[1]?.toString()?.trim() || '',
            email: row[2]?.toString()?.trim() || '',
            phone: row[3]?.toString()?.trim() || '',
            supplier_type: (row[4]?.toString()?.toUpperCase()?.trim() || 'VENDOR') as any,
            category_code: row[5]?.toString()?.trim() || '',
            address_line1: row[6]?.toString()?.trim() || '',
            address_line2: row[7]?.toString()?.trim() || '',
            city: row[8]?.toString()?.trim() || '',
            state: row[9]?.toString()?.trim() || '',
            country: row[10]?.toString()?.trim() || '',
            postal_code: row[11]?.toString()?.trim() || '',
            tax_number: row[12]?.toString()?.trim() || '',
            bank_name: row[13]?.toString()?.trim() || '',
            account_number: row[14]?.toString()?.trim() || '',
            row_number: index + 2, // +2 because we skipped header and arrays are 0-indexed
          }));

          resolve(vendors.filter(v => v.vendor_name)); // Filter out empty rows
        } catch (error) {
          reject(new Error('Failed to parse Excel file'));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const getCurrentOrgId = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('dkegl_get_current_user_org');
    if (error) throw error;
    return data;
  };

  const getCategoryId = async (categoryCode: string): Promise<string | null> => {
    if (!categoryCode) return null;
    
    const { data, error } = await supabase
      .from('dkegl_vendor_categories')
      .select('id')
      .eq('category_code', categoryCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error) return null;
    return data?.id || null;
  };

  const generateVendorCode = async (): Promise<string> => {
    try {
      const { data, error } = await supabase.rpc('dkegl_generate_vendor_code', {
        _org_id: await getCurrentOrgId()
      });

      if (error) throw error;
      return data;
    } catch (error) {
      // Fallback to timestamp-based code if function fails
      return `VENDOR-${Date.now()}`;
    }
  };

  const uploadVendors = async (file: File): Promise<UploadResult> => {
    setUploading(true);
    setUploadResult(null);

    try {
      const vendors = await parseExcelFile(file);
      const orgId = await getCurrentOrgId();
      
      const result: UploadResult = {
        total_rows: vendors.length,
        success_count: 0,
        error_count: 0,
        errors: [],
        successful_vendors: []
      };

      for (const vendor of vendors) {
        const errors = validateVendorData(vendor, vendor.row_number!);
        
        if (errors.length > 0) {
          result.error_count++;
          result.errors.push({
            row: vendor.row_number!,
            errors
          });
          continue;
        }

        try {
          const categoryId = await getCategoryId(vendor.category_code || '');
          const vendorCode = await generateVendorCode();

          const { data, error } = await supabase
            .from('dkegl_vendors')
            .insert([{
              organization_id: orgId,
              vendor_code: vendorCode,
              vendor_name: vendor.vendor_name,
              contact_person: vendor.contact_person,
              email: vendor.email,
              phone: vendor.phone,
              supplier_type: vendor.supplier_type,
              category_id: categoryId,
              address_details: {
                line1: vendor.address_line1,
                line2: vendor.address_line2,
                city: vendor.city,
                state: vendor.state,
                country: vendor.country,
                postal_code: vendor.postal_code
              },
              tax_details: {
                tax_number: vendor.tax_number
              },
              bank_details: {
                bank_name: vendor.bank_name,
                account_number: vendor.account_number
              },
              status: 'active',
              approval_status: 'pending'
            }])
            .select('vendor_name')
            .single();

          if (error) throw error;

          result.success_count++;
          result.successful_vendors.push(data.vendor_name);
        } catch (insertError: any) {
          result.error_count++;
          result.errors.push({
            row: vendor.row_number!,
            errors: [insertError.message || 'Failed to create vendor']
          });
        }
      }

      setUploadResult(result);

      toast({
        title: "Upload completed",
        description: `${result.success_count} vendors created successfully, ${result.error_count} errors encountered.`,
        variant: result.error_count > 0 ? "destructive" : "default",
      });

      return result;
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      [
        'Vendor Name*',
        'Contact Person',
        'Email',
        'Phone',
        'Supplier Type*',
        'Category Code',
        'Address Line 1',
        'Address Line 2',
        'City',
        'State',
        'Country',
        'Postal Code',
        'Tax Number',
        'Bank Name',
        'Account Number'
      ],
      [
        'ABC Manufacturing Ltd',
        'John Smith',
        'john@abc.com',
        '+1234567890',
        'MANUFACTURER',
        'RAW_MAT',
        '123 Industrial St',
        'Suite 100',
        'Mumbai',
        'Maharashtra',
        'India',
        '400001',
        'GSTIN123456789',
        'HDFC Bank',
        '123456789012'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vendor Upload Template');
    XLSX.writeFile(wb, 'vendor_upload_template.xlsx');
  };

  return {
    uploading,
    uploadResult,
    uploadVendors,
    downloadTemplate,
  };
};