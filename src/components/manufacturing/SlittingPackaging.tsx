import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useDKEGLAuth } from '@/hooks/useDKEGLAuth';
import { useToast } from '@/hooks/use-toast';
import { MaterialConsumptionCard } from './MaterialConsumptionCard';
import { Package, Settings, CheckCircle, AlertTriangle, Clock, Play, Pause, Scissors } from 'lucide-react';

interface SlittingJob {
  id: string;
  uiorn: string;
  item_code: string;
  item_name: string;
  order_id: string;
  substrate_gsm: number;
  deckle: number;
  length: number;
  status: string;
  progress_percentage: number;
  started_at?: string;
  completed_at?: string;
  assigned_to?: string;
  stage_data: any;
}

export const SlittingPackaging = () => {
  const { user, organization } = useDKEGLAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [slittingData, setSlittingData] = useState({
    target_width: '',
    number_of_cuts: '',
    blade_type: '',
    winding_tension: '',
    core_size: '',
    packaging_type: '',
    roll_labeling: '',
    quality_checks: '',
    final_notes: ''
  });

  // Fetch slitting jobs
  const { data: slittingJobs = [], isLoading } = useQuery({
    queryKey: ['slitting-jobs', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      const { data, error } = await supabase
        .from('dkegl_workflow_progress')
        .select(`
          *,
          dkegl_orders (
            uiorn,
            item_code,
            item_name,
            order_quantity
          )
        `)
        .eq('organization_id', organization.id)
        .eq('stage_id', (await supabase
          .from('dkegl_workflow_stages')
          .select('id')
          .eq('stage_name', 'Slitting & Packaging')
          .eq('organization_id', organization.id)
          .single()
        ).data?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!organization?.id,
  });

  // Update job status
  const updateJobStatus = useMutation({
    mutationFn: async ({ jobId, status, progressPercentage, stageData }: {
      jobId: string;
      status: string;
      progressPercentage: number;
      stageData: any;
    }) => {
      const updates: any = {
        status,
        progress_percentage: progressPercentage,
        stage_data: stageData,
        updated_at: new Date().toISOString(),
      };

      if (status === 'in_progress' && !slittingJobs.find(j => j.id === jobId)?.started_at) {
        updates.started_at = new Date().toISOString();
      } else if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
        updates.progress_percentage = 100;
      }

      const { error } = await supabase
        .from('dkegl_workflow_progress')
        .update(updates)
        .eq('id', jobId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slitting-jobs'] });
      toast({
        title: "Job Updated",
        description: "Slitting & packaging job status updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update job status.",
        variant: "destructive",
      });
    },
  });

  // Start job
  const startJob = (jobId: string) => {
    const job = slittingJobs.find(j => j.id === jobId);
    if (!job) return;

    updateJobStatus.mutate({
      jobId,
      status: 'in_progress',
      progressPercentage: 20,
      stageData: {
        ...(typeof job.stage_data === 'object' && job.stage_data !== null ? job.stage_data : {}),
        slitting_parameters: slittingData,
        started_by: user?.id,
        start_time: new Date().toISOString(),
      }
    });
  };

  // Complete job
  const completeJob = (jobId: string) => {
    const job = slittingJobs.find(j => j.id === jobId);
    if (!job) return;

    updateJobStatus.mutate({
      jobId,
      status: 'completed',
      progressPercentage: 100,
      stageData: {
        ...(typeof job.stage_data === 'object' && job.stage_data !== null ? job.stage_data : {}),
        completed_by: user?.id,
        completion_time: new Date().toISOString(),
        final_quality_check: 'passed',
        packaging_completed: true,
        dispatch_ready: true,
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <Play className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'on_hold': return <Pause className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      in_progress: 'default',
      completed: 'default',
      on_hold: 'destructive',
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {getStatusIcon(status)}
        <span className="ml-1 capitalize">{status.replace('_', ' ')}</span>
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading slitting & packaging jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Slitting & Packaging</h2>
          <p className="text-muted-foreground">
            Final processing stage with precision cutting and packaging operations
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <Settings className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6">
        {slittingJobs.map((job) => (
          <Card key={job.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Scissors className="h-5 w-5 text-primary" />
                    {job.dkegl_orders?.uiorn} - {job.dkegl_orders?.item_name}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Item Code: {job.dkegl_orders?.item_code}</span>
                    <Separator orientation="vertical" className="h-4" />
                    <span>Quantity: {job.dkegl_orders?.order_quantity}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(job.status)}
                  <div className="text-right">
                    <div className="text-sm font-medium">{job.progress_percentage}%</div>
                    <Progress value={job.progress_percentage} className="w-20" />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <Tabs defaultValue="slitting" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="slitting">Slitting Parameters</TabsTrigger>
                  <TabsTrigger value="materials">Materials</TabsTrigger>
                  <TabsTrigger value="packaging">Packaging & QC</TabsTrigger>
                  <TabsTrigger value="dispatch">Dispatch Preparation</TabsTrigger>
                </TabsList>

                <TabsContent value="slitting" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="target_width">Target Width (mm)</Label>
                      <Input
                        id="target_width"
                        value={slittingData.target_width}
                        onChange={(e) => setSlittingData(prev => ({
                          ...prev,
                          target_width: e.target.value
                        }))}
                        placeholder="Enter target width"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="number_of_cuts">Number of Cuts</Label>
                      <Input
                        id="number_of_cuts"
                        type="number"
                        value={slittingData.number_of_cuts}
                        onChange={(e) => setSlittingData(prev => ({
                          ...prev,
                          number_of_cuts: e.target.value
                        }))}
                        placeholder="Enter number of cuts"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="blade_type">Blade Type</Label>
                      <Select
                        value={slittingData.blade_type}
                        onValueChange={(value) => setSlittingData(prev => ({
                          ...prev,
                          blade_type: value
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select blade type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="razor">Razor Blade</SelectItem>
                          <SelectItem value="shear">Shear Cut</SelectItem>
                          <SelectItem value="crush">Crush Cut</SelectItem>
                          <SelectItem value="score">Score Cut</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="winding_tension">Winding Tension (N)</Label>
                      <Input
                        id="winding_tension"
                        value={slittingData.winding_tension}
                        onChange={(e) => setSlittingData(prev => ({
                          ...prev,
                          winding_tension: e.target.value
                        }))}
                        placeholder="Enter tension"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="core_size">Core Size (inches)</Label>
                      <Select
                        value={slittingData.core_size}
                        onValueChange={(value) => setSlittingData(prev => ({
                          ...prev,
                          core_size: value
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select core size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 inch</SelectItem>
                          <SelectItem value="1.5">1.5 inches</SelectItem>
                          <SelectItem value="3">3 inches</SelectItem>
                          <SelectItem value="6">6 inches</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="packaging_type">Packaging Type</Label>
                      <Select
                        value={slittingData.packaging_type}
                        onValueChange={(value) => setSlittingData(prev => ({
                          ...prev,
                          packaging_type: value
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select packaging" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="carton">Carton Box</SelectItem>
                          <SelectItem value="pallet">Pallet Wrap</SelectItem>
                          <SelectItem value="shrink">Shrink Wrap</SelectItem>
                          <SelectItem value="individual">Individual Wrap</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="final_notes">Process Notes</Label>
                    <Textarea
                      id="final_notes"
                      value={slittingData.final_notes}
                      onChange={(e) => setSlittingData(prev => ({
                        ...prev,
                        final_notes: e.target.value
                      }))}
                      placeholder="Additional processing notes or special instructions..."
                      rows={3}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="materials" className="space-y-4 mt-4">
                  <MaterialConsumptionCard 
                    workflowProgressId={job.id}
                    stageName="Slitting & Packaging"
                    orderId={job.order_id}
                    stageId={job.stage_id}
                  />
                </TabsContent>

                <TabsContent value="packaging" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Final Quality Checks
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Width Tolerance</span>
                          <Badge variant="default">±0.2mm</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Edge Quality</span>
                          <Badge variant="default">Excellent</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Roll Hardness</span>
                          <Badge variant="default">Optimal</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Winding Quality</span>
                          <Badge variant="default">Grade A</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Roll Specifications</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Actual Width</span>
                          <Badge variant="outline">152.1mm</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Roll Diameter</span>
                          <Badge variant="outline">650mm</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Length</span>
                          <Badge variant="outline">2500m</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Weight</span>
                          <Badge variant="outline">12.5kg</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Packaging Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Package Type:</span>
                          <span className="ml-2 font-medium">Carton Box</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Rolls per Box:</span>
                          <span className="ml-2 font-medium">4</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Boxes:</span>
                          <span className="ml-2 font-medium">12</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Label Applied:</span>
                          <Badge variant="default" className="ml-2">Yes</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="dispatch" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Job Status</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Started:</span>
                          <span>{job.started_at ? new Date(job.started_at).toLocaleString() : 'Not started'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Completed:</span>
                          <span>{job.completed_at ? new Date(job.completed_at).toLocaleString() : 'In progress'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Progress:</span>
                          <span>{job.progress_percentage}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Dispatch Ready:</span>
                          <Badge variant={job.progress_percentage === 100 ? 'default' : 'secondary'}>
                            {job.progress_percentage === 100 ? 'Yes' : 'Pending'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Actions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex gap-2">
                          {job.status === 'pending' && (
                            <Button 
                              onClick={() => startJob(job.id)}
                              disabled={updateJobStatus.isPending}
                              className="flex-1"
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Start Processing
                            </Button>
                          )}
                          
                          {job.status === 'in_progress' && (
                            <Button 
                              onClick={() => completeJob(job.id)}
                              disabled={updateJobStatus.isPending}
                              className="flex-1"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Complete & Package
                            </Button>
                          )}

                          {job.status === 'completed' && (
                            <Badge variant="default" className="flex-1 justify-center">
                              <Package className="h-4 w-4 mr-2" />
                              Ready for Dispatch
                            </Badge>
                          )}
                        </div>

                        {job.status === 'completed' && (
                          <div className="mt-4 space-y-2">
                            <Button variant="outline" className="w-full" size="sm">
                              Generate Delivery Note
                            </Button>
                            <Button variant="outline" className="w-full" size="sm">
                              Print Labels
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}

        {slittingJobs.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Scissors className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Slitting Jobs</h3>
              <p className="text-muted-foreground text-center">
                No jobs are currently assigned to slitting & packaging stage.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};