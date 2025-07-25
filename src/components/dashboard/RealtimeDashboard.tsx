import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useRealtimeQualityUpdates } from '@/hooks/useRealtimeQualityUpdates';
import { Activity, CheckCircle, XCircle, Clock, Wifi, WifiOff, RefreshCw } from 'lucide-react';

export const RealtimeDashboard: React.FC = () => {
  const {
    updates,
    isConnected,
    clearUpdates,
    getRecentQualityFailures,
    getRecentCompletions,
    totalUpdates
  } = useRealtimeQualityUpdates();

  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        // Trigger UI refresh every 5 seconds when auto-refresh is enabled
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const recentFailures = getRecentQualityFailures();
  const recentCompletions = getRecentCompletions();

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getUpdateIcon = (type: string) => {
    switch (type) {
      case 'quality_inspection':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'workflow_progress':
        return <Activity className="h-4 w-4 text-green-500" />;
      case 'order_status':
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'INSERT':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'DELETE':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CardTitle className="text-lg">Real-time Manufacturing Dashboard</CardTitle>
              {isConnected ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <Wifi className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Disconnected
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
              </Button>
              <Button variant="outline" size="sm" onClick={clearUpdates}>
                Clear Updates
              </Button>
            </div>
          </div>
          <CardDescription>
            Live updates from quality inspections, workflow progress, and order status changes.
            Total updates: {totalUpdates}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Failures</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{recentFailures.length}</div>
            <p className="text-xs text-muted-foreground">
              Recent failures detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completions</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{recentCompletions.length}</div>
            <p className="text-xs text-muted-foreground">
              Recent completions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Updates</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalUpdates}</div>
            <p className="text-xs text-muted-foreground">
              Total updates received
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Live Updates Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Live Updates Feed</CardTitle>
          <CardDescription>
            Real-time updates from the manufacturing system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            {updates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Activity className="h-8 w-8 mb-2" />
                <p>No real-time updates yet</p>
                <p className="text-sm">Updates will appear here when events occur</p>
              </div>
            ) : (
              <div className="space-y-3">
                {updates.map((update, index) => (
                  <div key={update.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                    <div className="flex-shrink-0 mt-1">
                      {getUpdateIcon(update.type)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge className={getEventTypeColor(update.data.eventType)}>
                            {update.data.eventType}
                          </Badge>
                          <Badge variant="outline">
                            {update.type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(update.timestamp)}
                        </span>
                      </div>
                      
                      {update.type === 'quality_inspection' && (
                        <div className="text-sm">
                          <span className="font-medium">Quality Inspection:</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            update.data.new?.overall_result === 'passed' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : update.data.new?.overall_result === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {update.data.new?.overall_result || 'pending'}
                          </span>
                          {update.data.new?.remarks && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {update.data.new.remarks}
                            </p>
                          )}
                        </div>
                      )}

                      {update.type === 'workflow_progress' && (
                        <div className="text-sm">
                          <span className="font-medium">Workflow Progress:</span>
                          <span className="ml-2">
                            {update.data.new?.progress_percentage || 0}% complete
                          </span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            update.data.new?.status === 'completed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : update.data.new?.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          }`}>
                            {update.data.new?.status || 'pending'}
                          </span>
                        </div>
                      )}

                      {update.type === 'order_status' && (
                        <div className="text-sm">
                          <span className="font-medium">Order:</span>
                          <span className="ml-2">{update.data.new?.order_number}</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            update.data.new?.status === 'completed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                          }`}>
                            {update.data.new?.status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};