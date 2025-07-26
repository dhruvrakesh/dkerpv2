import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Edit, Plus, ArrowUp, ArrowDown, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Constrained stage types that are allowed
const STAGE_TYPES = [
  { value: 'punching', label: 'Order Punching' },
  { value: 'printing', label: 'Gravure Printing' },
  { value: 'lamination', label: 'Lamination Coating' },
  { value: 'coating', label: 'Adhesive Coating' },
  { value: 'slitting_packaging', label: 'Slitting Packaging' },
  { value: 'rework', label: 'Rework' }
];

interface StageFormData {
  stage_name: string;
  stage_type: string;
  sequence_order: number;
  is_active: boolean;
}

export function StageManagementInterface() {
  const [showDialog, setShowDialog] = useState(false);
  const [editingStage, setEditingStage] = useState<any>(null);
  const [formData, setFormData] = useState<StageFormData>({
    stage_name: '',
    stage_type: '',
    sequence_order: 1,
    is_active: true
  });

  const queryClient = useQueryClient();

  // Fetch workflow stages
  const { data: stages = [], isLoading } = useQuery({
    queryKey: ['workflow-stages-management'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dkegl_workflow_stages')
        .select('*')
        .order('sequence_order');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Update stage mutation
  const updateStageMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase
        .from('dkegl_workflow_stages')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-stages-management'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-stages'] });
      toast({
        title: "Success",
        description: "Stage updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update stage",
        variant: "destructive"
      });
    }
  });

  // Create stage mutation
  const createStageMutation = useMutation({
    mutationFn: async (stageData: StageFormData) => {
      const { error } = await supabase
        .from('dkegl_workflow_stages')
        .insert({
          ...stageData,
          organization_id: '6f29896c-fd64-417e-86d6-ee8e00a4a072', // DKEGL org ID
          stage_order: stageData.sequence_order,
          stage_config: {
            material_categories: getDefaultMaterialCategories(stageData.stage_type)
          }
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-stages-management'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-stages'] });
      setShowDialog(false);
      setFormData({
        stage_name: '',
        stage_type: '',
        sequence_order: 1,
        is_active: true
      });
      toast({
        title: "Success",
        description: "Stage created successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create stage",
        variant: "destructive"
      });
    }
  });

  const getDefaultMaterialCategories = (stageType: string): string[] => {
    switch (stageType) {
      case 'punching':
        return ['substrate', 'tooling', 'consumables'];
      case 'printing':
        return ['substrate', 'inks', 'solvents', 'plates', 'chemicals', 'cleaning_agents'];
      case 'lamination':
        return ['substrate', 'adhesives', 'primers', 'release_agents', 'catalysts'];
      case 'coating':
        return ['substrate', 'specialized_adhesives', 'activators', 'coating_chemicals'];
      case 'slitting_packaging':
        return ['substrate', 'cores', 'stretch_wrap', 'packaging_materials', 'labels'];
      case 'rework':
        return ['substrate', 'consumables'];
      default:
        return ['substrate', 'consumables'];
    }
  };

  const toggleStageActive = (stageId: string, isActive: boolean) => {
    updateStageMutation.mutate({
      id: stageId,
      updates: { is_active: isActive }
    });
  };

  const updateSequenceOrder = (stageId: string, newOrder: number) => {
    updateStageMutation.mutate({
      id: stageId,
      updates: { sequence_order: newOrder }
    });
  };

  const handleCreateStage = () => {
    if (!formData.stage_name || !formData.stage_type) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    createStageMutation.mutate(formData);
  };

  const getStageTypeLabel = (stageType: string) => {
    return STAGE_TYPES.find(t => t.value === stageType)?.label || stageType;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Workflow Stage Management
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the 5 core manufacturing stages and their configuration
          </p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Rework Stage
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Stage</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Stage Name</Label>
                <Input
                  value={formData.stage_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, stage_name: e.target.value }))}
                  placeholder="Enter stage name..."
                />
              </div>
              
              <div className="space-y-2">
                <Label>Stage Type</Label>
                <Select 
                  value={formData.stage_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, stage_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select stage type" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sequence Order</Label>
                <Input
                  type="number"
                  value={formData.sequence_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sequence_order: parseInt(e.target.value) }))}
                  min="1"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Active Stage</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleCreateStage} disabled={createStageMutation.isPending}>
                  {createStageMutation.isPending ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Create Stage
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage) => (
            <Card key={stage.id} className={`border-l-4 ${stage.is_active ? 'border-l-green-500' : 'border-l-gray-400'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <h4 className="font-medium">{stage.stage_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Type: {getStageTypeLabel(stage.stage_type)} • Order: {stage.sequence_order}
                      </p>
                      {stage.stage_config && typeof stage.stage_config === 'object' && 
                       (stage.stage_config as any).material_categories && (
                        <div className="flex gap-1 mt-2">
                          {((stage.stage_config as any).material_categories as string[]).map((category: string) => (
                            <Badge key={category} variant="outline" className="text-xs">
                              {category}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateSequenceOrder(stage.id, Math.max(1, stage.sequence_order - 1))}
                      disabled={stage.sequence_order === 1}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateSequenceOrder(stage.id, stage.sequence_order + 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    
                    <Switch
                      checked={stage.is_active}
                      onCheckedChange={(checked) => toggleStageActive(stage.id, checked)}
                    />
                    
                    <Badge variant={stage.is_active ? "default" : "secondary"}>
                      {stage.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Core Manufacturing Stages</h4>
          <p className="text-sm text-muted-foreground mb-3">
            The system is constrained to these 5 core stages to ensure proper material flow and cost accounting:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {STAGE_TYPES.slice(0, 5).map(type => (
              <Badge key={type.value} variant="outline" className="justify-center">
                {type.label}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Additional rework stages can be created as needed for quality control processes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}