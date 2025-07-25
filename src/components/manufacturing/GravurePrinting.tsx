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
import { useQualityEnforcement } from '@/hooks/useQualityEnforcement';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { Printer, Settings, CheckCircle, AlertTriangle, Clock, Play, Pause, Shield } from 'lucide-react';

interface GravureJob {
  id: string;
  uiorn: string;
  item_code: string;
  item_name: string;
  order_id: string;
  substrate_gsm: number;
  deckle: number;
  length: number;
  number_colours: number;
  setup_parameters: any;
  quality_checks: any[];
  status: string;
  progress_percentage: number;
  started_at?: string;
  completed_at?: string;
  assigned_to?: string;
  stage_data: any;
}

export const GravurePrinting = () => {
  const { user, organization } = useDKEGLAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { checkStageQualityStatus, createQualityCheckpoint } = useQualityEnforcement();
  
  // Enable real-time updates for workflow progress
  useRealtimeUpdates({
    enableWorkflowProgress: true,
    enableQualityInspections: true,
  });
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [setupData, setSetupData] = useState({
    cylinder_pressure: '',
    ink_viscosity: '',
    printing_speed: '',
    tension_control: '',
    registration_marks: '',
    color_sequence: '',
    setup_notes: ''
  });

  // Fetch gravure printing jobs
  const { data: gravureJobs = [], isLoading } = useQuery({
    queryKey: ['gravure-jobs', organization?.id],
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
          .eq('stage_name', 'Gravure Printing')
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

      if (status === 'in_progress' && !gravureJobs.find(j => j.id === jobId)?.started_at) {
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
      queryClient.invalidateQueries({ queryKey: ['gravure-jobs'] });
      toast({
        title: "Job Updated",
        description: "Gravure printing job status updated successfully.",
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

  // Start job with quality enforcement
  const startJob = async (jobId: string) => {
    const job = gravureJobs.find(j => j.id === jobId);
    if (!job) return;

    try {
      // Check quality status before starting
      await checkStageQualityStatus.mutateAsync({ 
        stageId: job.stage_id, 
        orderId: job.order_id 
      });

      updateJobStatus.mutate({
        jobId,
        status: 'in_progress',
        progressPercentage: 10,
        stageData: {
          ...(typeof job.stage_data === 'object' && job.stage_data !== null ? job.stage_data : {}),
          setup_parameters: setupData,
          started_by: user?.id,
          start_time: new Date().toISOString(),
        }
      });
    } catch (error: any) {
      // Quality enforcement will show appropriate toast
      if (error.message === 'QUALITY_CHECKPOINT_REQUIRED') {
        // Create quality checkpoint automatically
        await createQualityCheckpoint.mutateAsync({
          stageId: job.stage_id,
          orderId: job.order_id,
          checkType: 'pre_stage'
        });
      }
    }
  };

  // Complete job with quality checkpoint creation
  const completeJob = async (jobId: string) => {
    const job = gravureJobs.find(j => j.id === jobId);
    if (!job) return;

    // Create post-stage quality checkpoint
    await createQualityCheckpoint.mutateAsync({
      stageId: job.stage_id,
      orderId: job.order_id,
      checkType: 'post_stage'
    });

    updateJobStatus.mutate({
      jobId,
      status: 'completed',
      progressPercentage: 100,
      stageData: {
        ...(typeof job.stage_data === 'object' && job.stage_data !== null ? job.stage_data : {}),
        completed_by: user?.id,
        completion_time: new Date().toISOString(),
        final_quality_check: 'pending_inspection',
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
          <p className="text-muted-foreground">Loading gravure printing jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gravure Printing</h2>
          <p className="text-muted-foreground">
            Manage gravure printing operations with setup parameters and quality control
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <Settings className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6">
        {gravureJobs.map((job) => (
          <Card key={job.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Printer className="h-5 w-5 text-primary" />
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
              <Tabs defaultValue="setup" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="setup">Setup Parameters</TabsTrigger>
                  <TabsTrigger value="progress">Progress Tracking</TabsTrigger>
                  <TabsTrigger value="quality">Quality Control</TabsTrigger>
                </TabsList>

                <TabsContent value="setup" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cylinder_pressure">Cylinder Pressure (PSI)</Label>
                      <Input
                        id="cylinder_pressure"
                        value={setupData.cylinder_pressure}
                        onChange={(e) => setSetupData(prev => ({
                          ...prev,
                          cylinder_pressure: e.target.value
                        }))}
                        placeholder="Enter pressure"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ink_viscosity">Ink Viscosity (sec)</Label>
                      <Input
                        id="ink_viscosity"
                        value={setupData.ink_viscosity}
                        onChange={(e) => setSetupData(prev => ({
                          ...prev,
                          ink_viscosity: e.target.value
                        }))}
                        placeholder="Enter viscosity"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="printing_speed">Printing Speed (m/min)</Label>
                      <Input
                        id="printing_speed"
                        value={setupData.printing_speed}
                        onChange={(e) => setSetupData(prev => ({
                          ...prev,
                          printing_speed: e.target.value
                        }))}
                        placeholder="Enter speed"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tension_control">Tension Control</Label>
                      <Select
                        value={setupData.tension_control}
                        onValueChange={(value) => setSetupData(prev => ({
                          ...prev,
                          tension_control: value
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select tension" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low (10-20N)</SelectItem>
                          <SelectItem value="medium">Medium (20-40N)</SelectItem>
                          <SelectItem value="high">High (40-60N)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="color_sequence">Color Sequence</Label>
                      <Input
                        id="color_sequence"
                        value={setupData.color_sequence}
                        onChange={(e) => setSetupData(prev => ({
                          ...prev,
                          color_sequence: e.target.value
                        }))}
                        placeholder="e.g., C-M-Y-K"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="registration_marks">Registration Marks</Label>
                      <Select
                        value={setupData.registration_marks}
                        onValueChange={(value) => setSetupData(prev => ({
                          ...prev,
                          registration_marks: value
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select marks" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cross">Cross Marks</SelectItem>
                          <SelectItem value="circle">Circle Marks</SelectItem>
                          <SelectItem value="square">Square Marks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="setup_notes">Setup Notes</Label>
                    <Textarea
                      id="setup_notes"
                      value={setupData.setup_notes}
                      onChange={(e) => setSetupData(prev => ({
                        ...prev,
                        setup_notes: e.target.value
                      }))}
                      placeholder="Additional setup instructions or notes..."
                      rows={3}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="progress" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Job Timeline</CardTitle>
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
                              disabled={updateJobStatus.isPending || checkStageQualityStatus.isPending}
                              className="flex-1"
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Start Job
                            </Button>
                          )}
                          
                          {job.status === 'in_progress' && (
                            <Button 
                              onClick={() => completeJob(job.id)}
                              disabled={updateJobStatus.isPending || createQualityCheckpoint.isPending}
                              className="flex-1"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Complete
                            </Button>
                          )}

                          {job.status === 'completed' && (
                            <div className="flex gap-2 flex-1">
                              <Badge variant="default" className="flex-1 justify-center">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Completed
                              </Badge>
                              <Button variant="outline" size="sm">
                                <Shield className="h-4 w-4 mr-2" />
                                Quality
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="quality" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Quality Parameters</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Print Registration</span>
                          <Badge variant="default">Within Tolerance</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Color Consistency</span>
                          <Badge variant="default">Approved</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Print Density</span>
                          <Badge variant="destructive">Under Review</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Surface Quality</span>
                          <Badge variant="default">Excellent</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Defect Tracking</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                          No defects recorded for this job.
                        </div>
                        <Button variant="outline" size="sm" className="w-full">
                          Record Defect
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}

        {gravureJobs.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Printer className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Gravure Printing Jobs</h3>
              <p className="text-muted-foreground text-center">
                No jobs are currently assigned to gravure printing stage.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};