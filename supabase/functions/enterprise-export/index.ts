import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

interface ExportRequest {
  type: 'grn' | 'issue' | 'stock'
  format: 'excel' | 'csv'
  filters?: {
    startDate?: string
    endDate?: string
    department?: string
    itemCode?: string
    supplier?: string
    status?: string
  }
  organizationId: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { type, format, filters, organizationId }: ExportRequest = await req.json()

    console.log(`Starting export for ${type} data in ${format} format`)

    let query = supabase.from(getTableName(type)).select('*').eq('organization_id', organizationId)

    // Apply filters
    if (filters) {
      if (filters.startDate) {
        const dateColumn = type === 'grn' ? 'date' : type === 'issue' ? 'date' : 'created_at'
        query = query.gte(dateColumn, filters.startDate)
      }
      if (filters.endDate) {
        const dateColumn = type === 'grn' ? 'date' : type === 'issue' ? 'date' : 'created_at'
        query = query.lte(dateColumn, filters.endDate)
      }
      if (filters.department && type === 'issue') {
        query = query.eq('department', filters.department)
      }
      if (filters.itemCode) {
        query = query.eq('item_code', filters.itemCode)
      }
      if (filters.supplier && type === 'grn') {
        query = query.eq('supplier_name', filters.supplier)
      }
      if (filters.status) {
        const statusColumn = type === 'grn' ? 'quality_status' : 'status'
        query = query.eq(statusColumn, filters.status)
      }
    }

    // Fetch data in batches for large datasets
    const batchSize = 1000
    let allData: any[] = []
    let start = 0
    let hasMore = true

    while (hasMore) {
      const { data: batchData, error } = await query
        .range(start, start + batchSize - 1)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (batchData && batchData.length > 0) {
        allData = allData.concat(batchData)
        start += batchSize
        hasMore = batchData.length === batchSize
      } else {
        hasMore = false
      }

      console.log(`Fetched batch: ${start} records total`)
    }

    console.log(`Total records fetched: ${allData.length}`)

    // Transform data for export
    const exportData = transformDataForExport(allData, type)

    // Generate file content
    let fileContent: string
    let mimeType: string
    let fileName: string

    if (format === 'csv') {
      fileContent = generateCSV(exportData)
      mimeType = 'text/csv'
      fileName = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`
    } else {
      fileContent = generateExcel(exportData)
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      fileName = `${type}_export_${new Date().toISOString().split('T')[0]}.xlsx`
    }

    console.log(`Export completed: ${exportData.length} records`)

    return new Response(fileContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Record-Count': allData.length.toString(),
      },
    })

  } catch (error) {
    console.error('Export error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

function getTableName(type: string): string {
  switch (type) {
    case 'grn': return 'dkegl_grn_log'
    case 'issue': return 'dkegl_issue_log'
    case 'stock': return 'dkegl_stock'
    default: throw new Error(`Invalid export type: ${type}`)
  }
}

function transformDataForExport(data: any[], type: string): any[] {
  switch (type) {
    case 'grn':
      return data.map(grn => ({
        'GRN Number': grn.grn_number || '',
        'Date': grn.date || '',
        'Item Code': grn.item_code || '',
        'Item Name': grn.item_name || '',
        'Supplier Name': grn.supplier_name || '',
        'Quantity Received': grn.qty_received || 0,
        'UOM': grn.uom || '',
        'Unit Rate': grn.unit_rate || 0,
        'Total Amount': grn.total_amount || 0,
        'Invoice Number': grn.invoice_number || '',
        'Invoice Date': grn.invoice_date || '',
        'Quality Status': grn.quality_status || '',
        'Remarks': grn.remarks || '',
        'Created At': new Date(grn.created_at).toLocaleString()
      }))
    
    case 'issue':
      return data.map(issue => ({
        'Issue ID': issue.id?.slice(0, 8) || '',
        'Date': issue.date || '',
        'Item Code': issue.item_code || '',
        'Item Name': issue.item_name || '',
        'Quantity Issued': issue.qty_issued || 0,
        'UOM': issue.uom || '',
        'Department': issue.department || '',
        'Purpose': issue.purpose || '',
        'Requested By': issue.requested_by || '',
        'Approved By': issue.approved_by || '',
        'Remarks': issue.remarks || '',
        'Created At': new Date(issue.created_at).toLocaleString()
      }))
    
    case 'stock':
      return data.map(stock => ({
        'Item Code': stock.item_code || '',
        'Item Name': stock.item_name || '',
        'Current Quantity': stock.current_qty || 0,
        'Unit Cost': stock.unit_cost || 0,
        'Total Value': (stock.current_qty || 0) * (stock.unit_cost || 0),
        'Location': stock.location || '',
        'Last Transaction Date': stock.last_transaction_date || '',
        'Last Updated': new Date(stock.last_updated).toLocaleString()
      }))
    
    default:
      return data
  }
}

function generateCSV(data: any[]): string {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(',')
    )
  ].join('\n')
  
  return csvContent
}

function generateExcel(data: any[]): string {
  // For simplicity, we'll return CSV format with Excel MIME type
  // In a production environment, you'd want to use a proper Excel library
  return generateCSV(data)
}