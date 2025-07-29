import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Upload, FileSpreadsheet, History, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useOpeningStockManagement } from '@/hooks/useOpeningStockManagement';
import { OpeningStockImportDialog } from './OpeningStockImportDialog';
import { OpeningStockExportDialog } from './OpeningStockExportDialog';
import { OpeningStockAuditTrail } from './OpeningStockAuditTrail';

export function OpeningStockManagementDashboard() {
  const { toast } = useToast();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  
  const {
    openingStock,
    auditTrail,
    loading,
    importing,
    exporting,
    fetchOpeningStock,
    importOpeningStock,
    exportOpeningStock,
    validateOpeningStock,
    updateOpeningStock
  } = useOpeningStockManagement();

  React.useEffect(() => {
    fetchOpeningStock();
  }, [fetchOpeningStock]);

  const handleRefresh = () => {
    fetchOpeningStock();
    toast({
      title: "Data Refreshed",
      description: "Opening stock data has been refreshed successfully.",
    });
  };

  const handleValidateAll = async () => {
    try {
      const result = await validateOpeningStock();
      toast({
        title: result.isValid ? "Validation Successful" : "Validation Issues Found",
        description: result.isValid 
          ? "All opening stock data is valid."
          : `${result.errors.length} validation errors found.`,
        variant: result.isValid ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Validation Failed",
        description: "Unable to validate opening stock data.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  // Calculate summary metrics
  const totalItems = openingStock?.length || 0;
  const totalValue = openingStock?.reduce((sum, item) => sum + (item.opening_qty * item.unit_cost), 0) || 0;
  const validItems = openingStock?.filter(item => item.is_valid)?.length || 0;
  const invalidItems = totalItems - validItems;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Opening Stock Manager</h2>
          <p className="text-muted-foreground">
            Import, export, and manage opening stock data with comprehensive audit trail
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            Refresh
          </Button>
          <Button onClick={handleValidateAll} variant="outline" size="sm">
            <CheckCircle className="h-4 w-4 mr-2" />
            Validate All
          </Button>
          <Button onClick={() => setImportDialogOpen(true)} size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import Data
          </Button>
          <Button onClick={() => setExportDialogOpen(true)} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Opening stock entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">Combined opening value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valid Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-green-600">{validItems}</div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {totalItems > 0 ? Math.round((validItems / totalItems) * 100) : 0}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Validated entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-red-600">{invalidItems}</div>
              {invalidItems > 0 && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Main Content Tabs */}
      <Tabs defaultValue="data" className="space-y-6">
        <TabsList>
          <TabsTrigger value="data">Opening Stock Data</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="templates">Import Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Opening Stock Entries</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage opening stock data for all inventory items
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">Loading opening stock data...</div>
                </div>
              ) : openingStock && openingStock.length > 0 ? (
                <div className="space-y-4">
                  {/* Data table would go here */}
                  <div className="border rounded-md">
                    <div className="p-4 border-b bg-muted/50">
                      <div className="grid grid-cols-6 gap-4 text-sm font-medium">
                        <div>Item Code</div>
                        <div>Item Name</div>
                        <div>Opening Qty</div>
                        <div>Unit Cost</div>
                        <div>Total Value</div>
                        <div>Status</div>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {openingStock.slice(0, 50).map((item, index) => (
                        <div key={index} className="p-4 border-b grid grid-cols-6 gap-4 text-sm">
                          <div className="font-mono">{item.item_code}</div>
                          <div className="truncate">{item.item_name}</div>
                          <div>{item.opening_qty}</div>
                          <div>{formatCurrency(item.unit_cost)}</div>
                          <div>{formatCurrency(item.opening_qty * item.unit_cost)}</div>
                          <div>
                            <Badge variant={item.is_valid ? "default" : "destructive"}>
                              {item.is_valid ? "Valid" : "Invalid"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {openingStock.length > 50 && (
                    <p className="text-sm text-muted-foreground text-center">
                      Showing first 50 of {openingStock.length} entries. Use export for complete data.
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Opening Stock Data</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Import opening stock data to get started with inventory management.
                  </p>
                  <Button onClick={() => setImportDialogOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Opening Stock
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <OpeningStockAuditTrail auditTrail={auditTrail} loading={loading} />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import Templates</CardTitle>
              <p className="text-sm text-muted-foreground">
                Download templates and guidelines for importing opening stock data
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Excel Template</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Pre-formatted Excel template with all required columns and validation rules.
                  </p>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download Excel Template
                  </Button>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">CSV Template</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Simple CSV format for basic opening stock data import.
                  </p>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV Template
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">Import Guidelines</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Ensure all item codes match existing items in the system</li>
                  <li>• Opening quantities must be positive numbers</li>
                  <li>• Unit costs should be in INR without currency symbols</li>
                  <li>• Use the exact date format: YYYY-MM-DD</li>
                  <li>• Maximum file size: 10MB</li>
                  <li>• Supported formats: Excel (.xlsx), CSV (.csv)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Dialog */}
      <OpeningStockImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={importOpeningStock}
        importing={importing}
      />

      {/* Export Dialog */}
      <OpeningStockExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={exportOpeningStock}
        exporting={exporting}
        totalRecords={totalItems}
      />
    </div>
  );
}