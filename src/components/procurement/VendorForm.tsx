import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Vendor, VendorCategory } from '@/hooks/useVendorManagement';

interface VendorFormProps {
  vendor?: Vendor;
  categories: VendorCategory[];
  onSubmit: (data: Partial<Vendor>) => Promise<void>;
  onCancel: () => void;
}

export const VendorForm: React.FC<VendorFormProps> = ({
  vendor,
  categories,
  onSubmit,
  onCancel
}) => {
  const [formData, setFormData] = useState<Partial<Vendor>>({
    vendor_name: vendor?.vendor_name || '',
    contact_person: vendor?.contact_person || '',
    email: vendor?.email || '',
    phone: vendor?.phone || '',
    supplier_type: vendor?.supplier_type || 'VENDOR',
    category_id: vendor?.category_id || null,
    is_active: vendor?.is_active ?? true,
    approval_status: vendor?.approval_status || 'pending',
    address_details: vendor?.address_details || {},
    tax_details: vendor?.tax_details || {},
    bank_details: vendor?.bank_details || {},
  });

  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: keyof Vendor, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      address_details: {
        ...prev.address_details,
        [field]: value
      }
    }));
  };

  const handleTaxChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      tax_details: {
        ...prev.tax_details,
        [field]: value
      }
    }));
  };

  const handleBankChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      bank_details: {
        ...prev.bank_details,
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Clean up form data - convert empty strings to null for UUID fields
      const cleanedData = {
        ...formData,
        category_id: formData.category_id === 'no-category' || formData.category_id === '' ? null : formData.category_id,
      };
      await onSubmit(cleanedData);
    } catch (error) {
      // Error handled in parent component
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="tax">Tax Details</TabsTrigger>
          <TabsTrigger value="bank">Bank Details</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Essential vendor details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendor_name">Vendor Name *</Label>
                  <Input
                    id="vendor_name"
                    value={formData.vendor_name}
                    onChange={(e) => handleInputChange('vendor_name', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => handleInputChange('contact_person', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier_type">Supplier Type *</Label>
                  <Select
                    value={formData.supplier_type}
                    onValueChange={(value) => handleInputChange('supplier_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANUFACTURER">Manufacturer</SelectItem>
                      <SelectItem value="DISTRIBUTOR">Distributor</SelectItem>
                      <SelectItem value="VENDOR">Vendor</SelectItem>
                      <SelectItem value="AGENT">Agent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category_id">Category</Label>
                  <Select
                    value={formData.category_id || 'no-category'}
                    onValueChange={(value) => handleInputChange('category_id', value === 'no-category' ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-category">No Category</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.category_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="is_active">Status</Label>
                  <Select
                    value={formData.is_active ? 'active' : 'inactive'}
                    onValueChange={(value) => handleInputChange('is_active', value === 'active')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approval_status">Approval Status</Label>
                  <Select
                    value={formData.approval_status}
                    onValueChange={(value) => handleInputChange('approval_status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="address" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
              <CardDescription>Vendor's business address details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address_line1">Address Line 1</Label>
                <Input
                  id="address_line1"
                  value={formData.address_details?.line1 || ''}
                  onChange={(e) => handleAddressChange('line1', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input
                  id="address_line2"
                  value={formData.address_details?.line2 || ''}
                  onChange={(e) => handleAddressChange('line2', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.address_details?.city || ''}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.address_details?.state || ''}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.address_details?.country || ''}
                    onChange={(e) => handleAddressChange('country', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.address_details?.postal_code || ''}
                    onChange={(e) => handleAddressChange('postal_code', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax Information</CardTitle>
              <CardDescription>Tax registration and compliance details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax_number">Tax Number / GST</Label>
                  <Input
                    id="tax_number"
                    value={formData.tax_details?.tax_number || ''}
                    onChange={(e) => handleTaxChange('tax_number', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pan_number">PAN Number</Label>
                  <Input
                    id="pan_number"
                    value={formData.tax_details?.pan_number || ''}
                    onChange={(e) => handleTaxChange('pan_number', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_registration_address">Tax Registration Address</Label>
                <Textarea
                  id="tax_registration_address"
                  value={formData.tax_details?.registration_address || ''}
                  onChange={(e) => handleTaxChange('registration_address', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bank Details</CardTitle>
              <CardDescription>Banking information for payments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_details?.bank_name || ''}
                    onChange={(e) => handleBankChange('bank_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch_name">Branch Name</Label>
                  <Input
                    id="branch_name"
                    value={formData.bank_details?.branch_name || ''}
                    onChange={(e) => handleBankChange('branch_name', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="account_number">Account Number</Label>
                  <Input
                    id="account_number"
                    value={formData.bank_details?.account_number || ''}
                    onChange={(e) => handleBankChange('account_number', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ifsc_code">IFSC Code</Label>
                  <Input
                    id="ifsc_code"
                    value={formData.bank_details?.ifsc_code || ''}
                    onChange={(e) => handleBankChange('ifsc_code', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_holder_name">Account Holder Name</Label>
                <Input
                  id="account_holder_name"
                  value={formData.bank_details?.account_holder_name || ''}
                  onChange={(e) => handleBankChange('account_holder_name', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : vendor ? 'Update Vendor' : 'Create Vendor'}
        </Button>
      </div>
    </form>
  );
};