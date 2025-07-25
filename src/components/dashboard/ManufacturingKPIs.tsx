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
  const { getProductionMetrics, getQualityMetrics } = useProductionAnalytics();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodMetrics, qualMetrics] = await Promise.all([
        getProductionMetrics(),
        getQualityMetrics()
      ]);
      setProductionMetrics(prodMetrics);
      setQualityMetrics(qualMetrics);
    } catch (error) {
      console.error('Error loading manufacturing KPIs:', error);
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
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading manufacturing KPIs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Manufacturing KPIs</h2>
        <Button onClick={loadData} variant="outline" size="sm">
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi) => (
          <Card key={kpi.title} className="kpi-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  <p className="metric-primary">{kpi.value}</p>
                  <div className="flex items-center gap-1">
                    <Badge 
                      variant={kpi.trend === 'up' ? 'default' : 'secondary'} 
                      className={`text-xs ${kpi.trend === 'up' ? 'bg-success/10 text-success border-success/20' : ''}`}
                    >
                      {kpi.change}
                    </Badge>
                    <span className="text-xs text-muted-foreground">vs last month</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-primary/10">
                  <kpi.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Production Stages Overview */}
      <Card className="card-enterprise">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Production Stages Overview
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time status of manufacturing processes
              </p>
            </div>
            <Badge variant="outline" className="status-in-progress">
              Live Data
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {productionStages.map((stage) => (
            <div key={stage.name} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="font-medium">{stage.name}</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {stage.active} Active
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {stage.completed} Completed
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">{stage.efficiency}%</div>
                  <div className="text-xs text-muted-foreground">Efficiency</div>
                </div>
              </div>
              <Progress value={stage.efficiency} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}