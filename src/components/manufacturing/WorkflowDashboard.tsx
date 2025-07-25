import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  ClipboardList, 
  Factory, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Play,
  Pause,
  Eye,
  ArrowRight,
  PauseCircle
} from 'lucide-react';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';

interface WorkflowStage {
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
  stage: WorkflowStage;
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

export const WorkflowDashboard = () => {
  const { organization } = useDKEGLAuth();
  const [activeView, setActiveView] = useState('all');
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
      return data as WorkflowStage[];
    },
    enabled: !!organization?.id,
  });

  // Mutation for progressing to next stage
  const progressToNextStage = useMutation({
    mutationFn: async ({ orderId, currentStageId }: { orderId: string; currentStageId?: string }) => {
      if (!organization?.id) throw new Error('No organization found');

      // Call workflow automation edge function
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
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Play className="h-4 w-4 text-primary" />;
      case 'on_hold':
        return <Pause className="h-4 w-4 text-yellow-600" />;
      case 'cancelled':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'pending': 'secondary',
      'in_progress': 'default',
      'completed': 'default',
      'on_hold': 'outline',
      'cancelled': 'destructive',
    } as const;

    const colors = {
      'pending': 'text-muted-foreground',
      'in_progress': 'text-primary-foreground',
      'completed': 'text-green-700 bg-green-100 border-green-300',
      'on_hold': 'text-yellow-700 bg-yellow-100 border-yellow-300',
      'cancelled': 'text-destructive-foreground',
    } as const;

    return (
      <Badge 
        variant={variants[status as keyof typeof variants] || 'secondary'}
        className={status === 'completed' || status === 'on_hold' ? colors[status as keyof typeof colors] : undefined}
      >
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
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

  const filteredOrders = orders?.filter(order => {
    if (activeView === 'all') return true;
    if (activeView === 'active') return ['draft', 'in_production', 'quality_review'].includes(order.status);
    if (activeView === 'completed') return order.status === 'completed';
    if (activeView === 'blocked') return order.status === 'on_hold';
    return true;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manufacturing Workflow</h1>
          <p className="text-muted-foreground">
            Track and manage manufacturing orders through production stages
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <ClipboardList className="mr-2 h-4 w-4" />
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
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Factory className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Orders Found</h3>
                <p className="text-muted-foreground text-center">
                  No manufacturing orders match the current filter.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => {
              const overallProgress = calculateOverallProgress(order.workflow_progress);
              
              return (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <span>UIORN: {order.uiorn}</span>
                          {getPriorityBadge(order.priority_level)}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {order.item_name} • Qty: {order.order_quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(order.status)}
                        {order.delivery_date && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Due: {new Date(order.delivery_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Overall Progress</span>
                        <span>{Math.round(overallProgress)}%</span>
                      </div>
                      <Progress value={overallProgress} className="h-2" />
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Production Stages</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {stages?.map((stage) => {
                          const stageProgress = order.workflow_progress.find(
                            p => p.stage_id === stage.id
                          );
                          
                          return (
                            <div
                              key={stage.id}
                              className="flex items-center space-x-3 p-3 rounded-lg border bg-card"
                            >
                              {getStatusIcon(stageProgress?.status || 'pending')}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {stage.stage_name}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    {stageProgress?.status?.replace('_', ' ') || 'Pending'}
                                  </span>
                                  {stageProgress?.progress_percentage !== undefined && (
                                    <span className="text-xs font-medium">
                                      {stageProgress.progress_percentage}%
                                    </span>
                                  )}
                                </div>
                                {stageProgress?.assigned_to && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    Assigned to: {stageProgress.assigned_to}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t">
                      <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="default"
                            onClick={() => progressToNextStage.mutate({ orderId: order.id })}
                            disabled={progressToNextStage.isPending || order.status === 'completed'}
                          >
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Next Stage
                          </Button>
                          
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              // Find in-progress stage and pause it
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
                            <PauseCircle className="mr-2 h-4 w-4" />
                            Hold
                          </Button>

                          <Button size="sm" variant="outline">
                            <Eye className="mr-2 h-4 w-4" />
                            Details
                          </Button>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          Order #{order.order_number}
                        </div>
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