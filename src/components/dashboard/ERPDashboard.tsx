import React from 'react';
import { ManufacturingKPIs } from './ManufacturingKPIs';
import { RecentOrders } from './RecentOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity,
  Zap,
  AlertCircle,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';

const quickStats = [
  {
    title: 'System Status',
    value: 'Operational',
    icon: Activity,
    status: 'success'
  },
  {
    title: 'Active Users',
    value: '23',
    icon: Users,
    status: 'info'
  },
  {
    title: 'Pending Approvals',
    value: '7',
    icon: AlertCircle,
    status: 'warning'
  },
  {
    title: 'Today\'s Production',
    value: '127 units',
    icon: TrendingUp,
    status: 'success'
  }
];

const notifications = [
  {
    id: 1,
    type: 'alert',
    title: 'Low Stock Alert',
    message: 'Premium adhesive stock below minimum threshold',
    time: '2 minutes ago',
    urgent: true
  },
  {
    id: 2,
    type: 'info',
    title: 'Order Completed',
    message: 'DKEGL-2024-001 has been successfully completed',
    time: '15 minutes ago',
    urgent: false
  },
  {
    id: 3,
    type: 'success',
    title: 'Quality Check Passed',
    message: 'Batch QC-240124-03 approved for dispatch',
    time: '1 hour ago',
    urgent: false
  }
];

export function ERPDashboard() {
  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Manufacturing Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to DKEGL Enterprise Resource Planning System
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat) => (
          <Card key={stat.title} className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-lg font-semibold">{stat.value}</p>
                </div>
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - KPIs and Orders */}
        <div className="lg:col-span-2 space-y-8">
          <ManufacturingKPIs />
          <RecentOrders />
        </div>

        {/* Right Column - Notifications and Quick Actions */}
        <div className="space-y-6">
          {/* System Notifications */}
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-accent" />
                System Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-3 rounded-lg border ${
                    notification.urgent 
                      ? 'border-destructive/20 bg-destructive/5' 
                      : 'border-border bg-muted/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium">{notification.title}</h4>
                        {notification.urgent && (
                          <Badge variant="destructive" className="text-xs">Urgent</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {notification.time}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="card-enterprise">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button className="w-full p-3 text-left rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="font-medium text-sm">Create New Order</div>
                <div className="text-xs text-muted-foreground">Start a new manufacturing order</div>
              </button>
              <button className="w-full p-3 text-left rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="font-medium text-sm">Stock Entry</div>
                <div className="text-xs text-muted-foreground">Add inventory to system</div>
              </button>
              <button className="w-full p-3 text-left rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="font-medium text-sm">Quality Report</div>
                <div className="text-xs text-muted-foreground">Generate quality analysis</div>
              </button>
              <button className="w-full p-3 text-left rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="font-medium text-sm">Production Schedule</div>
                <div className="text-xs text-muted-foreground">View weekly production plan</div>
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}