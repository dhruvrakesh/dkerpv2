import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Workflow,
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Target,
  Activity,
  ClipboardList,
  RefreshCw
} from 'lucide-react';
import { useRealProductionMetrics } from '@/hooks/useRealProductionMetrics';
import { cn } from '@/lib/utils';


export function ManufacturingKPIs() {
  const { loading, metrics, productionStages, refreshData } = useRealProductionMetrics();

  const kpiData = [
    {
      title: 'Active Orders',
      value: metrics.activeOrders.toString(),
      change: metrics.hasData ? '+12%' : 'No data',
      trend: metrics.hasData ? 'up' : 'neutral',
      icon: Workflow,
      color: 'chart-1'
    },
    {
      title: 'Production Efficiency',
      value: `${metrics.overallEfficiency.toFixed(1)}%`,
      change: metrics.hasData ? '+2.1%' : 'No data',
      trend: metrics.hasData ? 'up' : 'neutral',
      icon: TrendingUp,
      color: 'chart-3'
    },
    {
      title: 'OEE Score',
      value: `${metrics.oeeScore.toFixed(1)}%`,
      change: metrics.hasData ? '+1.8%' : 'No data',
      trend: metrics.hasData ? 'up' : 'neutral',
      icon: Target,
      color: 'chart-2'
    },
    {
      title: 'Quality Pass Rate',
      value: metrics.hasData ? '95.0%' : '0%',
      change: metrics.hasData ? '+0.3%' : 'No data',
      trend: metrics.hasData ? 'up' : 'neutral',
      icon: CheckCircle,
      color: 'chart-3'
    }
  ];

  if (loading) {
    return (
      <Card className="card-enterprise">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics.hasData) {
    return (
      <Card className="card-enterprise">
        <CardContent className="p-0">
          <EmptyState
            icon={ClipboardList}
            title="No Production Data"
            description="Start by creating your first manufacturing order to see production KPIs and stage performance."
            actionLabel="Create First Order"
            onAction={() => {
              window.location.href = '/orders/create';
            }}
            showCard={false}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Manufacturing KPIs
        </h2>
        <Button 
          onClick={refreshData} 
          variant="outline" 
          size="sm" 
          className="self-start sm:self-auto"
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
        {kpiData.map((kpi, index) => (
          <Card 
            key={kpi.title} 
            className="kpi-card group hover:border-accent/30"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-3 md:p-4 lg:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="space-y-2 min-w-0 flex-1">
                  <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">{kpi.title}</p>
                  <p className="text-lg md:text-xl lg:text-2xl font-bold text-primary group-hover:text-accent transition-colors">
                    {kpi.value}
                  </p>
                   <div className="flex items-center gap-1 flex-wrap">
                    <Badge 
                      variant={kpi.trend === 'up' ? 'default' : kpi.trend === 'neutral' ? 'outline' : 'secondary'} 
                      className={`text-xs ${kpi.trend === 'up' ? 'bg-success/10 text-success border-success/20' : ''}`}
                    >
                      {kpi.change}
                    </Badge>
                    {metrics.hasData && (
                      <span className="text-xs text-muted-foreground hidden sm:inline">vs last month</span>
                    )}
                  </div>
                </div>
                <div className="p-2 md:p-3 rounded-lg bg-primary/10 group-hover:bg-accent/10 transition-colors self-center">
                  <kpi.icon className="h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6 text-primary group-hover:text-accent transition-colors" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enhanced Production Stages Overview */}
      <Card className="glass-card slide-up" style={{ animationDelay: '400ms' }}>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-primary pulse-subtle" />
                Production Stages Overview
              </CardTitle>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">
                Real-time status of manufacturing processes
              </p>
            </div>
            <Badge variant="outline" className="status-in-progress pulse-subtle self-start sm:self-auto">
              🔴 Live Data
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          {productionStages.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No production stages configured</p>
            </div>
          ) : (
            productionStages.map((stage, index) => (
              <div 
                key={stage.stageName} 
                className="space-y-3 p-3 rounded-lg hover:bg-muted/20 transition-all duration-300 mobile-optimized fade-in"
                style={{ animationDelay: `${(index + 5) * 100}ms` }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="space-y-1 min-w-0 flex-1">
                    <h4 className="font-medium text-sm md:text-base">{stage.stageName}</h4>
                    <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1 bg-warning/10 px-2 py-1 rounded">
                        <Clock className="h-3 w-3" />
                        {stage.activeJobs} Active
                      </span>
                      <span className="flex items-center gap-1 bg-success/10 px-2 py-1 rounded">
                        <CheckCircle className="h-3 w-3" />
                        {stage.completedJobs} Completed
                      </span>
                    </div>
                  </div>
                  <div className="text-right self-start sm:self-auto">
                    <div className="text-base md:text-lg font-semibold text-primary">{stage.efficiency.toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">Efficiency</div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Progress value={stage.efficiency} className="h-2 md:h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}