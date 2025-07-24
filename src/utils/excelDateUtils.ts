/**
 * Enterprise-grade Excel date conversion utilities
 * Handles various date formats including Excel serial numbers
 */

export class ExcelDateConverter {
  /**
   * Excel's epoch starts from 1900-01-01, but with a known bug
   * where 1900 is treated as a leap year (it's not)
   */
  private static readonly EXCEL_EPOCH = new Date(1900, 0, 1);
  private static readonly EXCEL_SERIAL_DATE_OFFSET = 25567; // Days between 1900-01-01 and 1970-01-01
  private static readonly MS_PER_DAY = 24 * 60 * 60 * 1000;

  /**
   * Check if a value is an Excel serial date (numeric value > 1)
   */
  static isExcelSerialDate(value: any): boolean {
    if (typeof value === 'number') {
      return value > 1 && value < 100000; // Reasonable range for Excel dates
    }
    return false;
  }

  /**
   * Convert Excel serial date to JavaScript Date
   */
  static convertExcelSerialDate(serialDate: number): Date {
    // Handle Excel's leap year bug for dates before March 1, 1900
    const adjustedSerial = serialDate > 59 ? serialDate - 1 : serialDate;
    
    // Convert to Unix timestamp
    const unixTimestamp = (adjustedSerial - this.EXCEL_SERIAL_DATE_OFFSET) * this.MS_PER_DAY;
    return new Date(unixTimestamp);
  }

  /**
   * Smart date conversion that handles multiple formats
   */
  static convertToDate(value: any): Date | null {
    if (!value) return null;

    // If already a Date object
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }

    // If it's an Excel serial date
    if (this.isExcelSerialDate(value)) {
      try {
        return this.convertExcelSerialDate(value);
      } catch (error) {
        console.warn('Failed to convert Excel serial date:', value);
        return null;
      }
    }

    // If it's a string, try various parsing methods
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;

      // Try common date formats
      const formats = [
        // ISO formats
        /^\d{4}-\d{2}-\d{2}$/,
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        // DD/MM/YYYY and MM/DD/YYYY
        /^\d{1,2}\/\d{1,2}\/\d{4}$/,
        // DD-MM-YYYY and MM-DD-YYYY
        /^\d{1,2}-\d{1,2}-\d{4}$/,
        // DD.MM.YYYY
        /^\d{1,2}\.\d{1,2}\.\d{4}$/,
      ];

      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    // If it's a number but not an Excel serial date, try as timestamp
    if (typeof value === 'number') {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return null;
  }

  /**
   * Convert date to ISO string for database storage
   */
  static toISODateString(value: any): string | null {
    const date = this.convertToDate(value);
    return date ? date.toISOString().split('T')[0] : null;
  }

  /**
   * Validate if a date is reasonable for business operations
   */
  static isValidBusinessDate(date: Date): boolean {
    const now = new Date();
    const hundredYearsAgo = new Date(now.getFullYear() - 100, 0, 1);
    const oneYearFromNow = new Date(now.getFullYear() + 1, 11, 31);

    return date >= hundredYearsAgo && date <= oneYearFromNow;
  }

  /**
   * Convert and validate date for GRN operations
   */
  static convertAndValidateGRNDate(value: any): { 
    date: string | null; 
    isValid: boolean; 
    warnings: string[] 
  } {
    const warnings: string[] = [];
    const convertedDate = this.convertToDate(value);
    
    if (!convertedDate) {
      return { date: null, isValid: false, warnings: ['Invalid date format'] };
    }

    if (!this.isValidBusinessDate(convertedDate)) {
      warnings.push('Date is outside reasonable business range');
    }

    const now = new Date();
    if (convertedDate > now) {
      warnings.push('GRN date is in the future');
    }

    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    if (convertedDate < oneYearAgo) {
      warnings.push('GRN date is more than 1 year old');
    }

    return {
      date: convertedDate.toISOString().split('T')[0],
      isValid: true,
      warnings
    };
  }
}

/**
 * Utility functions for Excel data processing
 */
export class ExcelDataProcessor {
  /**
   * Clean and normalize text values
   */
  static cleanTextValue(value: any): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  /**
   * Convert numeric values safely
   */
  static toNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Validate and normalize GRN number format
   */
  static normalizeGRNNumber(value: any): string {
    const cleaned = this.cleanTextValue(value);
    if (!cleaned) return '';
    
    // Remove extra spaces and normalize format
    return cleaned.toUpperCase().replace(/\s+/g, '');
  }

  /**
   * Validate item code format
   */
  static validateItemCode(value: any): { 
    code: string; 
    isValid: boolean; 
    suggestions?: string[] 
  } {
    const cleaned = this.cleanTextValue(value);
    if (!cleaned) {
      return { code: '', isValid: false };
    }

    // Basic validation - adjust based on your item code format
    const isValid = /^[A-Z0-9_-]+$/i.test(cleaned);
    
    return {
      code: cleaned.toUpperCase(),
      isValid,
      suggestions: isValid ? undefined : ['Check item code format']
    };
  }
}