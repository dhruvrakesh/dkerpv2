import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { ExcelDateConverter, ExcelDataProcessor } from '@/utils/excelDateUtils';

export interface UploadSession {
  id: string;
  file_name: string;
  file_size: number;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  status: string;
  validation_summary: any;
  error_summary: any;
  created_at: string;
  requires_approval: boolean;
}

export interface StagingRecord {
  id: string;
  grn_number: string;
  item_code: string;
  supplier_name: string;
  date: string;
  qty_received: number;
  unit_rate: number;
  total_amount: number;
  invoice_number: string;
  invoice_date: string;
  quality_status: string;
  remarks: string;
  uom: string;
  validation_status: string;
  validation_errors: any;
  validation_warnings: any;
  is_duplicate: boolean;
  duplicate_reason: string;
  processing_status: string;
  source_row_number: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  is_duplicate: boolean;
  item_exists: boolean;
}

export interface DataQualityMetrics {
  overall_quality_score: number;
  completeness_score: number;
  accuracy_score: number;
  consistency_score: number;
  validity_score: number;
  total_fields: number;
  empty_fields: number;
  invalid_formats: number;
  outliers_detected: number;
  duplicate_values: number;
  recommendations: string[];
  quality_issues: string[];
}

export const useEnterpriseBulkUpload = () => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentSession, setCurrentSession] = useState<UploadSession | null>(null);
  const [stagingRecords, setStagingRecords] = useState<StagingRecord[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<DataQualityMetrics | null>(null);
  const [availableItems, setAvailableItems] = useState<any[]>([]);

  const loadAvailableItems = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('dkegl_item_master')
        .select('id, item_code, item_name, uom')
        .eq('status', 'active')
        .order('item_name');

      if (error) throw error;
      setAvailableItems(data || []);
    } catch (error: any) {
      console.error('Error loading items:', error);
    }
  }, []);

  const calculateFileHash = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const validateExcelStructure = (worksheet: XLSX.WorkSheet): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const requiredColumns = ['GRN Number', 'Item Code', 'Quantity Received'];
    const optionalColumns = ['Date', 'Supplier Name', 'Unit Rate', 'Invoice Number', 'Invoice Date', 'Quality Status', 'Remarks'];
    
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    const headers: string[] = [];
    
    // Extract headers from first row
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
      const cell = worksheet[cellAddress];
      if (cell?.v) {
        headers.push(cell.v.toString());
      }
    }
    
    // Check required columns
    for (const required of requiredColumns) {
      if (!headers.includes(required)) {
        errors.push(`Missing required column: ${required}`);
      }
    }
    
    // Check for unknown columns
    const allValidColumns = [...requiredColumns, ...optionalColumns];
    for (const header of headers) {
      if (!allValidColumns.includes(header)) {
        errors.push(`Unknown column: ${header}`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  };

  const createUploadSession = async (file: File): Promise<string> => {
    const { data: userProfile } = await supabase
      .from('dkegl_user_profiles')
      .select('organization_id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!userProfile?.organization_id) {
      throw new Error('Organization not found');
    }

    const fileHash = await calculateFileHash(file);
    
    const { data, error } = await supabase
      .from('dkegl_upload_sessions')
      .insert([{
        organization_id: userProfile.organization_id,
        file_name: file.name,
        file_size: file.size,
        file_hash: fileHash,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id,
        status: 'uploading'
      }])
      .select()
      .single();

    if (error) throw error;
    return data.id;
  };

  const processExcelFile = async (file: File, sessionId: string): Promise<any[]> => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Validate structure
    const structureValidation = validateExcelStructure(worksheet);
    if (!structureValidation.valid) {
      throw new Error(`File structure invalid: ${structureValidation.errors.join(', ')}`);
    }
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    return jsonData;
  };

  const validateAndStageRecords = async (records: any[], sessionId: string): Promise<void> => {
    const { data: userProfile } = await supabase
      .from('dkegl_user_profiles')
      .select('organization_id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();

    if (!userProfile?.organization_id) {
      throw new Error('Organization not found');
    }

    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const stagingData = records.map((row: any, index: number) => {
      // Enhanced date conversion for GRN date
      const grnDateResult = ExcelDateConverter.convertAndValidateGRNDate(row['Date']);
      const invoiceDateResult = ExcelDateConverter.convertAndValidateGRNDate(row['Invoice Date']);
      
      return {
        organization_id: userProfile.organization_id,
        upload_session_id: sessionId,
        grn_number: ExcelDataProcessor.normalizeGRNNumber(row['GRN Number']),
        item_code: ExcelDataProcessor.validateItemCode(row['Item Code']).code,
        supplier_name: ExcelDataProcessor.cleanTextValue(row['Supplier Name']),
        date: grnDateResult.date || new Date().toISOString().split('T')[0],
        qty_received: ExcelDataProcessor.toNumber(row['Quantity Received']),
        unit_rate: ExcelDataProcessor.toNumber(row['Unit Rate']),
        total_amount: ExcelDataProcessor.toNumber(row['Quantity Received']) * ExcelDataProcessor.toNumber(row['Unit Rate']),
        invoice_number: ExcelDataProcessor.cleanTextValue(row['Invoice Number']),
        invoice_date: invoiceDateResult.date,
        quality_status: ExcelDataProcessor.cleanTextValue(row['Quality Status']) || 'pending',
        remarks: ExcelDataProcessor.cleanTextValue(row['Remarks']),
        uom: 'PCS', // Will be updated during validation
        created_by: currentUser.id,
        source_row_number: index + 2, // Excel row number (1-based + header)
        source_file_name: sessionId // Reference to the upload session
      };
    });

    // Insert staging records
    const { data: insertedRecords, error: insertError } = await supabase
      .from('dkegl_grn_staging')
      .insert(stagingData)
      .select();

    if (insertError) throw insertError;

    // Use enhanced validation with better error handling
    const validationPromises = insertedRecords.map(async (record) => {
      try {
        return await supabase.rpc('dkegl_validate_grn_staging_record_enhanced', { 
          _staging_id: record.id 
        });
      } catch (error) {
        console.error(`Validation failed for record ${record.id}:`, error);
        // Continue with other validations even if one fails
        return null;
      }
    });

    await Promise.allSettled(validationPromises);
  };

  const updateUploadSessionStatus = async (sessionId: string, status: string, summary?: any) => {
    const updateData: any = { status };
    if (summary) {
      updateData.validation_summary = summary;
    }

    const { error } = await supabase
      .from('dkegl_upload_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) throw error;
  };

  const calculateDataQuality = async (sessionId: string): Promise<DataQualityMetrics> => {
    const { data: stagingData, error } = await supabase
      .from('dkegl_grn_staging')
      .select('*')
      .eq('upload_session_id', sessionId);

    if (error) throw error;

    const totalRecords = stagingData.length;
    const validRecords = stagingData.filter(r => r.validation_status === 'valid').length;
    const invalidRecords = stagingData.filter(r => r.validation_status === 'invalid').length;
    const duplicateRecords = stagingData.filter(r => r.is_duplicate).length;
    const recordsWithWarnings = stagingData.filter(r => 
      Array.isArray(r.validation_warnings) && r.validation_warnings.length > 0
    ).length;

    const completenessScore = (validRecords / totalRecords) * 100;
    const accuracyScore = ((totalRecords - invalidRecords) / totalRecords) * 100;
    const consistencyScore = ((totalRecords - duplicateRecords) / totalRecords) * 100;
    const validityScore = ((totalRecords - invalidRecords - recordsWithWarnings) / totalRecords) * 100;
    const overallScore = (completenessScore + accuracyScore + consistencyScore + validityScore) / 4;

    const recommendations: string[] = [];
    if (duplicateRecords > 0) {
      recommendations.push(`Remove ${duplicateRecords} duplicate records`);
    }
    if (invalidRecords > 0) {
      recommendations.push(`Fix ${invalidRecords} records with validation errors`);
    }
    if (recordsWithWarnings > 0) {
      recommendations.push(`Review ${recordsWithWarnings} records with warnings`);
    }

    const qualityMetrics: DataQualityMetrics = {
      overall_quality_score: Math.round(overallScore),
      completeness_score: Math.round(completenessScore),
      accuracy_score: Math.round(accuracyScore),
      consistency_score: Math.round(consistencyScore),
      validity_score: Math.round(validityScore),
      total_fields: totalRecords * 13, // 13 fields per record
      empty_fields: 0, // Calculate based on actual data
      invalid_formats: invalidRecords,
      outliers_detected: recordsWithWarnings,
      duplicate_values: duplicateRecords,
      recommendations,
      quality_issues: []
    };

    return qualityMetrics;
  };

  const uploadFile = async (file: File): Promise<void> => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      await loadAvailableItems();
      
      // Step 1: Create upload session
      setUploadProgress(10);
      const sessionId = await createUploadSession(file);
      
      // Step 2: Process Excel file
      setUploadProgress(30);
      const records = await processExcelFile(file, sessionId);
      
      // Step 3: Validate and stage records
      setUploadProgress(50);
      await validateAndStageRecords(records, sessionId);
      
      // Step 4: Update session status
      setUploadProgress(70);
      await updateUploadSessionStatus(sessionId, 'staged');
      
      // Step 5: Calculate quality metrics
      setUploadProgress(90);
      const quality = await calculateDataQuality(sessionId);
      setQualityMetrics(quality);
      
      // Step 6: Load session data
      await loadUploadSession(sessionId);
      
      setUploadProgress(100);
      
      toast({
        title: "File uploaded successfully",
        description: `${records.length} records staged for validation and approval`
      });
      
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const loadUploadSession = async (sessionId: string) => {
    try {
      // Load session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('dkegl_upload_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setCurrentSession(sessionData);

      // Load staging records
      const { data: stagingData, error: stagingError } = await supabase
        .from('dkegl_grn_staging')
        .select('*')
        .eq('upload_session_id', sessionId)
        .order('source_row_number');

      if (stagingError) throw stagingError;
      setStagingRecords(stagingData || []);

    } catch (error: any) {
      console.error('Error loading session:', error);
      toast({
        title: "Error loading session",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const approveUploadSession = async (sessionId: string, approvalNotes?: string) => {
    try {
      const { error } = await supabase
        .from('dkegl_upload_sessions')
        .update({
          status: 'approved',
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
          approval_notes: approvalNotes
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Update staging records to approved
      const { error: stagingError } = await supabase
        .from('dkegl_grn_staging')
        .update({
          processing_status: 'approved',
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('upload_session_id', sessionId)
        .eq('validation_status', 'valid');

      if (stagingError) throw stagingError;

      toast({
        title: "Upload session approved",
        description: "Records are now ready for processing"
      });

      await loadUploadSession(sessionId);
    } catch (error: any) {
      console.error('Error approving session:', error);
      toast({
        title: "Error approving session",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const processApprovedRecords = async (sessionId: string) => {
    try {
      const { data: userProfile } = await supabase
        .from('dkegl_user_profiles')
        .select('organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!userProfile?.organization_id) {
        throw new Error('Organization not found');
      }

      // Get approved staging records
      const { data: approvedRecords, error } = await supabase
        .from('dkegl_grn_staging')
        .select('*')
        .eq('upload_session_id', sessionId)
        .eq('processing_status', 'approved');

      if (error) throw error;

      // Transform to GRN log format
      const grnRecords = approvedRecords.map(record => ({
        organization_id: userProfile.organization_id,
        grn_number: record.grn_number,
        item_code: record.item_code,
        supplier_name: record.supplier_name,
        date: record.date,
        qty_received: record.qty_received,
        unit_rate: record.unit_rate,
        total_amount: record.total_amount,
        invoice_number: record.invoice_number,
        invoice_date: record.invoice_date,
        quality_status: record.quality_status as 'pending' | 'approved' | 'in_review' | 'passed' | 'failed' | 'rework_required',
        remarks: record.remarks,
        uom: record.uom,
        created_by: record.created_by
      }));

      // Insert into GRN log
      const { error: insertError } = await supabase
        .from('dkegl_grn_log')
        .insert(grnRecords as any);

      if (insertError) throw insertError;

      // Update session status
      await updateUploadSessionStatus(sessionId, 'completed');

      // Mark staging records as processed
      const { error: updateError } = await supabase
        .from('dkegl_grn_staging')
        .update({
          processing_status: 'processed',
          processed_at: new Date().toISOString()
        })
        .eq('upload_session_id', sessionId)
        .eq('processing_status', 'approved');

      if (updateError) throw updateError;

      toast({
        title: "Records processed successfully",
        description: `${approvedRecords.length} GRN records have been created and stock updated`
      });

    } catch (error: any) {
      console.error('Error processing records:', error);
      toast({
        title: "Error processing records",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const exportValidationReport = (sessionId: string) => {
    try {
      if (!stagingRecords.length) return;

      const reportData = stagingRecords.map(record => ({
        'Row Number': record.source_row_number,
        'GRN Number': record.grn_number,
        'Item Code': record.item_code,
        'Supplier Name': record.supplier_name,
        'Quantity Received': record.qty_received,
        'Unit Rate': record.unit_rate,
        'Validation Status': record.validation_status,
        'Is Duplicate': record.is_duplicate ? 'Yes' : 'No',
        'Errors': record.validation_errors?.join('; ') || '',
        'Warnings': record.validation_warnings?.join('; ') || '',
        'Processing Status': record.processing_status
      }));

      const worksheet = XLSX.utils.json_to_sheet(reportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Validation Report');
      
      const fileName = `validation_report_${sessionId}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: "Validation report exported",
        description: `Report saved as ${fileName}`
      });
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return {
    // State
    isUploading,
    uploadProgress,
    currentSession,
    stagingRecords,
    qualityMetrics,
    availableItems,
    
    // Actions
    uploadFile,
    loadUploadSession,
    approveUploadSession,
    processApprovedRecords,
    exportValidationReport,
    loadAvailableItems
  };
};