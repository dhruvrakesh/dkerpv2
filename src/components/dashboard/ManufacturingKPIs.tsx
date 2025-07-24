import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Workflow,
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Target
} from 'lucide-react';

const kpiData = [
  {
    title: 'Active Orders',
    value: '47',
    change: '+12%',
    trend: 'up',
    icon: Workflow,
    color: 'chart-1'
  },
  {
    title: 'Production Efficiency',
    value: '94.2%',
    change: '+2.1%',
    trend: 'up',
    icon: TrendingUp,
    color: 'chart-3'
  },
  {
    title: 'Pending Orders',
    value: '23',
    change: '-8%',
    trend: 'down',
    icon: Clock,
    color: 'chart-2'
  },
  {
    title: 'Quality Rate',
    value: '98.7%',
    change: '+0.3%',
    trend: 'up',
    icon: Target,
    color: 'chart-3'
  }
];

const productionStages = [
  { name: 'Gravure Printing', active: 12, completed: 156, efficiency: 92 },
  { name: 'Lamination', active: 8, completed: 143, efficiency: 96 },
  { name: 'Adhesive Coating', active: 15, completed: 124, efficiency: 89 },
  { name: 'Slitting', active: 9, completed: 167, efficiency: 94 }
];

export function ManufacturingKPIs() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi) => (
          <Card key={kpi.title} className="kpi-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  <p className={`text-3xl font-bold text-${kpi.color}`}>{kpi.value}</p>
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
                <div className={`p-3 rounded-lg bg-${kpi.color}/10`}>
                  <kpi.icon className={`h-6 w-6 text-${kpi.color}`} />
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