import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';
import { EnterpriseItemSelector } from '@/components/ui/enterprise-item-selector';
import { Plus, Calendar, Package, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface OrderFormData {
  uiorn: string;
  order_number: string;
  item_code: string;
  item_name: string;
  order_quantity: number;
  delivery_date: string;
  priority_level: number;
  customer_info: {
    customer_name: string;
    contact_person: string;
    phone: string;
    email: string;
  };
  specifications: {
    substrate_type: string;
    dimensions: {
      width: number;
      height: number;
      thickness: number;
    };
    colors: number;
    finish: string;
    special_requirements: string;
  };
}

export const OrderPunching = () => {
  const { organization, user } = useDKEGLAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<OrderFormData>({
    uiorn: '',
    order_number: '',
    item_code: '',
    item_name: '',
    order_quantity: 0,
    delivery_date: '',
    priority_level: 2,
    customer_info: {
      customer_name: '',
      contact_person: '',
      phone: '',
      email: '',
    },
    specifications: {
      substrate_type: '',
      dimensions: {
        width: 0,
        height: 0,
        thickness: 0,
      },
      colors: 1,
      finish: '',
      special_requirements: '',
    },
  });

  // Generate UIORN automatically
  const generateUiorn = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `UIORN${year}${month}${random}`;
  };

  // Auto-generate UIORN when component mounts
  React.useEffect(() => {
    if (!formData.uiorn) {
      setFormData(prev => ({ ...prev, uiorn: generateUiorn() }));
    }
  }, []);

  const { data: stages } = useQuery({
    queryKey: ['workflow-stages', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from('dkegl_workflow_stages')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('stage_order');

      if (error) throw error;
      return data;
    },
    enabled: !!organization?.id,
  });

  // Fetch finished goods items for the dropdown
  const { data: finishedGoods, isLoading: isLoadingItems } = useQuery({
    queryKey: ['finished-goods', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from('dkegl_item_master')
        .select(`
          item_code,
          item_name,
          uom,
          dkegl_categories!inner(category_name)
        `)
        .eq('organization_id', organization.id)
        .eq('item_type', 'finished_good')
        .eq('status', 'active')
        .order('item_name');

      if (error) throw error;
      
      // Transform to ItemOption format
      return data.map(item => ({
        id: item.item_code,
        item_code: item.item_code,
        item_name: item.item_name,
        uom: item.uom,
        category_name: item.dkegl_categories?.category_name || 'Finished Goods'
      }));
    },
    enabled: !!organization?.id,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: OrderFormData) => {
      if (!organization?.id || !user?.id) {
        throw new Error('Missing organization or user information');
      }

      // Create the order
      const { data: order, error: orderError } = await supabase
        .from('dkegl_orders')
        .insert({
          organization_id: organization.id,
          uiorn: orderData.uiorn,
          order_number: orderData.order_number,
          item_code: orderData.item_code,
          item_name: orderData.item_name,
          order_quantity: orderData.order_quantity,
          delivery_date: orderData.delivery_date,
          priority_level: orderData.priority_level,
          customer_info: orderData.customer_info,
          specifications: orderData.specifications,
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create workflow progress entries for all stages
      if (stages && stages.length > 0) {
        const workflowEntries = stages.map(stage => ({
          organization_id: organization.id,
          order_id: order.id,
          stage_id: stage.id,
          status: 'pending',
          progress_percentage: 0,
        }));

        const { error: workflowError } = await supabase
          .from('dkegl_workflow_progress')
          .insert(workflowEntries);

        if (workflowError) throw workflowError;
      }

      return order;
    },
    onSuccess: () => {
      toast({
        title: 'Order Created Successfully',
        description: `Order ${formData.uiorn} has been punched and is ready for production.`,
      });
      
      // Reset form
      setFormData({
        uiorn: generateUiorn(),
        order_number: '',
        item_code: '',
        item_name: '',
        order_quantity: 0,
        delivery_date: '',
        priority_level: 2,
        customer_info: {
          customer_name: '',
          contact_person: '',
          phone: '',
          email: '',
        },
        specifications: {
          substrate_type: '',
          dimensions: { width: 0, height: 0, thickness: 0 },
          colors: 1,
          finish: '',
          special_requirements: '',
        },
      });

      queryClient.invalidateQueries({ queryKey: ['workflow-orders'] });
    },
    onError: (error) => {
      toast({
        title: 'Error Creating Order',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    createOrderMutation.mutate(formData);
    setIsSubmitting(false);
  };

  const updateFormData = (path: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = path.split('.');
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order Punching</h1>
          <p className="text-muted-foreground">
            Create new manufacturing orders with complete specifications
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="uiorn">UIORN</Label>
                  <Input
                    id="uiorn"
                    value={formData.uiorn}
                    onChange={(e) => updateFormData('uiorn', e.target.value)}
                    placeholder="Auto-generated"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="order_number">Order Number</Label>
                  <Input
                    id="order_number"
                    value={formData.order_number}
                    onChange={(e) => updateFormData('order_number', e.target.value)}
                    placeholder="ORD-2024-001"
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Finished Goods Item</Label>
                <EnterpriseItemSelector
                  items={finishedGoods || []}
                  value={formData.item_code}
                  onValueChange={(itemCode) => {
                    const selectedItem = finishedGoods?.find(item => item.item_code === itemCode);
                    if (selectedItem) {
                      updateFormData('item_code', selectedItem.item_code);
                      updateFormData('item_name', selectedItem.item_name);
                    }
                  }}
                  placeholder="Search for finished goods..."
                  showCategories={true}
                  showRecentItems={true}
                />
                {formData.item_name && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: {formData.item_name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.order_quantity}
                    onChange={(e) => updateFormData('order_quantity', parseInt(e.target.value) || 0)}
                    placeholder="1000"
                    required
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="delivery_date">Delivery Date</Label>
                  <Input
                    id="delivery_date"
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e) => updateFormData('delivery_date', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority_level.toString()}
                    onValueChange={(value) => updateFormData('priority_level', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Low</SelectItem>
                      <SelectItem value="2">Medium</SelectItem>
                      <SelectItem value="3">High</SelectItem>
                      <SelectItem value="4">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customer_name">Customer Name</Label>
                <Input
                  id="customer_name"
                  value={formData.customer_info.customer_name}
                  onChange={(e) => updateFormData('customer_info.customer_name', e.target.value)}
                  placeholder="Acme Corporation"
                  required
                />
              </div>

              <div>
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={formData.customer_info.contact_person}
                  onChange={(e) => updateFormData('customer_info.contact_person', e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.customer_info.phone}
                    onChange={(e) => updateFormData('customer_info.phone', e.target.value)}
                    placeholder="+1-234-567-8900"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.customer_info.email}
                    onChange={(e) => updateFormData('customer_info.email', e.target.value)}
                    placeholder="john@acme.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Specifications */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="substrate_type">Substrate Type</Label>
                <Select
                  value={formData.specifications.substrate_type}
                  onValueChange={(value) => updateFormData('specifications.substrate_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select substrate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pet">PET</SelectItem>
                    <SelectItem value="bopp">BOPP</SelectItem>
                    <SelectItem value="pe">PE</SelectItem>
                    <SelectItem value="paper">Paper</SelectItem>
                    <SelectItem value="metalized">Metalized</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="width">Width (mm)</Label>
                <Input
                  id="width"
                  type="number"
                  value={formData.specifications.dimensions.width}
                  onChange={(e) => updateFormData('specifications.dimensions.width', parseFloat(e.target.value) || 0)}
                  placeholder="100"
                />
              </div>

              <div>
                <Label htmlFor="height">Height (mm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.specifications.dimensions.height}
                  onChange={(e) => updateFormData('specifications.dimensions.height', parseFloat(e.target.value) || 0)}
                  placeholder="150"
                />
              </div>

              <div>
                <Label htmlFor="thickness">Thickness (microns)</Label>
                <Input
                  id="thickness"
                  type="number"
                  value={formData.specifications.dimensions.thickness}
                  onChange={(e) => updateFormData('specifications.dimensions.thickness', parseFloat(e.target.value) || 0)}
                  placeholder="25"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="colors">Number of Colors</Label>
                <Input
                  id="colors"
                  type="number"
                  value={formData.specifications.colors}
                  onChange={(e) => updateFormData('specifications.colors', parseInt(e.target.value) || 1)}
                  placeholder="4"
                  min="1"
                  max="8"
                />
              </div>

              <div>
                <Label htmlFor="finish">Finish Type</Label>
                <Select
                  value={formData.specifications.finish}
                  onValueChange={(value) => updateFormData('specifications.finish', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select finish" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gloss">Gloss</SelectItem>
                    <SelectItem value="matte">Matte</SelectItem>
                    <SelectItem value="satin">Satin</SelectItem>
                    <SelectItem value="uv_coating">UV Coating</SelectItem>
                    <SelectItem value="lamination">Lamination</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="special_requirements">Special Requirements</Label>
              <Textarea
                id="special_requirements"
                value={formData.specifications.special_requirements}
                onChange={(e) => updateFormData('specifications.special_requirements', e.target.value)}
                placeholder="Any special printing requirements, color matching, etc."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting || createOrderMutation.isPending}
            className="min-w-[200px]"
          >
            {isSubmitting || createOrderMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Order...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Punch Order
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};