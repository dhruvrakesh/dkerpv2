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
import { useRealSystemStats } from '@/hooks/useRealSystemStats';


export function ERPDashboard() {
  const { loading, stats, notifications } = useRealSystemStats();

  const quickStats = [
    {
      title: 'System Status',
      value: stats.systemStatus,
      icon: Activity,
      status: 'success'
    },
    {
      title: 'Active Users',
      value: stats.activeUsers.toString(),
      icon: Users,
      status: 'info'
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingApprovals.toString(),
      icon: AlertCircle,
      status: stats.pendingApprovals > 5 ? 'warning' : 'info'
    },
    {
      title: 'Today\'s Production',
      value: stats.todaysProduction > 0 ? `${stats.todaysProduction} units` : 'No production',
      icon: TrendingUp,
      status: stats.todaysProduction > 0 ? 'success' : 'neutral'
    }
  ];
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Enhanced Header with Gradient */}
      <div className="glass-card p-6 md:p-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-gradient-to-b from-primary to-accent rounded-full"></div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Manufacturing Dashboard
            </h1>
          </div>
          <p className="text-muted-foreground text-sm md:text-base">
            Welcome to DKEGL Enterprise Resource Planning System
          </p>
        </div>
      </div>

      {/* Enhanced Quick Stats with Animations */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {loading ? (
          // Loading skeleton
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="kpi-card mobile-optimized">
              <CardContent className="p-3 md:p-4">
                <div className="animate-pulse space-y-2">
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          quickStats.map((stat, index) => (
            <Card 
              key={stat.title} 
              className="kpi-card border-l-4 border-l-primary hover:border-l-accent group mobile-optimized"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm text-muted-foreground truncate">{stat.title}</p>
                    <p className="text-sm md:text-lg font-semibold metric-primary group-hover:metric-accent transition-colors">
                      {stat.value}
                    </p>
                  </div>
                  <stat.icon className="h-4 w-4 md:h-5 md:w-5 text-primary group-hover:text-accent transition-colors pulse-subtle" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Enhanced Main Content Grid with Mobile Optimization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
        {/* Left Column - KPIs and Orders */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          <div className="slide-up" style={{ animationDelay: '200ms' }}>
            <ManufacturingKPIs />
          </div>
          <div className="slide-up" style={{ animationDelay: '300ms' }}>
            <RecentOrders />
          </div>
        </div>

        {/* Right Column - Enhanced Notifications and Quick Actions */}
        <div className="space-y-4 md:space-y-6">
          {/* Enhanced System Notifications */}
          <div className="slide-up" style={{ animationDelay: '400ms' }}>
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                  <Zap className="h-4 w-4 md:h-5 md:w-5 text-accent pulse-subtle" />
                  System Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  // Loading skeleton for notifications
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="p-3 rounded-lg border">
                      <div className="animate-pulse space-y-2">
                        <div className="h-3 bg-muted rounded w-3/4"></div>
                        <div className="h-2 bg-muted rounded w-full"></div>
                        <div className="h-2 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  ))
                ) : notifications.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent notifications</p>
                  </div>
                ) : (
                  notifications.map((notification, index) => (
                  <div 
                    key={notification.id} 
                    className={`p-3 rounded-lg border transition-all duration-300 hover:shadow-md mobile-optimized ${
                      notification.urgent 
                        ? 'border-destructive/20 bg-destructive/5 hover:bg-destructive/10' 
                        : 'border-border bg-muted/20 hover:bg-muted/30'
                    }`}
                    style={{ animationDelay: `${(index + 5) * 100}ms` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs md:text-sm font-medium truncate">{notification.title}</h4>
                          {notification.urgent && (
                            <Badge variant="destructive" className="text-xs flex-shrink-0">Urgent</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground opacity-70">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Quick Actions */}
          <div className="slide-up" style={{ animationDelay: '500ms' }}>
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm md:text-base">
                  <Activity className="h-4 w-4 md:h-5 md:w-5 text-primary pulse-subtle" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { title: 'Create New Order', desc: 'Start a new manufacturing order', icon: '📋' },
                  { title: 'Stock Entry', desc: 'Add inventory to system', icon: '📦' },
                  { title: 'Quality Report', desc: 'Generate quality analysis', icon: '📊' },
                  { title: 'Production Schedule', desc: 'View weekly production plan', icon: '📅' }
                ].map((action, index) => (
                  <button 
                    key={action.title}
                    className="w-full p-3 text-left rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 mobile-optimized group"
                    style={{ animationDelay: `${(index + 8) * 100}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{action.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs md:text-sm group-hover:text-primary transition-colors">{action.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{action.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}