import React, { useState, useEffect } from 'react';
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
  Scissors
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowStage {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  progress: number;
  startTime?: string;
  endTime?: string;
  assignee?: string;
}

interface WorkflowItem {
  uiorn: string;
  itemName: string;
  quantity: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  stages: WorkflowStage[];
  overallProgress: number;
}

export const ManufacturingWorkflow = () => {
  const [workflowItems, setWorkflowItems] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('active');

  const stageTemplates: WorkflowStage[] = [
    {
      id: 'order',
      name: 'Order Punching',
      icon: Package,
      status: 'pending',
      progress: 0
    },
    {
      id: 'gravure',
      name: 'Gravure Printing',
      icon: Printer,
      status: 'pending',
      progress: 0
    },
    {
      id: 'lamination',
      name: 'Lamination',
      icon: Layers,
      status: 'pending',
      progress: 0
    },
    {
      id: 'coating',
      name: 'Adhesive Coating',
      icon: Droplets,
      status: 'pending',
      progress: 0
    },
    {
      id: 'slitting',
      name: 'Slitting',
      icon: Scissors,
      status: 'pending',
      progress: 0
    }
  ];

  useEffect(() => {
    loadWorkflowData();
  }, []);

  const loadWorkflowData = async () => {
    setLoading(true);
    try {
      // Simulate API call - in real implementation, fetch from Supabase
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData: WorkflowItem[] = [
        {
          uiorn: 'UIORN001',
          itemName: 'Premium Tape Roll - 24mm',
          quantity: 1000,
          priority: 'high',
          overallProgress: 60,
          stages: [
            { ...stageTemplates[0], status: 'completed', progress: 100, startTime: '2024-01-15T08:00:00Z', endTime: '2024-01-15T10:00:00Z', assignee: 'John Doe' },
            { ...stageTemplates[1], status: 'completed', progress: 100, startTime: '2024-01-15T10:30:00Z', endTime: '2024-01-15T14:00:00Z', assignee: 'Jane Smith' },
            { ...stageTemplates[2], status: 'in_progress', progress: 75, startTime: '2024-01-15T14:30:00Z', assignee: 'Bob Wilson' },
            { ...stageTemplates[3], status: 'pending', progress: 0 },
            { ...stageTemplates[4], status: 'pending', progress: 0 }
          ]
        },
        {
          uiorn: 'UIORN002',
          itemName: 'Standard Label Set - 50x25mm',
          quantity: 5000,
          priority: 'medium',
          overallProgress: 40,
          stages: [
            { ...stageTemplates[0], status: 'completed', progress: 100, startTime: '2024-01-15T09:00:00Z', endTime: '2024-01-15T11:00:00Z', assignee: 'Alice Johnson' },
            { ...stageTemplates[1], status: 'in_progress', progress: 60, startTime: '2024-01-15T11:30:00Z', assignee: 'Charlie Brown' },
            { ...stageTemplates[2], status: 'pending', progress: 0 },
            { ...stageTemplates[3], status: 'pending', progress: 0 },
            { ...stageTemplates[4], status: 'pending', progress: 0 }
          ]
        },
        {
          uiorn: 'UIORN003',
          itemName: 'Custom Packaging Film - 200mic',
          quantity: 2000,
          priority: 'urgent',
          overallProgress: 20,
          stages: [
            { ...stageTemplates[0], status: 'in_progress', progress: 80, startTime: '2024-01-15T13:00:00Z', assignee: 'David Lee' },
            { ...stageTemplates[1], status: 'pending', progress: 0 },
            { ...stageTemplates[2], status: 'pending', progress: 0 },
            { ...stageTemplates[3], status: 'pending', progress: 0 },
            { ...stageTemplates[4], status: 'pending', progress: 0 }
          ]
        }
      ];
      
      setWorkflowItems(mockData);
    } catch (error) {
      console.error('Error loading workflow data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Badge variant="destructive">Urgent</Badge>;
      case 'high': return <Badge className="bg-orange-500 text-white">High</Badge>;
      case 'medium': return <Badge variant="secondary">Medium</Badge>;
      default: return <Badge variant="outline">Low</Badge>;
    }
  };

  const filteredItems = workflowItems.filter(item => {
    if (activeView === 'active') {
      return item.stages.some(stage => stage.status === 'in_progress' || stage.status === 'pending');
    }
    if (activeView === 'completed') {
      return item.stages.every(stage => stage.status === 'completed');
    }
    if (activeView === 'blocked') {
      return item.stages.some(stage => stage.status === 'blocked');
    }
    return true;
  });

  if (loading) {
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
        <Button onClick={loadWorkflowData}>
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
          {filteredItems.map((item) => (
            <Card key={item.uiorn} className="card-enterprise">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-3">
                      <span className="font-mono text-lg">{item.uiorn}</span>
                      {getPriorityBadge(item.priority)}
                    </CardTitle>
                    <p className="text-muted-foreground">{item.itemName}</p>
                    <p className="text-sm text-muted-foreground">Quantity: {item.quantity.toLocaleString()} units</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{item.overallProgress}%</div>
                    <div className="text-sm text-muted-foreground">Overall Progress</div>
                  </div>
                </div>
                <Progress value={item.overallProgress} className="w-full" />
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {/* Workflow Stages */}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {item.stages.map((stage, index) => (
                      <div key={stage.id} className="relative">
                        <Card className={cn(
                          "p-4 transition-all duration-200 hover:shadow-md",
                          stage.status === 'completed' && "border-success/50 bg-success/5",
                          stage.status === 'in_progress' && "border-warning/50 bg-warning/5",
                          stage.status === 'blocked' && "border-destructive/50 bg-destructive/5"
                        )}>
                          <div className="flex items-center gap-3 mb-3">
                            <stage.icon className={cn(
                              "h-5 w-5",
                              stage.status === 'completed' && "text-success",
                              stage.status === 'in_progress' && "text-warning",
                              stage.status === 'blocked' && "text-destructive",
                              stage.status === 'pending' && "text-muted-foreground"
                            )} />
                            <div className="flex-1">
                              <div className="font-medium text-sm">{stage.name}</div>
                              {getStatusBadge(stage.status)}
                            </div>
                          </div>
                          
                          {stage.status !== 'pending' && (
                            <div className="space-y-2">
                              <Progress value={stage.progress} className="h-2" />
                              <div className="text-xs text-muted-foreground">
                                {stage.progress}% Complete
                              </div>
                              {stage.assignee && (
                                <div className="text-xs text-muted-foreground">
                                  Assigned: {stage.assignee}
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                        
                        {/* Arrow connector */}
                        {index < item.stages.length - 1 && (
                          <div className="hidden md:flex absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                            <ArrowRight className="h-4 w-4 text-muted-foreground bg-background border rounded-full p-0.5" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline" size="sm">
                      <Play className="h-4 w-4 mr-2" />
                      Start Next Stage
                    </Button>
                    <Button variant="outline" size="sm">
                      <Pause className="h-4 w-4 mr-2" />
                      Hold Production
                    </Button>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredItems.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Orders Found</h3>
                <p className="text-muted-foreground">
                  No manufacturing orders match the current filter.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};