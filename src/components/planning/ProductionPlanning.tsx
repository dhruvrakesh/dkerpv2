import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Calendar,
  Clock,
  Users,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Package,
  Activity,
  Target,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductionSchedule {
  id: string;
  uiorn: string;
  itemName: string;
  quantity: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'delayed';
  assignedLine: string;
  estimatedHours: number;
  actualHours?: number;
  efficiency: number;
}

interface CapacityMetrics {
  totalCapacity: number;
  usedCapacity: number;
  availableCapacity: number;
  efficiency: number;
  onTimeDelivery: number;
  scheduledOrders: number;
  completedOrders: number;
  delayedOrders: number;
}

interface ResourceUtilization {
  resource: string;
  type: 'machine' | 'operator' | 'material';
  utilization: number;
  availability: number;
  status: 'available' | 'busy' | 'maintenance' | 'offline';
}

export const ProductionPlanning = () => {
  const [schedules, setSchedules] = useState<ProductionSchedule[]>([]);
  const [metrics, setMetrics] = useState<CapacityMetrics>({
    totalCapacity: 0,
    usedCapacity: 0,
    availableCapacity: 0,
    efficiency: 0,
    onTimeDelivery: 0,
    scheduledOrders: 0,
    completedOrders: 0,
    delayedOrders: 0
  });
  const [resources, setResources] = useState<ResourceUtilization[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('schedule');

  useEffect(() => {
    loadPlanningData();
  }, []);

  const loadPlanningData = async () => {
    setLoading(true);
    try {
      // Simulate API call - in real implementation, fetch from Supabase
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockSchedules: ProductionSchedule[] = [
        {
          id: 'SCH001',
          uiorn: 'UIORN001',
          itemName: 'Premium Tape Roll - 24mm',
          quantity: 1000,
          priority: 'high',
          plannedStart: '2024-01-15T08:00:00Z',
          plannedEnd: '2024-01-17T18:00:00Z',
          actualStart: '2024-01-15T08:30:00Z',
          status: 'in_progress',
          assignedLine: 'Line A',
          estimatedHours: 24,
          actualHours: 18,
          efficiency: 95
        },
        {
          id: 'SCH002',
          uiorn: 'UIORN002',
          itemName: 'Standard Label Set - 50x25mm',
          quantity: 5000,
          priority: 'medium',
          plannedStart: '2024-01-16T10:00:00Z',
          plannedEnd: '2024-01-19T16:00:00Z',
          status: 'scheduled',
          assignedLine: 'Line B',
          estimatedHours: 32,
          efficiency: 88
        },
        {
          id: 'SCH003',
          uiorn: 'UIORN003',
          itemName: 'Custom Packaging Film - 200mic',
          quantity: 2000,
          priority: 'urgent',
          plannedStart: '2024-01-15T14:00:00Z',
          plannedEnd: '2024-01-18T12:00:00Z',
          actualStart: '2024-01-15T16:00:00Z',
          status: 'delayed',
          assignedLine: 'Line C',
          estimatedHours: 28,
          actualHours: 12,
          efficiency: 76
        }
      ];

      const mockMetrics: CapacityMetrics = {
        totalCapacity: 168, // hours per week
        usedCapacity: 142,
        availableCapacity: 26,
        efficiency: 89.2,
        onTimeDelivery: 94.5,
        scheduledOrders: 15,
        completedOrders: 12,
        delayedOrders: 2
      };

      const mockResources: ResourceUtilization[] = [
        { resource: 'Gravure Press 1', type: 'machine', utilization: 87, availability: 95, status: 'busy' },
        { resource: 'Gravure Press 2', type: 'machine', utilization: 92, availability: 98, status: 'busy' },
        { resource: 'Lamination Line A', type: 'machine', utilization: 78, availability: 90, status: 'available' },
        { resource: 'Coating Station 1', type: 'machine', utilization: 0, availability: 0, status: 'maintenance' },
        { resource: 'Slitting Machine 1', type: 'machine', utilization: 65, availability: 100, status: 'available' },
        { resource: 'Print Operators', type: 'operator', utilization: 85, availability: 100, status: 'available' },
        { resource: 'QC Inspectors', type: 'operator', utilization: 72, availability: 100, status: 'available' },
        { resource: 'BOPP Film Stock', type: 'material', utilization: 60, availability: 85, status: 'available' }
      ];
      
      setSchedules(mockSchedules);
      setMetrics(mockMetrics);
      setResources(mockResources);
    } catch (error) {
      console.error('Error loading planning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'in_progress': return <Activity className="h-4 w-4 text-warning" />;
      case 'delayed': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="status-completed">Completed</Badge>;
      case 'in_progress': return <Badge className="status-in-progress">In Progress</Badge>;
      case 'delayed': return <Badge className="status-blocked">Delayed</Badge>;
      default: return <Badge className="status-pending">Scheduled</Badge>;
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

  const getResourceStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'busy': return <Activity className="h-4 w-4 text-warning" />;
      case 'maintenance': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading production planning data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Production Planning</h1>
          <p className="text-muted-foreground">
            Optimize production schedules and resource allocation
          </p>
        </div>
        <Button onClick={loadPlanningData}>
          <Calendar className="h-4 w-4 mr-2" />
          Refresh Schedule
        </Button>
      </div>

      {/* Capacity Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="kpi-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Capacity Utilization</p>
                <p className="metric-primary">{((metrics.usedCapacity / metrics.totalCapacity) * 100).toFixed(1)}%</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
            <div className="mt-4">
              <Progress value={(metrics.usedCapacity / metrics.totalCapacity) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.usedCapacity}/{metrics.totalCapacity} hours
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Efficiency</p>
                <p className="metric-success">{metrics.efficiency}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
            <div className="mt-4">
              <Progress value={metrics.efficiency} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">On-Time Delivery</p>
                <p className="metric-success">{metrics.onTimeDelivery}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <div className="mt-4">
              <Progress value={metrics.onTimeDelivery} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Orders</p>
                <p className="metric-primary">{metrics.scheduledOrders}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                {metrics.completedOrders} completed, {metrics.delayedOrders} delayed
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="schedule">Production Schedule</TabsTrigger>
          <TabsTrigger value="capacity">Capacity Planning</TabsTrigger>
          <TabsTrigger value="resources">Resource Utilization</TabsTrigger>
          <TabsTrigger value="analytics">Planning Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Production Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UIORN</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Line</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-mono font-medium">{schedule.uiorn}</TableCell>
                      <TableCell>{schedule.itemName}</TableCell>
                      <TableCell>{schedule.quantity.toLocaleString()}</TableCell>
                      <TableCell>{getPriorityBadge(schedule.priority)}</TableCell>
                      <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{schedule.assignedLine}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={schedule.actualHours ? (schedule.actualHours / schedule.estimatedHours) * 100 : 0} 
                            className="w-16 h-2" 
                          />
                          <span className="text-sm text-muted-foreground">
                            {schedule.actualHours || 0}/{schedule.estimatedHours}h
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View Timeline
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="capacity" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Capacity Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Capacity</span>
                    <span className="font-medium">{metrics.totalCapacity} hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Used Capacity</span>
                    <span className="font-medium text-warning">{metrics.usedCapacity} hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Available Capacity</span>
                    <span className="font-medium text-success">{metrics.availableCapacity} hours</span>
                  </div>
                  <Progress value={(metrics.usedCapacity / metrics.totalCapacity) * 100} className="h-4" />
                  <div className="text-center">
                    <span className="text-2xl font-bold text-primary">
                      {((metrics.usedCapacity / metrics.totalCapacity) * 100).toFixed(1)}%
                    </span>
                    <p className="text-sm text-muted-foreground">Utilization Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Production Line Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['Line A', 'Line B', 'Line C', 'Line D'].map((line) => (
                    <div key={line} className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Activity className="h-5 w-5 text-success" />
                        <span className="font-medium">{line}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={Math.random() * 100} className="w-16 h-2" />
                        <Badge className="status-in-progress">Active</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resource Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resources.map((resource) => (
                  <div key={resource.resource} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getResourceStatusIcon(resource.status)}
                      <div>
                        <p className="font-medium">{resource.resource}</p>
                        <p className="text-sm text-muted-foreground capitalize">{resource.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{resource.utilization}% utilized</p>
                        <p className="text-xs text-muted-foreground">{resource.availability}% available</p>
                      </div>
                      <div className="w-24">
                        <Progress value={resource.utilization} className="h-2" />
                      </div>
                      <Badge 
                        className={cn(
                          resource.status === 'available' && "status-completed",
                          resource.status === 'busy' && "status-in-progress",
                          resource.status === 'maintenance' && "status-blocked",
                          resource.status === 'offline' && "status-pending"
                        )}
                      >
                        {resource.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Efficiency Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">This Week</span>
                    <span className="font-medium text-success">+3.2% vs last week</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">This Month</span>
                    <span className="font-medium text-success">+7.8% vs last month</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Quarter</span>
                    <span className="font-medium text-success">+15.2% vs last quarter</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bottleneck Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Coating Station</span>
                    <div className="flex items-center gap-2">
                      <Progress value={95} className="w-20 h-2" />
                      <span className="text-sm font-medium text-destructive">95%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Quality Control</span>
                    <div className="flex items-center gap-2">
                      <Progress value={82} className="w-20 h-2" />
                      <span className="text-sm font-medium text-warning">82%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Gravure Printing</span>
                    <div className="flex items-center gap-2">
                      <Progress value={75} className="w-20 h-2" />
                      <span className="text-sm font-medium">75%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Slitting</span>
                    <div className="flex items-center gap-2">
                      <Progress value={65} className="w-20 h-2" />
                      <span className="text-sm font-medium text-success">65%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};