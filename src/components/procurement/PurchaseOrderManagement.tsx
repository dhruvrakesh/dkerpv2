import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Filter, 
  Eye, 
  Edit, 
  Check, 
  Send, 
  X, 
  Trash2, 
  MoreHorizontal,
  FileText,
  Calendar,
  DollarSign
} from 'lucide-react';
import { usePurchaseOrderManagement, PurchaseOrder } from '@/hooks/usePurchaseOrderManagement';
import { useVendorManagement } from '@/hooks/useVendorManagement';
import { format } from 'date-fns';

const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig = {
    draft: { label: 'Draft', variant: 'secondary' as const },
    issued: { label: 'Issued', variant: 'default' as const },
    approved: { label: 'Approved', variant: 'default' as const },
    received: { label: 'Received', variant: 'default' as const },
    cancelled: { label: 'Cancelled', variant: 'destructive' as const },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

const PurchaseOrderDetails = ({ po }: { po: PurchaseOrder }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-sm text-muted-foreground">PO Number</h4>
          <p className="font-medium">{po.po_number}</p>
        </div>
        <div>
          <h4 className="font-medium text-sm text-muted-foreground">Status</h4>
          <StatusBadge status={po.status} />
        </div>
        <div>
          <h4 className="font-medium text-sm text-muted-foreground">Vendor</h4>
          <p>{po.vendor_name}</p>
        </div>
        <div>
          <h4 className="font-medium text-sm text-muted-foreground">Total Amount</h4>
          <p className="font-medium">₹{po.total_amount?.toFixed(2)}</p>
        </div>
        <div>
          <h4 className="font-medium text-sm text-muted-foreground">Order Date</h4>
          <p>{format(new Date(po.po_date), 'dd MMM yyyy')}</p>
        </div>
        <div>
          <h4 className="font-medium text-sm text-muted-foreground">Expected Delivery</h4>
          <p>{format(new Date(po.expected_delivery_date), 'dd MMM yyyy')}</p>
        </div>
      </div>

      {po.payment_terms && (
        <div>
          <h4 className="font-medium text-sm text-muted-foreground">Payment Terms</h4>
          <p>{po.payment_terms}</p>
        </div>
      )}

      {po.shipping_address && (
        <div>
          <h4 className="font-medium text-sm text-muted-foreground">Shipping Address</h4>
          <p className="whitespace-pre-wrap">{po.shipping_address}</p>
        </div>
      )}

      {po.notes && (
        <div>
          <h4 className="font-medium text-sm text-muted-foreground">Notes</h4>
          <p className="whitespace-pre-wrap">{po.notes}</p>
        </div>
      )}

      <div>
        <h4 className="font-medium text-sm text-muted-foreground mb-3">Line Items</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Code</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {po.items?.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{item.item_code}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{item.uom}</TableCell>
                <TableCell>₹{item.unit_price?.toFixed(2)}</TableCell>
                <TableCell>₹{(item.quantity * item.unit_price).toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export const PurchaseOrderManagement = () => {
  const navigate = useNavigate();
  const { 
    purchaseOrders, 
    loading, 
    fetchPurchaseOrders, 
    approvePurchaseOrder, 
    issuePurchaseOrder,
    cancelPurchaseOrder,
    deletePurchaseOrder 
  } = usePurchaseOrderManagement();
  const { vendors, fetchVendors } = useVendorManagement();

  const [filters, setFilters] = useState({
    status: 'all',
    vendor_id: 'all',
    search: '',
  });

  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    fetchVendors();
    fetchPurchaseOrders();
  }, []);

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesStatus = filters.status === 'all' || po.status === filters.status;
    const matchesVendor = filters.vendor_id === 'all' || po.vendor_id === filters.vendor_id;
    const matchesSearch = !filters.search || 
      po.po_number?.toLowerCase().includes(filters.search.toLowerCase()) ||
      po.vendor_name?.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesStatus && matchesVendor && matchesSearch;
  });

  const handleStatusChange = async (poId: string, action: string) => {
    switch (action) {
      case 'approve':
        await approvePurchaseOrder(poId);
        break;
      case 'issue':
        await issuePurchaseOrder(poId);
        break;
      case 'cancel':
        await cancelPurchaseOrder(poId);
        break;
      case 'delete':
        await deletePurchaseOrder(poId);
        break;
    }
    await fetchPurchaseOrders();
  };

  const getActionButtons = (po: PurchaseOrder) => {
    const actions = [];

    if (po.status === 'draft') {
      actions.push(
        <DropdownMenuItem key="issue" onClick={() => handleStatusChange(po.id!, 'issue')}>
          <Send className="h-4 w-4 mr-2" />
          Issue PO
        </DropdownMenuItem>
      );
    }

    if (po.status === 'issued') {
      actions.push(
        <DropdownMenuItem key="approve" onClick={() => handleStatusChange(po.id!, 'approve')}>
          <Check className="h-4 w-4 mr-2" />
          Approve
        </DropdownMenuItem>
      );
    }

    if (['draft', 'issued'].includes(po.status)) {
      actions.push(
        <DropdownMenuItem key="cancel" onClick={() => handleStatusChange(po.id!, 'cancel')}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </DropdownMenuItem>
      );
    }

    if (po.status === 'draft') {
      actions.push(
        <AlertDialogTrigger asChild key="delete">
          <DropdownMenuItem className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </AlertDialogTrigger>
      );
    }

    return actions;
  };

  const summaryStats = {
    total: purchaseOrders.length,
    draft: purchaseOrders.filter(po => po.status === 'draft').length,
    issued: purchaseOrders.filter(po => po.status === 'issued').length,
    approved: purchaseOrders.filter(po => po.status === 'approved').length,
    totalValue: purchaseOrders.reduce((sum, po) => sum + (po.total_amount || 0), 0),
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage purchase orders and track procurement</p>
        </div>
        <Button onClick={() => navigate('/procurement/purchase-orders/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create PO
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{summaryStats.total}</p>
                <p className="text-xs text-muted-foreground">Total POs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{summaryStats.issued}</p>
                <p className="text-xs text-muted-foreground">Issued</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{summaryStats.approved}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">₹{summaryStats.totalValue.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Purchase Orders
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search POs..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                className="w-64"
              />
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({...filters, status: value})}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.vendor_id}
                onValueChange={(value) => setFilters({...filters, vendor_id: value})}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map(vendor => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO Number</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading purchase orders...
                  </TableCell>
                </TableRow>
              ) : filteredPOs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No purchase orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPOs.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.po_number}</TableCell>
                    <TableCell>{po.vendor_name}</TableCell>
                    <TableCell>
                      <StatusBadge status={po.status} />
                    </TableCell>
                    <TableCell>{format(new Date(po.po_date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>{format(new Date(po.expected_delivery_date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>₹{po.total_amount?.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedPO(po)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Purchase Order Details</DialogTitle>
                              <DialogDescription>
                                Complete information for {selectedPO?.po_number}
                              </DialogDescription>
                            </DialogHeader>
                            {selectedPO && <PurchaseOrderDetails po={selectedPO} />}
                          </DialogContent>
                        </Dialog>

                        <AlertDialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {getActionButtons(po)}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this purchase order? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleStatusChange(po.id!, 'delete')}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};