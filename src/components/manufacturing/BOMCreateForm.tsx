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
  item_code: z.string().min(1, 'Material is required'),
  weight_percentage: z.number().min(0.1).max(100, 'Weight % must be 0.1-100'),
  notes: z.string().optional()
});

const bomSchema = z.object({
  item_code: z.string().min(1, 'Finished good is required'),
  bom_notes: z.string().optional(),
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
      bom_notes: '',
      components: [
        {
          item_code: '',
          weight_percentage: 50,
          notes: ''
        }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'components'
  });

  // Auto-generate BOM version
  const [nextVersion, setNextVersion] = useState('1.0');
  const watchedItemCode = form.watch('item_code');

  // Get next version when item is selected
  useEffect(() => {
    const getNextVersion = async () => {
      if (watchedItemCode && !initialData) {
        const { data: existingBOMs } = await supabase
          .from('dkegl_bom_master')
          .select('bom_version')
          .eq('item_code', watchedItemCode)
          .order('bom_version', { ascending: false })
          .limit(1);
        
        if (existingBOMs && existingBOMs.length > 0) {
          const lastVersion = parseFloat(existingBOMs[0].bom_version.replace(/[^0-9.]/g, ''));
          const newVersion = (lastVersion + 0.1).toFixed(1);
          setNextVersion(newVersion);
        } else {
          setNextVersion('1.0');
        }
      }
    };

    getNextVersion();
  }, [watchedItemCode, initialData]);

  // Load initial data if editing
  useEffect(() => {
    if (initialData) {
      form.reset({
        item_code: initialData.item_code,
        bom_notes: initialData.bom_notes || '',
        components: initialData.components?.map((comp: any) => ({
          item_code: comp.item_code,
          weight_percentage: comp.weight_percentage || 50,
          notes: comp.notes || ''
        })) || [{ item_code: '', weight_percentage: 50, notes: '' }]
      });
      setNextVersion(initialData.bom_version || '1.0');
    }
  }, [initialData, form]);


  const onSubmit = async (data: BOMFormData) => {
    try {
      // Validate total weight percentage
      const totalWeight = data.components.reduce((sum, comp) => sum + comp.weight_percentage, 0);
      if (Math.abs(totalWeight - 100) > 0.1) {
        toast({
          title: "Validation Error",
          description: `Total weight percentage must equal 100% (current: ${totalWeight.toFixed(1)}%)`,
          variant: "destructive"
        });
        return;
      }

      // Check for duplicate materials
      const itemCodes = data.components.map(c => c.item_code);
      const uniqueItemCodes = new Set(itemCodes);
      if (itemCodes.length !== uniqueItemCodes.size) {
        toast({
          title: "Validation Error",
          description: "Cannot use the same material multiple times in a BOM",
          variant: "destructive"
        });
        return;
      }

      await createBOM({
        itemCode: data.item_code,
        bomVersion: nextVersion,
        bomData: {
          yield_percentage: 100,
          scrap_percentage: 0,
          bom_notes: data.bom_notes,
          approval_status: 'draft',
          effective_from: new Date().toISOString().split('T')[0],
          effective_until: null,
          is_active: true
        },
        components: data.components.map((comp, index) => ({
          component_item_code: comp.item_code,
          quantity_per_unit: comp.weight_percentage / 100, // Convert percentage to ratio
          stage_id: workflowStages[0]?.id || '', // Use first stage as default
          waste_percentage: 0,
          stage_sequence: index + 1,
          component_notes: comp.notes || '',
          uom: 'KG',
          consumption_type: 'direct' as const,
          is_critical: true
        }))
      });

      await queryClient.invalidateQueries({ queryKey: ['boms'] });
      
      toast({
        title: "Success",
        description: `BOM created successfully (Version ${nextVersion})`
      });
      
      onSuccess();
    } catch (error: any) {
      console.error('BOM creation error:', error);
      
      // Handle specific database errors
      let errorMessage = 'Failed to create BOM';
      if (error.message?.includes('uk_dkegl_bom_master_version')) {
        errorMessage = `BOM version ${nextVersion} already exists for this item. Please refresh and try again.`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const addComponent = () => {
    append({
      item_code: '',
      weight_percentage: 25,
      notes: ''
    });
  };

  // Calculate total weight percentage
  const totalWeight = form.watch('components')?.reduce((sum, comp) => sum + (comp.weight_percentage || 0), 0) || 0;

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
          <CardTitle>Weight-Based BOM Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item_code">Finished Good Product</Label>
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
              <Label>BOM Version (Auto-generated)</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Version {nextVersion}</Badge>
                <span className="text-sm text-muted-foreground">Auto-assigned</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bom_notes">Recipe Notes</Label>
            <Textarea
              {...form.register('bom_notes')}
              placeholder="Enter recipe notes, special instructions, or specifications..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Material Components */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Material Composition by Weight
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Define what percentage each material contributes to the total weight
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={Math.abs(totalWeight - 100) < 0.1 ? "default" : "destructive"}>
              Total: {totalWeight.toFixed(1)}%
            </Badge>
            <Button type="button" onClick={addComponent} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Material
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => {
            const currentWeight = form.watch(`components.${index}.weight_percentage`) || 0;
            return (
              <Card key={field.id} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Material {index + 1}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{currentWeight}%</Badge>
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
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Raw Material</Label>
                      <EnterpriseItemSelector
                        items={rawMaterials}
                        value={form.watch(`components.${index}.item_code`)}
                        onValueChange={(value) => form.setValue(`components.${index}.item_code`, value)}
                        placeholder="Select material..."
                      />
                      {form.formState.errors.components?.[index]?.item_code && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.components[index]?.item_code?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Weight Percentage (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="100"
                        placeholder="% of total weight"
                        {...form.register(`components.${index}.weight_percentage`, { valueAsNumber: true })}
                      />
                      {form.formState.errors.components?.[index]?.weight_percentage && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.components[index]?.weight_percentage?.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label>Material Notes</Label>
                    <Input
                      {...form.register(`components.${index}.notes`)}
                      placeholder="Special handling, supplier info, etc..."
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {Math.abs(totalWeight - 100) > 0.1 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Total weight percentage must equal 100%. 
                Current total: <strong>{totalWeight.toFixed(1)}%</strong>
                {totalWeight < 100 ? ` (${(100 - totalWeight).toFixed(1)}% remaining)` : ` (${(totalWeight - 100).toFixed(1)}% over)`}
              </p>
            </div>
          )}
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