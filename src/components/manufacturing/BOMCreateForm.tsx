import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Save, X, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { EnterpriseItemSelector, ItemOption } from '@/components/ui/enterprise-item-selector';
import { useBOMManagement } from '@/hooks/useBOMManagement';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const bomComponentSchema = z.object({
  item_code: z.string().min(1, 'Item code is required'),
  quantity_required: z.number().min(0.001, 'Quantity must be greater than 0'),
  stage_name: z.string().min(1, 'Stage is required'),
  stage_id: z.string().optional(),
  waste_percentage: z.number().min(0).max(100, 'Waste % must be 0-100'),
  notes: z.string().optional()
});

const bomSchema = z.object({
  item_code: z.string().min(1, 'Item code is required'),
  bom_name: z.string().min(1, 'BOM name is required'),
  bom_type: z.enum(['standard', 'phantom', 'template']),
  effective_from: z.string().min(1, 'Effective date is required'),
  effective_until: z.string().optional(),
  is_active: z.boolean(),
  approval_status: z.enum(['draft', 'pending', 'approved']),
  description: z.string().optional(),
  components: z.array(bomComponentSchema).min(1, 'At least one component is required')
});

type BOMFormData = z.infer<typeof bomSchema>;

interface BOMCreateFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}


export function BOMCreateForm({ initialData, onSuccess, onCancel }: BOMCreateFormProps) {
  const queryClient = useQueryClient();
  const { createBOM, isCreatingBOM } = useBOMManagement();

  // Fetch workflow stages dynamically
  const { data: workflowStages = [], isLoading: loadingStages } = useQuery({
    queryKey: ['workflow-stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dkegl_workflow_stages')
        .select('id, stage_name, sequence_order, stage_type, stage_config')
        .eq('is_active', true)
        .order('sequence_order');
      
      if (error) {
        console.error('Error fetching workflow stages:', error);
        throw error;
      }
      return data || [];
    }
  });

  // Fetch items for selectors
  const { data: finishedGoods = [], isLoading: loadingFG } = useQuery({
    queryKey: ['finished-goods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dkegl_item_master')
        .select(`
          id, item_code, item_name, uom,
          dkegl_categories(category_name)
        `)
        .eq('item_type', 'finished_good')
        .eq('status', 'active')
        .order('item_code');
      
      if (error) throw error;
      return data.map(item => ({
        id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        uom: item.uom,
        category_name: item.dkegl_categories?.category_name
      })) as ItemOption[];
    }
  });

  const { data: rawMaterials = [], isLoading: loadingRM } = useQuery({
    queryKey: ['raw-materials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dkegl_item_master')
        .select(`
          id, item_code, item_name, uom,
          dkegl_categories(category_name)
        `)
        .eq('item_type', 'raw_material')
        .eq('status', 'active')
        .order('item_code');
      
      if (error) throw error;
      return data.map(item => ({
        id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        uom: item.uom,
        category_name: item.dkegl_categories?.category_name
      })) as ItemOption[];
    }
  });

  const form = useForm<BOMFormData>({
    resolver: zodResolver(bomSchema),
    defaultValues: {
      item_code: '',
      bom_name: '',
      bom_type: 'standard',
      effective_from: new Date().toISOString().split('T')[0],
      effective_until: '',
      is_active: true,
      approval_status: 'draft',
      description: '',
      components: [
        {
          item_code: '',
          quantity_required: 1,
          stage_name: '',
          stage_id: '',
          waste_percentage: 0,
          notes: ''
        }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'components'
  });

  // Load initial data if editing
  useEffect(() => {
    if (initialData) {
      form.reset({
        item_code: initialData.item_code,
        bom_name: initialData.bom_name || '',
        bom_type: initialData.bom_type || 'standard',
        effective_from: initialData.effective_from || new Date().toISOString().split('T')[0],
        effective_until: initialData.effective_until || '',
        is_active: initialData.is_active ?? true,
        approval_status: initialData.approval_status || 'draft',
        description: initialData.description || '',
        components: initialData.components || [
          {
            item_code: '',
            quantity_required: 1,
            stage_name: '',
            stage_id: '',
            waste_percentage: 0,
            notes: ''
          }
        ]
      });
    }
  }, [initialData, form]);


  const onSubmit = async (data: BOMFormData) => {
    try {
      await createBOM({
        itemCode: data.item_code,
        bomVersion: '1.0',
        bomData: {
          bom_name: data.bom_name,
          bom_type: data.bom_type,
          effective_from: data.effective_from,
          effective_until: data.effective_until || null,
          is_active: data.is_active,
          approval_status: data.approval_status,
          description: data.description
        },
        components: data.components.map((comp, index) => ({
          component_item_code: comp.item_code,
          quantity_per_unit: comp.quantity_required,
          stage_id: comp.stage_id,
          waste_percentage: comp.waste_percentage,
          stage_sequence: index + 1,
          component_notes: comp.notes || '',
          uom: 'PCS',
          consumption_type: 'direct' as const,
          is_critical: false
        }))
      });

      await queryClient.invalidateQueries({ queryKey: ['boms'] });
      
      toast({
        title: "Success",
        description: `BOM ${initialData ? 'updated' : 'created'} successfully`
      });
      
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${initialData ? 'update' : 'create'} BOM`,
        variant: "destructive"
      });
    }
  };

  const addComponent = () => {
    const firstStage = workflowStages[0];
    append({
      item_code: '',
      quantity_required: 1,
      stage_name: firstStage?.stage_name || '',
      stage_id: firstStage?.id || '',
      waste_percentage: 0,
      notes: ''
    });
  };

  if (loadingFG || loadingRM || loadingStages) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      {/* BOM Header */}
      <Card>
        <CardHeader>
          <CardTitle>BOM Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item_code">Finished Good Item</Label>
              <EnterpriseItemSelector
                items={finishedGoods}
                value={form.watch('item_code')}
                onValueChange={(value) => form.setValue('item_code', value)}
                placeholder="Select finished good..."
                className="w-full"
              />
              {form.formState.errors.item_code && (
                <p className="text-sm text-destructive">{form.formState.errors.item_code.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bom_name">BOM Name</Label>
              <Input
                {...form.register('bom_name')}
                placeholder="Enter BOM name..."
              />
              {form.formState.errors.bom_name && (
                <p className="text-sm text-destructive">{form.formState.errors.bom_name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bom_type">BOM Type</Label>
              <Select value={form.watch('bom_type')} onValueChange={(value) => form.setValue('bom_type', value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="phantom">Phantom</SelectItem>
                  <SelectItem value="template">Template</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="effective_from">Effective From</Label>
              <Input
                type="date"
                {...form.register('effective_from')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="effective_until">Effective Until</Label>
              <Input
                type="date"
                {...form.register('effective_until')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="approval_status">Status</Label>
              <Select value={form.watch('approval_status')} onValueChange={(value) => form.setValue('approval_status', value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 pt-6">
              <Switch
                checked={form.watch('is_active')}
                onCheckedChange={(checked) => form.setValue('is_active', checked)}
              />
              <Label>Active BOM</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              {...form.register('description')}
              placeholder="Enter BOM description..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Components */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Components</CardTitle>
          <Button type="button" onClick={addComponent} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Component
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <Card key={field.id} className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Component {index + 1}</h4>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>Material Item</Label>
                    <EnterpriseItemSelector
                      items={rawMaterials}
                      value={form.watch(`components.${index}.item_code`)}
                      onValueChange={(value) => form.setValue(`components.${index}.item_code`, value)}
                      placeholder="Select material..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Stage</Label>
                    <Select 
                      value={form.watch(`components.${index}.stage_name`)} 
                      onValueChange={(value) => {
                        form.setValue(`components.${index}.stage_name`, value);
                        // Also update the stage_id
                        const selectedStage = workflowStages.find(s => s.stage_name === value);
                        if (selectedStage) {
                          form.setValue(`components.${index}.stage_id`, selectedStage.id);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingStages ? (
                          <SelectItem value="loading" disabled>Loading stages...</SelectItem>
                        ) : (
                          workflowStages.map(stage => {
                            const stageConfig = stage.stage_config as any;
                            return (
                              <SelectItem key={stage.id} value={stage.stage_name}>
                                {stage.stage_name}
                                {stageConfig?.material_categories && Array.isArray(stageConfig.material_categories) && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({stageConfig.material_categories.join(', ')})
                                  </span>
                                )}
                              </SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>Quantity Required</Label>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="Enter quantity per unit..."
                      {...form.register(`components.${index}.quantity_required`, { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Waste Percentage (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="Enter waste %..."
                      {...form.register(`components.${index}.waste_percentage`, { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input
                    {...form.register(`components.${index}.notes`)}
                    placeholder="Component notes..."
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={isCreatingBOM} className="gap-2">
          {isCreatingBOM ? (
            <LoadingSpinner size="sm" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {initialData ? 'Update BOM' : 'Create BOM'}
        </Button>
      </div>
    </form>
  );
}