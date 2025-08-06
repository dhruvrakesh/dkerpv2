import * as XLSX from 'xlsx';

export interface OpeningStockTemplateRow {
  item_code: string;
  item_name: string;
  category_name: string;
  opening_qty: number;
  unit_cost: number;
  total_value: number;
  opening_date: string;
  location: string;
  remarks?: string;
}

// Sample data for template generation
export const sampleOpeningStockData: OpeningStockTemplateRow[] = [
  {
    item_code: 'SUB_BOPP_350MM_20GSM',
    item_name: 'BOPP Substrate 350mm x 20 GSM',
    category_name: 'Raw Materials - Substrates',
    opening_qty: 1500.000,
    unit_cost: 120.50,
    total_value: 180750.00,
    opening_date: '2024-01-01',
    location: 'MAIN_STORE',
    remarks: 'Initial stock from migration'
  },
  {
    item_code: 'INK_CYAN_PROCESS',
    item_name: 'Process Cyan Ink for Gravure',
    category_name: 'Raw Materials - Inks',
    opening_qty: 25.000,
    unit_cost: 850.00,
    total_value: 21250.00,
    opening_date: '2024-01-01',
    location: 'PRODUCTION_FLOOR',
    remarks: 'Ready for production use'
  },
  {
    item_code: 'INK_MAGENTA_PROCESS',
    item_name: 'Process Magenta Ink for Gravure',
    category_name: 'Raw Materials - Inks',
    opening_qty: 20.000,
    unit_cost: 875.00,
    total_value: 17500.00,
    opening_date: '2024-01-01',
    location: 'PRODUCTION_FLOOR',
    remarks: 'Ready for production use'
  },
  {
    item_code: 'SUB_PE_350MM_40GSM',
    item_name: 'PE Substrate 350mm x 40 GSM',
    category_name: 'Raw Materials - Substrates',
    opening_qty: 800.000,
    unit_cost: 95.75,
    total_value: 76600.00,
    opening_date: '2024-01-01',
    location: 'MAIN_STORE',
    remarks: 'High quality PE for lamination'
  },
  {
    item_code: 'ADH_SOLVENT_BASED',
    item_name: 'Solvent Based Adhesive',
    category_name: 'Raw Materials - Adhesives',
    opening_qty: 45.000,
    unit_cost: 450.00,
    total_value: 20250.00,
    opening_date: '2024-01-01',
    location: 'MAIN_STORE',
    remarks: 'For lamination process'
  },
  {
    item_code: 'PKG_POUCH_STANDUP_500ML',
    item_name: 'Stand-up Pouch 500ml Capacity',
    category_name: 'Finished Goods',
    opening_qty: 2500.000,
    unit_cost: 12.50,
    total_value: 31250.00,
    opening_date: '2024-01-01',
    location: 'FINISHED_GOODS',
    remarks: 'Ready for dispatch'
  }
];

// Column headers with descriptions
export const templateColumns = [
  { key: 'item_code', title: 'Item Code', description: 'Unique identifier for the item (required)' },
  { key: 'item_name', title: 'Item Name', description: 'Full name/description of the item (required)' },
  { key: 'category_name', title: 'Category Name', description: 'Product category (optional)' },
  { key: 'opening_qty', title: 'Opening Quantity', description: 'Opening stock quantity (required, positive numbers only)' },
  { key: 'unit_cost', title: 'Unit Cost (INR)', description: 'Cost per unit in Indian Rupees (required, non-negative)' },
  { key: 'total_value', title: 'Total Value (INR)', description: 'Calculated as Opening Qty × Unit Cost (auto-calculated)' },
  { key: 'opening_date', title: 'Opening Date', description: 'Date format: YYYY-MM-DD (optional, uses system date if not provided)' },
  { key: 'location', title: 'Location', description: 'Storage location (optional, defaults to MAIN_STORE)' },
  { key: 'remarks', title: 'Remarks', description: 'Additional notes or comments (optional)' }
];

export function generateExcelTemplate(): void {
  try {
    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    
    // Create instructions sheet
    const instructionsData = [
      ['DKEGL Opening Stock Import Template - Instructions'],
      [''],
      ['IMPORTANT: Please read these instructions before filling the template'],
      [''],
      ['Required Fields:'],
      ['• item_code: Must be unique and exist in the system'],
      ['• item_name: Full descriptive name of the item'],
      ['• opening_qty: Must be a positive number (no negative quantities)'],
      ['• unit_cost: Must be non-negative (can be zero for free items)'],
      [''],
      ['Optional Fields:'],
      ['• category_name: Will be auto-filled if item exists in master'],
      ['• opening_date: Use YYYY-MM-DD format, defaults to today if empty'],
      ['• location: Defaults to MAIN_STORE if not specified'],
      ['• remarks: Additional notes or comments'],
      [''],
      ['Validation Rules:'],
      ['• Opening dates cannot be in the future'],
      ['• Item codes must exist in the Item Master'],
      ['• No duplicate item_code entries allowed'],
      ['• Total value will be auto-calculated during import'],
      [''],
      ['Valid Locations:'],
      ['• MAIN_STORE (default)'],
      ['• PRODUCTION_FLOOR'],
      ['• QC_HOLD'],
      ['• FINISHED_GOODS'],
      [''],
      ['Sample Data:'],
      ['The "Sample Data" sheet contains realistic examples'],
      ['You can copy these examples and modify as needed']
    ];
    
    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
    
    // Create template sheet with headers
    const templateHeaders = templateColumns.map(col => col.title);
    const templateSheet = XLSX.utils.aoa_to_sheet([templateHeaders]);
    
    // Add column descriptions as comments/notes
    templateColumns.forEach((col, index) => {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: index });
      if (!templateSheet[cellRef]) templateSheet[cellRef] = { t: 's', v: col.title };
      templateSheet[cellRef].c = [{ a: 'System', t: col.description }];
    });
    
    XLSX.utils.book_append_sheet(workbook, templateSheet, 'Template');
    
    // Create sample data sheet
    const sampleDataArray = [
      templateHeaders,
      ...sampleOpeningStockData.map(row => [
        row.item_code,
        row.item_name,
        row.category_name,
        row.opening_qty,
        row.unit_cost,
        row.total_value,
        row.opening_date,
        row.location,
        row.remarks
      ])
    ];
    
    const sampleSheet = XLSX.utils.aoa_to_sheet(sampleDataArray);
    XLSX.utils.book_append_sheet(workbook, sampleSheet, 'Sample Data');
    
    // Generate and download file
    const fileName = `DKEGL_Opening_Stock_Template_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
  } catch (error) {
    console.error('Error generating Excel template:', error);
    throw new Error('Failed to generate Excel template');
  }
}

export function generateCSVTemplate(): void {
  try {
    // Create CSV content with headers and sample data
    const headers = templateColumns.map(col => col.title).join(',');
    const sampleRows = sampleOpeningStockData.map(row => 
      [
        row.item_code,
        `"${row.item_name}"`,
        `"${row.category_name}"`,
        row.opening_qty,
        row.unit_cost,
        row.total_value,
        row.opening_date,
        row.location,
        row.remarks ? `"${row.remarks}"` : ''
      ].join(',')
    );
    
    const csvContent = [
      '# DKEGL Opening Stock Import Template',
      '# Required: item_code, item_name, opening_qty, unit_cost',
      '# Optional: category_name, opening_date, location, remarks',
      '# Date format: YYYY-MM-DD, Quantities: positive numbers only',
      '',
      headers,
      ...sampleRows
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const fileName = `DKEGL_Opening_Stock_Template_${new Date().toISOString().split('T')[0]}.csv`;
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
  } catch (error) {
    console.error('Error generating CSV template:', error);
    throw new Error('Failed to generate CSV template');
  }
}

export function downloadTemplate(format: 'excel' | 'csv'): void {
  if (format === 'excel') {
    generateExcelTemplate();
  } else {
    generateCSVTemplate();
  }
}