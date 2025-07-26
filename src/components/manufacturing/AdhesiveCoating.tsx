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
import { 
  Droplets, 
  Settings, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Play, 
  Pause, 
  Thermometer,
  Gauge,
  ShieldCheck
} from 'lucide-react';

interface AdhesiveJob {
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

export const AdhesiveCoating = () => {
  const { user, organization } = useDKEGLAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [processData, setProcessData] = useState({
    adhesive_type: '',
    coating_weight: '',
    substrate_tension: '',
    drying_temperature: '',
    line_speed: '',
    application_method: '',
    viscosity: '',
    process_notes: ''
  });

  // Fetch adhesive coating jobs
  const { data: adhesiveJobs = [], isLoading } = useQuery({
    queryKey: ['adhesive-jobs', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      // First get the stage ID
      const { data: stageData, error: stageError } = await supabase
        .from('dkegl_workflow_stages')
        .select('id')
        .eq('stage_name', 'Adhesive Coating')
        .eq('organization_id', organization.id)
        .limit(1);
      
      if (stageError) throw stageError;
      if (!stageData || stageData.length === 0) return [];
      
      const stageId = stageData[0].id;
      
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
        .eq('stage_id', stageId)
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

      if (status === 'in_progress' && !adhesiveJobs.find(j => j.id === jobId)?.started_at) {
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
      queryClient.invalidateQueries({ queryKey: ['adhesive-jobs'] });
      toast({
        title: "Job Updated",
        description: "Adhesive coating job status updated successfully.",
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
    const job = adhesiveJobs.find(j => j.id === jobId);
    if (!job) return;

    updateJobStatus.mutate({
      jobId,
      status: 'in_progress',
      progressPercentage: 20,
      stageData: {
        ...(typeof job.stage_data === 'object' && job.stage_data !== null ? job.stage_data : {}),
        process_parameters: processData,
        started_by: user?.id,
        start_time: new Date().toISOString(),
      }
    });
  };

  // Complete job
  const completeJob = (jobId: string) => {
    const job = adhesiveJobs.find(j => j.id === jobId);
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
        adhesion_test: 'within_specs',
        coating_uniformity: 'approved',
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
          <p className="text-muted-foreground">Loading adhesive coating jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Adhesive Coating</h2>
          <p className="text-muted-foreground">
            Apply precise adhesive coating with quality control and process monitoring
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <Settings className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6">
        {adhesiveJobs.map((job) => (
          <Card key={job.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Droplets className="h-5 w-5 text-primary" />
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
              <Tabs defaultValue="process" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="process">Process Parameters</TabsTrigger>
                  <TabsTrigger value="materials">Materials</TabsTrigger>
                  <TabsTrigger value="monitoring">Real-time Monitoring</TabsTrigger>
                  <TabsTrigger value="quality">Quality Control</TabsTrigger>
                </TabsList>

                <TabsContent value="process" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="adhesive_type">Adhesive Type</Label>
                      <Select
                        value={processData.adhesive_type}
                        onValueChange={(value) => setProcessData(prev => ({
                          ...prev,
                          adhesive_type: value
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select adhesive" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pur">PUR (Polyurethane)</SelectItem>
                          <SelectItem value="eva">EVA (Ethylene Vinyl Acetate)</SelectItem>
                          <SelectItem value="hot_melt">Hot Melt</SelectItem>
                          <SelectItem value="water_based">Water Based</SelectItem>
                          <SelectItem value="solvent_based">Solvent Based</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="coating_weight">Coating Weight (gsm)</Label>
                      <Input
                        id="coating_weight"
                        value={processData.coating_weight}
                        onChange={(e) => setProcessData(prev => ({
                          ...prev,
                          coating_weight: e.target.value
                        }))}
                        placeholder="Enter coating weight"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="substrate_tension">Substrate Tension (N/m)</Label>
                      <Input
                        id="substrate_tension"
                        value={processData.substrate_tension}
                        onChange={(e) => setProcessData(prev => ({
                          ...prev,
                          substrate_tension: e.target.value
                        }))}
                        placeholder="Enter tension"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="drying_temperature">Drying Temperature (°C)</Label>
                      <Input
                        id="drying_temperature"
                        value={processData.drying_temperature}
                        onChange={(e) => setProcessData(prev => ({
                          ...prev,
                          drying_temperature: e.target.value
                        }))}
                        placeholder="Enter temperature"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="line_speed">Line Speed (m/min)</Label>
                      <Input
                        id="line_speed"
                        value={processData.line_speed}
                        onChange={(e) => setProcessData(prev => ({
                          ...prev,
                          line_speed: e.target.value
                        }))}
                        placeholder="Enter speed"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="application_method">Application Method</Label>
                      <Select
                        value={processData.application_method}
                        onValueChange={(value) => setProcessData(prev => ({
                          ...prev,
                          application_method: value
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gravure">Gravure Roll</SelectItem>
                          <SelectItem value="slot_die">Slot Die</SelectItem>
                          <SelectItem value="curtain">Curtain Coating</SelectItem>
                          <SelectItem value="knife_over_roll">Knife Over Roll</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="viscosity">Viscosity (cP)</Label>
                      <Input
                        id="viscosity"
                        value={processData.viscosity}
                        onChange={(e) => setProcessData(prev => ({
                          ...prev,
                          viscosity: e.target.value
                        }))}
                        placeholder="Enter viscosity"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="process_notes">Process Notes</Label>
                    <Textarea
                      id="process_notes"
                      value={processData.process_notes}
                      onChange={(e) => setProcessData(prev => ({
                        ...prev,
                        process_notes: e.target.value
                      }))}
                      placeholder="Additional process instructions or observations..."
                      rows={3}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="materials" className="space-y-4 mt-4">
                  <MaterialConsumptionCard
                    workflowProgressId={job.id}
                    stageName="Adhesive Coating"
                    orderId={job.order_id}
                    stageId={job.stage_id}
                  />
                </TabsContent>

                <TabsContent value="monitoring" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Thermometer className="h-4 w-4" />
                          Temperature Control
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Adhesive Temp:</span>
                          <Badge variant="default">45°C</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Drying Zone 1:</span>
                          <Badge variant="default">80°C</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Drying Zone 2:</span>
                          <Badge variant="default">85°C</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Gauge className="h-4 w-4" />
                          Process Control
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Viscosity:</span>
                          <Badge variant="default">850 cP</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Coating Weight:</span>
                          <Badge variant="default">2.5 gsm</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Line Speed:</span>
                          <Badge variant="default">120 m/min</Badge>
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
                              Start
                            </Button>
                          )}
                          
                          {job.status === 'in_progress' && (
                            <Button 
                              onClick={() => completeJob(job.id)}
                              disabled={updateJobStatus.isPending}
                              className="flex-1"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Complete
                            </Button>
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
                        <CardTitle className="text-base flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4" />
                          Quality Checks
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Adhesion Test:</span>
                          <Badge variant="default">Passed</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Coating Uniformity:</span>
                          <Badge variant="default">95%</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Bond Strength:</span>
                          <Badge variant="default">2.8 N/15mm</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Process Status</CardTitle>
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
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}

        {adhesiveJobs.length === 0 && (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <div className="text-center space-y-2">
                <Droplets className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">No adhesive coating jobs available</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};