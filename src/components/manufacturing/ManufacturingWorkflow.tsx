import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Play, 
  Pause, 
  RotateCcw,
  ArrowRight,
  Package,
  Printer,
  Layers,
  Droplets,
  Scissors,
  PauseCircle,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { toast } from 'sonner';

interface DBWorkflowStage {
  id: string;
  stage_name: string;
  stage_order: number;
  stage_type: string;
  stage_config: any;
  is_active: boolean;
}

interface WorkflowProgress {
  id: string;
  order_id: string;
  stage_id: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  stage_data: any;
  quality_status: string;
  progress_percentage: number;
  notes: string | null;
  stage: DBWorkflowStage;
}

interface Order {
  id: string;
  order_number: string;
  uiorn: string;
  item_name: string;
  order_quantity: number;
  status: string;
  priority_level: number;
  delivery_date: string | null;
  workflow_progress: WorkflowProgress[];
}

export const ManufacturingWorkflow = () => {
  const { organization } = useDKEGLAuth();
  const [activeView, setActiveView] = useState('active');
  const queryClient = useQueryClient();

  // Enable real-time updates for workflow and orders
  useRealtimeUpdates({
    enableWorkflowProgress: true,
    enableOrders: true,
  });

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['workflow-orders', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from('dkegl_orders')
        .select(`
          *,
          workflow_progress:dkegl_workflow_progress(
            *,
            stage:dkegl_workflow_stages(*)
          )
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching workflow orders:', error);
        throw error;
      }
      return data as Order[];
    },
    enabled: !!organization?.id,
  });

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
      return data as DBWorkflowStage[];
    },
    enabled: !!organization?.id,
  });

  // Mutation for progressing to next stage
  const progressToNextStage = useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      if (!organization?.id) throw new Error('No organization found');

      const { data, error } = await supabase.functions.invoke('workflow-automation', {
        body: {
          action: 'auto_progress_workflow',
          organizationId: organization.id,
          data: { orderId }
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Progressed to ${data.nextStage || 'next stage'}`);
      queryClient.invalidateQueries({ queryKey: ['workflow-orders'] });
    },
    onError: (error) => {
      toast.error(`Failed to progress workflow: ${error.message}`);
    }
  });

  // Mutation for updating stage status
  const updateStageStatus = useMutation({
    mutationFn: async ({ progressId, status, notes }: { progressId: string; status: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('dkegl_workflow_progress')
        .update({
          status,
          notes,
          updated_at: new Date().toISOString(),
          ...(status === 'in_progress' && { started_at: new Date().toISOString() }),
          ...(status === 'completed' && { 
            completed_at: new Date().toISOString(),
            progress_percentage: 100 
          }),
        })
        .eq('id', progressId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Stage status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['workflow-orders'] });
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-warning" />;
      case 'blocked': return <AlertCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="status-completed">Completed</Badge>;
      case 'in_progress': return <Badge className="status-in-progress">In Progress</Badge>;
      case 'blocked': return <Badge className="status-blocked">Blocked</Badge>;
      default: return <Badge className="status-pending">Pending</Badge>;
    }
  };

  const getPriorityBadge = (priority: number) => {
    const config = {
      1: { label: 'Low', variant: 'secondary', className: '' },
      2: { label: 'Medium', variant: 'default', className: '' },
      3: { label: 'High', variant: 'outline', className: 'text-yellow-700 bg-yellow-100 border-yellow-300' },
      4: { label: 'Critical', variant: 'destructive', className: '' },
    } as const;

    const { label, variant, className } = config[priority as keyof typeof config] || config[2];
    return (
      <Badge variant={variant} className={className || undefined}>
        {label}
      </Badge>
    );
  };

  const calculateOverallProgress = (workflowProgress: WorkflowProgress[]) => {
    if (!workflowProgress.length) return 0;
    
    const totalStages = stages?.length || 1;
    const completedStages = workflowProgress.filter(p => p.status === 'completed').length;
    const inProgressStages = workflowProgress.filter(p => p.status === 'in_progress');
    
    let progress = (completedStages / totalStages) * 100;
    
    // Add partial progress for in-progress stages
    inProgressStages.forEach(stage => {
      progress += (stage.progress_percentage / totalStages);
    });
    
    return Math.min(progress, 100);
  };

  const getStageIcon = (stageName: string) => {
    switch (stageName.toLowerCase()) {
      case 'order punching': case 'order': return Package;
      case 'gravure printing': case 'gravure': return Printer;
      case 'lamination': return Layers;
      case 'adhesive coating': case 'coating': return Droplets;
      case 'slitting': return Scissors;
      default: return Package;
    }
  };

  const filteredOrders = orders?.filter(order => {
    if (activeView === 'all') return true;
    if (activeView === 'active') return ['draft', 'in_production', 'quality_review'].includes(order.status);
    if (activeView === 'completed') return order.status === 'completed';
    if (activeView === 'blocked') return order.status === 'on_hold';
    return true;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading manufacturing workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Manufacturing Workflow</h1>
          <p className="text-muted-foreground">
            Track production progress across all manufacturing stages
          </p>
        </div>
        <Button onClick={() => refetch()}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="blocked">Blocked</TabsTrigger>
        </TabsList>

        <TabsContent value={activeView} className="space-y-4">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Orders Found</h3>
                <p className="text-muted-foreground">
                  No manufacturing orders match the current filter.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => {
              const overallProgress = calculateOverallProgress(order.workflow_progress);
              
              return (
                <Card key={order.id} className="card-enterprise">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-3">
                          <span className="font-mono text-lg">{order.uiorn}</span>
                          {getPriorityBadge(order.priority_level)}
                        </CardTitle>
                        <p className="text-muted-foreground">{order.item_name}</p>
                        <p className="text-sm text-muted-foreground">Quantity: {order.order_quantity.toLocaleString()} units</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">{Math.round(overallProgress)}%</div>
                        <div className="text-sm text-muted-foreground">Overall Progress</div>
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                    <Progress value={overallProgress} className="w-full" />
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      {/* Workflow Stages */}
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {stages?.map((stage, index) => {
                          const StageIconComponent = getStageIcon(stage.stage_name);
                          const stageProgress = order.workflow_progress.find(p => p.stage_id === stage.id);
                          const status = stageProgress?.status || 'pending';
                          
                          return (
                            <div key={stage.id} className="relative">
                              <Card className={cn(
                                "p-4 transition-all duration-200 hover:shadow-md",
                                status === 'completed' && "border-success/50 bg-success/5",
                                status === 'in_progress' && "border-warning/50 bg-warning/5",
                                status === 'blocked' && "border-destructive/50 bg-destructive/5"
                              )}>
                                <div className="flex items-center gap-3 mb-3">
                                  <StageIconComponent className={cn(
                                    "h-5 w-5",
                                    status === 'completed' && "text-success",
                                    status === 'in_progress' && "text-warning",
                                    status === 'blocked' && "text-destructive",
                                    status === 'pending' && "text-muted-foreground"
                                  )} />
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{stage.stage_name}</div>
                                    {getStatusBadge(status)}
                                  </div>
                                </div>
                                
                                {status !== 'pending' && (
                                  <div className="space-y-2">
                                    <Progress value={stageProgress?.progress_percentage || 0} className="h-2" />
                                    <div className="text-xs text-muted-foreground">
                                      {stageProgress?.progress_percentage || 0}% Complete
                                    </div>
                                    {stageProgress?.assigned_to && (
                                      <div className="text-xs text-muted-foreground">
                                        Assigned: {stageProgress.assigned_to}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Card>
                              
                              {/* Arrow connector */}
                              {index < (stages?.length || 0) - 1 && (
                                <div className="hidden md:flex absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                                  <ArrowRight className="h-4 w-4 text-muted-foreground bg-background border rounded-full p-0.5" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-4 border-t">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => progressToNextStage.mutate({ orderId: order.id })}
                          disabled={progressToNextStage.isPending || order.status === 'completed'}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start Next Stage
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const inProgressStage = order.workflow_progress.find(p => p.status === 'in_progress');
                            if (inProgressStage) {
                              updateStageStatus.mutate({
                                progressId: inProgressStage.id,
                                status: 'on_hold',
                                notes: 'Production paused by user'
                              });
                            }
                          }}
                          disabled={updateStageStatus.isPending || !order.workflow_progress.some(p => p.status === 'in_progress')}
                        >
                          <PauseCircle className="h-4 w-4 mr-2" />
                          Hold Production
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};