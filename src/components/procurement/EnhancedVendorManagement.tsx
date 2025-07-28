import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useVendorManagement, Vendor } from '@/hooks/useVendorManagement';
import { useBulkVendorUpload } from '@/hooks/useBulkVendorUpload';
import { VendorForm } from './VendorForm';
import { BulkUploadDialog } from './BulkUploadDialog';
import {
  Search,
  Plus,
  Upload,
  Download,
  Filter,
  Star,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';

export const EnhancedVendorManagement = () => {
  const {
    vendors,
    categories,
    loading,
    fetchVendors,
    createVendor,
    updateVendor,
    deleteVendor,
    approveVendor,
    rejectVendor
  } = useVendorManagement();

  const { downloadTemplate } = useBulkVendorUpload();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const getStatusBadge = (status: string, approvalStatus: string) => {
    if (approvalStatus === 'pending') {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">Pending</Badge>;
    }
    if (approvalStatus === 'rejected') {
      return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Rejected</Badge>;
    }
    if (status === 'active') {
      return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Active</Badge>;
    }
    if (status === 'inactive') {
      return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">Inactive</Badge>;
    }
    return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Blacklisted</Badge>;
  };

  const getPerformanceStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < Math.floor(rating) 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = 
      vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.vendor_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
    const matchesType = typeFilter === 'all' || vendor.supplier_type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || vendor.category_id === categoryFilter;

    return matchesSearch && matchesStatus && matchesType && matchesCategory;
  });

  const handleAddVendor = async (vendorData: Partial<Vendor>) => {
    try {
      await createVendor(vendorData);
      setShowAddDialog(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleUpdateVendor = async (vendorData: Partial<Vendor>) => {
    if (!selectedVendor) return;
    
    try {
      await updateVendor(selectedVendor.id, vendorData);
      setSelectedVendor(null);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (confirm('Are you sure you want to delete this vendor?')) {
      await deleteVendor(vendorId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Vendor Management</h2>
          <p className="text-muted-foreground">
            Manage vendors, track performance, and handle approvals
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Template</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowBulkUpload(true)}
            className="flex items-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>Bulk Upload</span>
          </Button>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Vendor</span>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendors.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {vendors.filter(v => v.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {vendors.filter(v => v.approval_status === 'pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Rated</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {vendors.filter(v => v.performance_rating >= 4).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors by name, code, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="blacklisted">Blacklisted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="MANUFACTURER">Manufacturer</SelectItem>
                <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                <SelectItem value="VENDOR">Vendor</SelectItem>
                <SelectItem value="AGENT">Agent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.category_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendors ({filteredVendors.length})</CardTitle>
          <CardDescription>
            Manage your vendor database and track performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor Details</TableHead>
                  <TableHead>Type & Category</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading vendors...
                    </TableCell>
                  </TableRow>
                ) : filteredVendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      No vendors found matching your criteria
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendors.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{vendor.vendor_name}</p>
                          <p className="text-sm text-muted-foreground">{vendor.vendor_code}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <Badge variant="outline" className="mb-1">
                            {vendor.supplier_type}
                          </Badge>
                          {vendor.category_id && (
                            <p className="text-xs text-muted-foreground">
                              Category assigned
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1">
                            {getPerformanceStars(vendor.performance_rating)}
                            <span className="text-sm text-muted-foreground ml-2">
                              {vendor.performance_rating.toFixed(1)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Q: {vendor.quality_rating.toFixed(1)} | 
                            D: {vendor.delivery_rating.toFixed(1)} | 
                            P: {vendor.pricing_rating.toFixed(1)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(vendor.status, vendor.approval_status)}
                      </TableCell>
                      <TableCell>
                        <div>
                          {vendor.contact_person && (
                            <p className="text-sm font-medium">{vendor.contact_person}</p>
                          )}
                          {vendor.email && (
                            <p className="text-xs text-muted-foreground">{vendor.email}</p>
                          )}
                          {vendor.phone && (
                            <p className="text-xs text-muted-foreground">{vendor.phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {vendor.approval_status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => approveVendor(vendor.id)}
                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => rejectVendor(vendor.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedVendor(vendor)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteVendor(vendor.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Vendor Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
            <DialogDescription>
              Create a new vendor profile with complete details
            </DialogDescription>
          </DialogHeader>
          <VendorForm
            categories={categories}
            onSubmit={handleAddVendor}
            onCancel={() => setShowAddDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Dialog */}
      <Dialog open={!!selectedVendor} onOpenChange={(open) => !open && setSelectedVendor(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>
              Update vendor information and settings
            </DialogDescription>
          </DialogHeader>
          {selectedVendor && (
            <VendorForm
              vendor={selectedVendor}
              categories={categories}
              onSubmit={handleUpdateVendor}
              onCancel={() => setSelectedVendor(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        open={showBulkUpload}
        onOpenChange={setShowBulkUpload}
        onSuccess={() => {
          setShowBulkUpload(false);
          fetchVendors();
        }}
      />
    </div>
  );
};