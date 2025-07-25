import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Search,
  Package,
  ArrowRight,
  CheckCircle,
  Clock,
  Play,
  AlertCircle,
  RefreshCw,
  Eye,
  FastForward
} from 'lucide-react';

interface OrderProgress {
  id: string;
  uiorn: string;
  item_code: string;
  item_name: string;
  order_quantity: number;
  current_stage: string;
  overall_progress: number;
  status: string;
  stages: Array<{
    stage_name: string;
    status: string;
    progress_percentage: number;
    started_at?: string;
    completed_at?: string;
    sequence_order: number;
  }>;
}

export const UiornTrackingDashboard = () => {
  const { organization } = useDKEGLAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchUiorn, setSearchUiorn] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch all orders with their workflow progress
  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['order-tracking', organization?.id, searchUiorn, statusFilter],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('dkegl_orders')
        .select(`
          id,
          uiorn,
          item_code,
          item_name,
          order_quantity,
          status,
          dkegl_workflow_progress (
            id,
            stage_id,
            status,
            progress_percentage,
            started_at,
            completed_at,
            dkegl_workflow_stages (
              stage_name,
              sequence_order
            )
          )
        `)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (searchUiorn) {
        query = query.ilike('uiorn', `%${searchUiorn}%`);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform data to include workflow progress
      return data?.map(order => {
        const stages = order.dkegl_workflow_progress
          ?.map(wp => ({
            stage_name: wp.dkegl_workflow_stages?.stage_name || 'Unknown',
            status: wp.status,
            progress_percentage: wp.progress_percentage,
            started_at: wp.started_at,
            completed_at: wp.completed_at,
            sequence_order: wp.dkegl_workflow_stages?.sequence_order || 0,
          }))
          .sort((a, b) => a.sequence_order - b.sequence_order) || [];

        const currentStage = stages.find(s => s.status === 'in_progress')?.stage_name || 
                           stages.find(s => s.status === 'pending')?.stage_name ||
                           'Completed';

        const overallProgress = stages.length > 0 
          ? Math.round(stages.reduce((sum, s) => sum + s.progress_percentage, 0) / stages.length)
          : 0;

        return {
          ...order,
          current_stage: currentStage,
          overall_progress: overallProgress,
          stages,
        };
      }) || [];
    },
    enabled: !!organization?.id,
  });

  // Auto-progress to next stage
  const autoProgressMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke('workflow-automation', {
        body: {
          action: 'auto_progress_workflow',
          order_id: orderId,
          organization_id: organization?.id,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['order-tracking'] });
      toast({
        title: "Success",
        description: data.message || "Order progressed to next stage successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to progress order to next stage.",
        variant: "destructive",
      });
    },
  });

  const getStageIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <Play className="h-4 w-4 text-blue-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'on_hold': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      in_progress: 'default',
      pending: 'secondary',
      on_hold: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading UIORN tracking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">UIORN Tracking Dashboard</h2>
          <p className="text-muted-foreground">
            Track orders through the complete manufacturing workflow
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by UIORN..."
                  value={searchUiorn}
                  onChange={(e) => setSearchUiorn(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_production">In Production</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    {order.uiorn} - {order.item_name}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Item Code: {order.item_code}</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>Quantity: {order.order_quantity}</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>Current Stage: {order.current_stage}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(order.status)}
                  <div className="text-right">
                    <div className="text-sm font-medium">{order.overall_progress}%</div>
                    <Progress value={order.overall_progress} className="w-20" />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Workflow Progress */}
              <div className="space-y-4">
                <h4 className="font-medium">Workflow Progress</h4>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {order.stages.map((stage, index) => (
                    <React.Fragment key={`${stage.stage_name}-${stage.sequence_order}-${index}`}>
                      <div className="flex flex-col items-center min-w-32 text-center">
                        <div className="flex items-center gap-2 mb-2">
                          {getStageIcon(stage.status)}
                          <span className="text-sm font-medium whitespace-nowrap">
                            {stage.stage_name}
                          </span>
                        </div>
                        <div className="w-full">
                          <div className="text-xs text-muted-foreground mb-1">
                            {stage.progress_percentage}%
                          </div>
                          <Progress 
                            value={stage.progress_percentage} 
                            className="w-full h-2"
                          />
                        </div>
                        {stage.started_at && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Started: {new Date(stage.started_at).toLocaleDateString()}
                          </div>
                        )}
                        {stage.completed_at && (
                          <div className="text-xs text-green-600 mt-1">
                            Completed: {new Date(stage.completed_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      
                      {index < order.stages.length - 1 && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // Navigate to detailed view
                      window.open(`/manufacturing/orders/${order.id}`, '_blank');
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                  
                  {order.overall_progress < 100 && order.status !== 'cancelled' && (
                    <Button
                      size="sm"
                      onClick={() => autoProgressMutation.mutate(order.id)}
                      disabled={autoProgressMutation.isPending}
                    >
                      <FastForward className="h-4 w-4 mr-2" />
                      Auto Progress
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {orders.length === 0 && (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <div className="text-center space-y-2">
                <Package className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">
                  {searchUiorn 
                    ? `No orders found matching "${searchUiorn}"` 
                    : 'No orders available'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};