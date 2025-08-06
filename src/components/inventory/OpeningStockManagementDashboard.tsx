import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, Download, Upload, RefreshCw } from 'lucide-react';
import { useOpeningStockManagement } from '@/hooks/useOpeningStockManagement';
import { OpeningStockImportDialog } from './OpeningStockImportDialog';
import { OpeningStockExportDialog } from './OpeningStockExportDialog';
import { OpeningStockEditModal } from './OpeningStockEditModal';
import { toast } from '@/hooks/use-toast';

export function OpeningStockManagementDashboard() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const {
    openingStock,
    auditTrail,
    loading,
    importing,
    exporting,
    fetchOpeningStock,
    fetchAuditTrail,
    importOpeningStock,
    exportOpeningStock,
    validateOpeningStock,
    updateOpeningStock
  } = useOpeningStockManagement();

  useEffect(() => {
    fetchOpeningStock();
    fetchAuditTrail();
  }, [fetchOpeningStock, fetchAuditTrail]);

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
        title: result.valid ? "Validation Successful" : "Validation Issues Found",
        description: result.valid 
          ? "All opening stock data is valid."
          : `${result.errors.length} validation errors found.`,
        variant: result.valid ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Validation Failed",
        description: "Unable to validate opening stock data.",
        variant: "destructive",
      });
    }
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
  };

  const handleUpdateItem = async (itemId: string, updates: any) => {
    await updateOpeningStock(itemId, updates);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const totalItems = openingStock?.length || 0;
  const totalValue = openingStock?.reduce((sum, item) => sum + (item.opening_qty * item.unit_cost), 0) || 0;
  const validItems = openingStock?.filter(item => item.approval_status === 'approved')?.length || 0;
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
          <Button onClick={handleRefresh} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleValidateAll} variant="outline">
            <CheckCircle className="h-4 w-4 mr-2" />
            Validate All
          </Button>
          <Button onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setExportDialogOpen(true)} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
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
            <CardTitle className="text-sm font-medium">Approved Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-green-600">{validItems}</div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {totalItems > 0 ? Math.round((validItems / totalItems) * 100) : 0}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Approved entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{invalidItems}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="data" className="space-y-6">
        <TabsList>
          <TabsTrigger value="data">Opening Stock Data</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Opening Stock Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                     <TableRow>
                       <TableHead>Item Code</TableHead>
                       <TableHead>Item Name</TableHead>
                       <TableHead>Category</TableHead>
                       <TableHead>Opening Qty</TableHead>
                       <TableHead>Unit Cost</TableHead>
                       <TableHead>Total Value</TableHead>
                       <TableHead>Opening Date</TableHead>
                       <TableHead>GRN Since Opening</TableHead>
                       <TableHead>Issues Since Opening</TableHead>
                       <TableHead>Current Calculated</TableHead>
                       <TableHead>Status</TableHead>
                       <TableHead>Actions</TableHead>
                     </TableRow>
                  </TableHeader>
                  <TableBody>
                    {openingStock && openingStock.length > 0 ? (
                      openingStock.map((item) => (
                         <TableRow key={item.id}>
                           <TableCell className="font-medium">{item.item_code}</TableCell>
                           <TableCell>{item.item_name}</TableCell>
                           <TableCell>{item.category_name}</TableCell>
                           <TableCell className="text-right">
                             {item.opening_qty.toLocaleString('en-IN', { minimumFractionDigits: 3 })}
                           </TableCell>
                           <TableCell className="text-right">
                             {formatCurrency(item.unit_cost)}
                           </TableCell>
                           <TableCell className="text-right font-medium">
                             {formatCurrency(item.total_value)}
                           </TableCell>
                           <TableCell>
                             {new Date(item.opening_date).toLocaleDateString()}
                           </TableCell>
                           <TableCell className="text-right text-green-600">
                             +{(item.grn_since_opening || 0).toLocaleString('en-IN', { minimumFractionDigits: 3 })}
                           </TableCell>
                           <TableCell className="text-right text-red-600">
                             -{(item.issues_since_opening || 0).toLocaleString('en-IN', { minimumFractionDigits: 3 })}
                           </TableCell>
                           <TableCell className="text-right font-medium text-blue-600">
                             {(item.current_calculated_qty || 0).toLocaleString('en-IN', { minimumFractionDigits: 3 })}
                           </TableCell>
                           <TableCell>
                             <Badge variant={item.approval_status === 'approved' ? 'default' : 'secondary'}>
                               {item.approval_status}
                             </Badge>
                           </TableCell>
                           <TableCell>
                             <Button
                               size="sm"
                               variant="outline"
                               onClick={() => handleEditItem(item)}
                             >
                               Edit
                             </Button>
                           </TableCell>
                         </TableRow>
                      ))
                    ) : (
                       <TableRow>
                         <TableCell colSpan={12} className="text-center py-8">
                           No opening stock data found
                         </TableCell>
                       </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Record ID</TableHead>
                    <TableHead>Changed By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditTrail.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{new Date(entry.created_at).toLocaleString()}</TableCell>
                      <TableCell>{entry.action}</TableCell>
                      <TableCell>{entry.record_id}</TableCell>
                      <TableCell>{entry.changed_by}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <OpeningStockImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={importOpeningStock}
        importing={importing}
      />
      
      <OpeningStockExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={exportOpeningStock}
        exporting={exporting}
        totalRecords={openingStock.length}
      />

      <OpeningStockEditModal
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        item={editingItem}
        onSave={handleUpdateItem}
        saving={loading}
      />
    </div>
  );
}