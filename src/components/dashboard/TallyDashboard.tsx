import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileSpreadsheet, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database,
  Download,
  RefreshCw,
  Eye,
  Share2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface DashboardMetrics {
  totalBatches: number;
  completedBatches: number;
  completionRate: number;
  totalRecords: number;
  postedRecords: number;
  postingRate: number;
  recentActivity: any[];
}

const TallyDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();

  const fetchDashboardMetrics = async () => {
    try {
      setIsLoading(true);
      
      // Get current user's organization
      const { data: userProfile } = await supabase
        .from('dkegl_user_profiles')
        .select('organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!userProfile?.organization_id) {
        throw new Error('Organization not found');
      }

      // Call dashboard metrics function
      const { data, error } = await supabase.rpc('dkpkl_get_dashboard_metrics', {
        _org_id: userProfile.organization_id
      });

      if (error) throw error;
      
      setMetrics(data as unknown as DashboardMetrics);
    } catch (error: any) {
      console.error('Failed to fetch dashboard metrics:', error);
      toast({
        title: "Failed to Load Dashboard",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostToERP = async (batchId: string, importType: string) => {
    try {
      setIsPosting(true);
      
      // Get user org ID first
      const { data: userProfile } = await supabase
        .from('dkegl_user_profiles')
        .select('organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (!userProfile?.organization_id) {
        throw new Error('Organization not found');
      }
      
      let functionName = '';
      switch (importType) {
        case 'SALES':
          functionName = 'dkpkl_post_sales_to_grn';
          break;
        case 'PURCHASE':
          functionName = 'dkpkl_post_purchase_to_issue';
          break;
        default:
          throw new Error(`Posting not implemented for ${importType}`);
      }

      const { data, error } = await supabase.rpc(functionName as any, {
        _batch_id: batchId,
        _org_id: userProfile.organization_id
      });

      if (error) throw error;

      const result = data as { posted_count: number; error_count: number; message: string };
      
      toast({
        title: "Posted to ERP",
        description: result.message || `Successfully posted ${result.posted_count} records.`
      });

      // Refresh metrics
      await fetchDashboardMetrics();

    } catch (error: any) {
      console.error('Failed to post to ERP:', error);
      toast({
        title: "Posting Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsPosting(false);
    }
  };

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  if (isLoading) {
    return <LoadingSpinner className="h-8 w-8" />;
  }

  if (!metrics || (metrics.totalBatches === 0 && metrics.totalRecords === 0)) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tally Integration Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Monitor imports, reconciliation, and ERP posting status
            </p>
          </div>
          <Button variant="outline" onClick={fetchDashboardMetrics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="mb-6 p-6 rounded-full bg-muted/20">
            <FileSpreadsheet className="h-16 w-16 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-3">Welcome to Tally Integration</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            {!metrics 
              ? "Loading dashboard data..." 
              : "No Tally data imports yet. Start by uploading your first Excel file to begin monitoring your sales and purchase data."
            }
          </p>
          {metrics && (
            <div className="flex gap-4">
              <Button asChild>
                <a href="/imports/tally">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Import First File
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Sample
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'secondary' as const, label: 'Pending', icon: Clock },
      processing: { variant: 'default' as const, label: 'Processing', icon: RefreshCw },
      processed: { variant: 'default' as const, label: 'Processed', icon: Database },
      completed: { variant: 'default' as const, label: 'Completed', icon: CheckCircle },
      failed: { variant: 'destructive' as const, label: 'Failed', icon: AlertTriangle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <IconComponent className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Use the completion and posting rates from the metrics
  const completionRate = metrics.completionRate || 0;
  const postingRate = metrics.postingRate || 0;
  
  // Calculate pending batches from total and completed
  const pendingBatches = metrics.totalBatches - metrics.completedBatches;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tally Integration Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor imports, reconciliation, and ERP posting status
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchDashboardMetrics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button asChild>
            <a href="/imports/tally">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              New Import
            </a>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalBatches}</div>
            <p className="text-xs text-muted-foreground">
              {pendingBatches} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
            <Progress value={completionRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRecords?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.postedRecords || 0} posted to ERP
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ERP Posting Rate</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{postingRate.toFixed(1)}%</div>
            <Progress value={postingRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Batch Status Overview</CardTitle>
            <CardDescription>Current status of all import batches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Completed</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{metrics.completedBatches}</span>
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${metrics.totalBatches > 0 ? (metrics.completedBatches / metrics.totalBatches) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Pending</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{pendingBatches}</span>
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ width: `${metrics.totalBatches > 0 ? (pendingBatches / metrics.totalBatches) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ERP Integration Status</CardTitle>
            <CardDescription>Data posting and reconciliation status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">Posted Records</span>
                </div>
                <span className="text-sm font-bold text-green-700">
                  {metrics.postedRecords?.toLocaleString() || 0}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Pending Records</span>
                </div>
                <span className="text-sm font-bold text-blue-700">
                  {((metrics.totalRecords || 0) - (metrics.postedRecords || 0)).toLocaleString()}
                </span>
              </div>
              
              <div className="mt-4">
                <div className="text-xs text-muted-foreground mb-2">ERP Integration Progress</div>
                <Progress 
                  value={postingRate} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Import Activity</CardTitle>
          <CardDescription>Latest import batches and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.recentActivity && metrics.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {metrics.recentActivity.map((batch: any) => (
                <div 
                  key={batch.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{batch.file_name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="capitalize">{batch.import_type.toLowerCase()}</span>
                        <span>•</span>
                        <span>{batch.total_rows || 0} records</span>
                        <span>•</span>
                        <span>{new Date(batch.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {getStatusBadge(batch.status)}
                    
                    {batch.status === 'completed' && (batch.import_type === 'SALES' || batch.import_type === 'PURCHASE') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePostToERP(batch.id, batch.import_type)}
                        disabled={isPosting}
                      >
                        <Share2 className="h-3 w-3 mr-1" />
                        Post to ERP
                      </Button>
                    )}
                    
                    <Button size="sm" variant="ghost">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No import activity yet</p>
              <p className="text-sm">Start by importing your first Tally Excel file</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TallyDashboard;