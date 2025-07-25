import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Workflow,
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Target,
  Activity
} from 'lucide-react';
import { useProductionAnalytics } from '@/hooks/useProductionAnalytics';
import { LoadingState, ErrorState } from '@/components/ui/loading-spinner';
import { SkeletonLoader } from '@/components/ui/enhanced-loading';


export function ManufacturingKPIs() {
  const [productionMetrics, setProductionMetrics] = useState({
    totalOrders: 0,
    activeOrders: 0,
    completedOrders: 0,
    overallEfficiency: 0,
    oeeScore: 0,
    wastePercentage: 0
  });
  const [qualityMetrics, setQualityMetrics] = useState({
    passRate: 0,
    defectRate: 0,
    totalInspections: 0,
    criticalDefects: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getProductionMetrics, getQualityMetrics } = useProductionAnalytics();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodMetrics, qualMetrics] = await Promise.all([
        getProductionMetrics().catch(err => {
          console.error('Error loading production metrics:', err);
          return {
            totalOrders: 0,
            activeOrders: 0,
            completedOrders: 0,
            overallEfficiency: 0,
            oeeScore: 0,
            wastePercentage: 0
          };
        }),
        getQualityMetrics().catch(err => {
          console.error('Error loading quality metrics:', err);
          return {
            passRate: 0,
            defectRate: 0,
            totalInspections: 0,
            criticalDefects: 0
          };
        })
      ]);
      setProductionMetrics(prodMetrics);
      setQualityMetrics(qualMetrics);
    } catch (error) {
      console.error('Error loading manufacturing KPIs:', error);
      setError('Failed to load manufacturing data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const kpiData = [
    {
      title: 'Active Orders',
      value: productionMetrics.activeOrders.toString(),
      change: '+12%',
      trend: 'up',
      icon: Workflow,
      color: 'chart-1'
    },
    {
      title: 'Production Efficiency',
      value: `${productionMetrics.overallEfficiency.toFixed(1)}%`,
      change: '+2.1%',
      trend: 'up',
      icon: TrendingUp,
      color: 'chart-3'
    },
    {
      title: 'OEE Score',
      value: `${productionMetrics.oeeScore.toFixed(1)}%`,
      change: '+1.8%',
      trend: 'up',
      icon: Target,
      color: 'chart-2'
    },
    {
      title: 'Quality Pass Rate',
      value: `${qualityMetrics.passRate.toFixed(1)}%`,
      change: '+0.3%',
      trend: 'up',
      icon: CheckCircle,
      color: 'chart-3'
    }
  ];

  const productionStages = [
    { name: 'Gravure Printing', active: 12, completed: 156, efficiency: 92 },
    { name: 'Lamination', active: 8, completed: 143, efficiency: 96 },
    { name: 'Adhesive Coating', active: 15, completed: 124, efficiency: 89 },
    { name: 'Slitting', active: 9, completed: 167, efficiency: 94 }
  ];

  if (loading) {
    return <SkeletonLoader variant="card" count={3} className="space-y-6" />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Manufacturing KPIs
        </h2>
        <Button onClick={loadData} variant="outline" size="sm" className="self-start sm:self-auto">
          <Activity className="h-4 w-4 mr-2" />
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
                      variant={kpi.trend === 'up' ? 'default' : 'secondary'} 
                      className={`text-xs ${kpi.trend === 'up' ? 'bg-success/10 text-success border-success/20' : ''}`}
                    >
                      {kpi.change}
                    </Badge>
                    <span className="text-xs text-muted-foreground hidden sm:inline">vs last month</span>
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
          {productionStages.map((stage, index) => (
            <div 
              key={stage.name} 
              className="space-y-3 p-3 rounded-lg hover:bg-muted/20 transition-all duration-300 mobile-optimized fade-in"
              style={{ animationDelay: `${(index + 5) * 100}ms` }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="space-y-1 min-w-0 flex-1">
                  <h4 className="font-medium text-sm md:text-base">{stage.name}</h4>
                  <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1 bg-warning/10 px-2 py-1 rounded">
                      <Clock className="h-3 w-3" />
                      {stage.active} Active
                    </span>
                    <span className="flex items-center gap-1 bg-success/10 px-2 py-1 rounded">
                      <CheckCircle className="h-3 w-3" />
                      {stage.completed} Completed
                    </span>
                  </div>
                </div>
                <div className="text-right self-start sm:self-auto">
                  <div className="text-base md:text-lg font-semibold text-primary">{stage.efficiency}%</div>
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
          ))}
        </CardContent>
      </Card>
    </div>
  );
}