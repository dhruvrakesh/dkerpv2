import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, CheckCircle, Clock, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import { useGSTAnalytics } from '@/hooks/useGSTAnalytics';
import { format } from 'date-fns';

export const GSTComplianceCenter: React.FC = () => {
  const { compliance, loading, fetchComplianceStatus } = useGSTAnalytics();

  useEffect(() => {
    fetchComplianceStatus();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-destructive';
  };

  const getComplianceStatus = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Needs Attention';
    return 'Critical';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">GST Compliance Center</h1>
          <p className="text-muted-foreground mt-2">
            Monitor compliance status, track deadlines, and manage GST obligations
          </p>
        </div>
        <Button onClick={fetchComplianceStatus} className="gap-2">
          <TrendingUp className="h-4 w-4" />
          Refresh Status
        </Button>
      </div>

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className={`text-2xl font-bold ${getComplianceColor(compliance?.compliance_score || 0)}`}>
                {compliance?.compliance_score?.toFixed(1) || '0.0'}%
              </div>
              <Badge variant={compliance?.compliance_score >= 70 ? 'default' : 'destructive'}>
                {getComplianceStatus(compliance?.compliance_score || 0)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Overall Compliance Score</p>
            <Progress 
              value={compliance?.compliance_score || 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div className="text-2xl font-bold text-destructive">
                {compliance?.pending_returns?.length || 0}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Pending Returns</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-warning" />
              <div className="text-2xl font-bold text-warning">
                {compliance?.upcoming_deadlines?.length || 0}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Upcoming Deadlines</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <div className="text-2xl font-bold">
                ₹{compliance?.penalty_calculations?.reduce((sum: number, penalty: any) => 
                  sum + (penalty.estimated_penalty || 0), 0)?.toLocaleString() || '0'}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Estimated Penalties</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending">Pending Returns</TabsTrigger>
          <TabsTrigger value="deadlines">Upcoming Deadlines</TabsTrigger>
          <TabsTrigger value="penalties">Penalty Analysis</TabsTrigger>
          <TabsTrigger value="recommendations">Action Items</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Pending GST Returns
              </CardTitle>
            </CardHeader>
            <CardContent>
              {compliance?.pending_returns?.length > 0 ? (
                <div className="space-y-4">
                  {compliance.pending_returns.map((returnItem: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {returnItem.return_type} - {returnItem.month}/{returnItem.year}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Due: {format(new Date(returnItem.due_date), 'MMM dd, yyyy')}
                        </div>
                        <Badge variant={returnItem.status === 'late' ? 'destructive' : 'secondary'}>
                          {returnItem.status === 'late' ? `${returnItem.days_overdue} days overdue` : 'Pending'}
                        </Badge>
                      </div>
                      <Button size="sm" className="gap-2">
                        <FileText className="h-4 w-4" />
                        File Return
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                  <div className="text-lg font-medium">All Returns Filed</div>
                  <p className="text-muted-foreground">No pending returns at this time</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deadlines">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                Upcoming Filing Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              {compliance?.upcoming_deadlines?.length > 0 ? (
                <div className="space-y-4">
                  {compliance.upcoming_deadlines.map((deadline: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {deadline.return_type} - {deadline.month}/{deadline.year}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Due: {format(new Date(deadline.due_date), 'MMM dd, yyyy')}
                        </div>
                        <Badge variant={deadline.days_remaining <= 7 ? 'destructive' : 'secondary'}>
                          {deadline.days_remaining} days remaining
                        </Badge>
                      </div>
                      <Button size="sm" variant="outline" className="gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Set Reminder
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                  <div className="text-lg font-medium">No Immediate Deadlines</div>
                  <p className="text-muted-foreground">All upcoming deadlines are well-managed</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="penalties">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Penalty Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {compliance?.penalty_calculations?.length > 0 ? (
                <div className="space-y-4">
                  {compliance.penalty_calculations.map((penalty: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {penalty.return_type} - {penalty.month}/{penalty.year}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {penalty.days_late} days late
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-destructive">
                          ₹{penalty.estimated_penalty?.toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Estimated Penalty</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                  <div className="text-lg font-medium">No Penalties</div>
                  <p className="text-muted-foreground">All returns filed on time</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {compliance?.recommendations?.map((rec: any, index: number) => (
                  <div key={index} className="flex items-start space-x-3 p-4 border rounded-lg">
                    <Badge variant={getPriorityColor(rec.priority)} className="mt-1">
                      {rec.priority}
                    </Badge>
                    <div className="flex-1">
                      <div className="font-medium capitalize">{rec.type}</div>
                      <p className="text-sm text-muted-foreground mt-1">{rec.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};