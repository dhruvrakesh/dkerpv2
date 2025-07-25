import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  TrendingUp,
  TrendingDown,
  Activity,
  FileCheck,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProductionAnalytics } from '@/hooks/useProductionAnalytics';
import { useToast } from '@/hooks/use-toast';

interface QualityCheck {
  id: string;
  uiorn: string;
  itemName: string;
  stage: string;
  checkType: 'dimensional' | 'visual' | 'functional' | 'material';
  status: 'pending' | 'passed' | 'failed' | 'in_review';
  inspector: string;
  timestamp: string;
  defects?: string[];
  measurements?: Record<string, any>;
}

interface QualityMetrics {
  passRate: number;
  defectRate: number;
  averageInspectionTime: number;
  totalInspections: number;
  criticalDefects: number;
}

export const QualityControlDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();
  const { 
    loading, 
    getQualityMetrics, 
    getQualityInspections,
    updateQualityInspection 
  } = useProductionAnalytics();
  
  const [qualityChecks, setQualityChecks] = useState<QualityCheck[]>([]);
  const [metrics, setMetrics] = useState<QualityMetrics>({
    passRate: 0,
    defectRate: 0,
    averageInspectionTime: 0,
    totalInspections: 0,
    criticalDefects: 0
  });

  useEffect(() => {
    loadQualityData();
  }, []);

  const loadQualityData = async () => {
    try {
      // Load real quality metrics and inspections
      const [qualityMetrics, inspections] = await Promise.all([
        getQualityMetrics(),
        getQualityInspections()
      ]);

      setMetrics({
        passRate: qualityMetrics.passRate,
        defectRate: qualityMetrics.defectRate,
        averageInspectionTime: qualityMetrics.averageInspectionTime,
        totalInspections: qualityMetrics.totalInspections,
        criticalDefects: qualityMetrics.criticalDefects
      });

      // Transform inspections to match our interface
      const transformedChecks: QualityCheck[] = inspections.map(inspection => ({
        id: inspection.id,
        uiorn: `UIORN-${inspection.order_id?.slice(-4) || '0000'}`,
        itemName: `Quality Check Item ${inspection.id.slice(-4)}`,
        stage: `Stage ${inspection.stage_id?.slice(-4) || '0000'}`,
        checkType: 'visual' as QualityCheck['checkType'],
        status: (inspection.overall_result === 'passed' ? 'passed' : 
                 inspection.overall_result === 'failed' ? 'failed' : 
                 inspection.overall_result === 'in_review' ? 'in_review' : 'pending') as QualityCheck['status'],
        inspector: `Inspector ${inspection.inspector_id?.slice(-4) || '0000'}`,
        timestamp: inspection.inspection_date || new Date().toISOString(),
        defects: inspection.defects_found || [],
        measurements: inspection.inspection_results || {}
      }));

      setQualityChecks(transformedChecks);
    } catch (error) {
      console.error('Error loading quality data:', error);
      toast({
        title: "Error",
        description: "Failed to load quality data",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'in_review': return <AlertTriangle className="h-4 w-4 text-warning" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed': return <Badge className="status-completed">Passed</Badge>;
      case 'failed': return <Badge className="status-blocked">Failed</Badge>;
      case 'in_review': return <Badge className="status-in-progress">In Review</Badge>;
      default: return <Badge className="status-pending">Pending</Badge>;
    }
  };

  const getCheckTypeIcon = (type: string) => {
    switch (type) {
      case 'dimensional': return '📏';
      case 'visual': return '👁️';
      case 'functional': return '⚙️';
      case 'material': return '🧪';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading quality control data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Quality Control Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage quality inspections across manufacturing stages
          </p>
        </div>
        <Button onClick={loadQualityData}>
          <Activity className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Quality Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="kpi-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pass Rate</p>
                <p className="metric-success">{metrics.passRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
            <div className="mt-4">
              <Progress value={metrics.passRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Defect Rate</p>
                <p className="metric-accent">{metrics.defectRate}%</p>
              </div>
              <TrendingDown className="h-8 w-8 text-destructive" />
            </div>
            <div className="mt-4">
              <Progress value={metrics.defectRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Inspection Time</p>
                <p className="metric-primary">{metrics.averageInspectionTime}m</p>
              </div>
              <Clock className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Inspections</p>
                <p className="metric-primary">{metrics.totalInspections}</p>
              </div>
              <FileCheck className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="kpi-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Defects</p>
                <p className="text-2xl font-bold text-destructive">{metrics.criticalDefects}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pending">Pending Inspections</TabsTrigger>
          <TabsTrigger value="failed">Failed Items</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Quality Checks</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>UIORN</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Check Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Inspector</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qualityChecks.map((check) => (
                    <TableRow key={check.id}>
                      <TableCell className="font-mono font-medium">{check.uiorn}</TableCell>
                      <TableCell>{check.itemName}</TableCell>
                      <TableCell>{check.stage}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{getCheckTypeIcon(check.checkType)}</span>
                          <span className="capitalize">{check.checkType}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(check.status)}</TableCell>
                      <TableCell>{check.inspector}</TableCell>
                      <TableCell>
                        {new Date(check.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <div className="grid gap-4">
            {qualityChecks.filter(check => check.status === 'pending').map((check) => (
              <Card key={check.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{check.uiorn}</span>
                        <Badge variant="outline">{check.stage}</Badge>
                      </div>
                      <h3 className="font-medium">{check.itemName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {getCheckTypeIcon(check.checkType)} {check.checkType.charAt(0).toUpperCase() + check.checkType.slice(1)} Inspection
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Assigned to: {check.inspector}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="btn-accent">
                        Start Inspection
                      </Button>
                      <Button variant="outline" size="sm">
                        Reassign
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          <div className="grid gap-4">
            {qualityChecks.filter(check => check.status === 'failed').map((check) => (
              <Card key={check.id} className="border-destructive/50">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{check.uiorn}</span>
                          <Badge variant="destructive">Failed</Badge>
                          <Badge variant="outline">{check.stage}</Badge>
                        </div>
                        <h3 className="font-medium">{check.itemName}</h3>
                        <p className="text-sm text-muted-foreground">
                          Inspector: {check.inspector} | {new Date(check.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          Create NCR
                        </Button>
                        <Button size="sm" className="btn-accent">
                          Re-inspect
                        </Button>
                      </div>
                    </div>
                    
                    {check.defects && (
                      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                        <h4 className="font-medium text-destructive mb-2">Identified Defects:</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {check.defects.map((defect, index) => (
                            <li key={index} className="text-sm text-destructive">{defect}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {check.measurements && (
                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="font-medium mb-2">Measurements:</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(check.measurements).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-muted-foreground">{key}:</span>
                              <span className="font-medium">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Quality Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">This Week</span>
                    <span className="font-medium text-success">+2.3% improvement</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">This Month</span>
                    <span className="font-medium text-success">+5.7% improvement</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Quarter</span>
                    <span className="font-medium text-success">+12.4% improvement</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Defect Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Dimensional</span>
                    <div className="flex items-center gap-2">
                      <Progress value={45} className="w-20 h-2" />
                      <span className="text-sm font-medium">45%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Visual</span>
                    <div className="flex items-center gap-2">
                      <Progress value={30} className="w-20 h-2" />
                      <span className="text-sm font-medium">30%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Material</span>
                    <div className="flex items-center gap-2">
                      <Progress value={15} className="w-20 h-2" />
                      <span className="text-sm font-medium">15%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Functional</span>
                    <div className="flex items-center gap-2">
                      <Progress value={10} className="w-20 h-2" />
                      <span className="text-sm font-medium">10%</span>
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