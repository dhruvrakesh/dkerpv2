import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface DataQualityMetrics {
  overall_quality_score: number;
  completeness_score: number;
  accuracy_score: number;
  consistency_score: number;
  validity_score: number;
  total_fields: number;
  empty_fields: number;
  invalid_formats: number;
  outliers_detected: number;
  duplicate_values: number;
  recommendations: string[];
  quality_issues: string[];
}

interface DataQualityDashboardProps {
  metrics: DataQualityMetrics;
}

export const DataQualityDashboard: React.FC<DataQualityDashboardProps> = ({ metrics }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Overall Quality Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Data Quality Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <div className={`text-4xl font-bold ${getScoreColor(metrics.overall_quality_score)}`}>
              {metrics.overall_quality_score}%
            </div>
            <div className="text-sm text-muted-foreground">Overall Quality Score</div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(metrics.completeness_score)}`}>
                {metrics.completeness_score}%
              </div>
              <div className="text-xs text-muted-foreground">Completeness</div>
              <Progress value={metrics.completeness_score} className="mt-2" />
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(metrics.accuracy_score)}`}>
                {metrics.accuracy_score}%
              </div>
              <div className="text-xs text-muted-foreground">Accuracy</div>
              <Progress value={metrics.accuracy_score} className="mt-2" />
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(metrics.consistency_score)}`}>
                {metrics.consistency_score}%
              </div>
              <div className="text-xs text-muted-foreground">Consistency</div>
              <Progress value={metrics.consistency_score} className="mt-2" />
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(metrics.validity_score)}`}>
                {metrics.validity_score}%
              </div>
              <div className="text-xs text-muted-foreground">Validity</div>
              <Progress value={metrics.validity_score} className="mt-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{metrics.total_fields}</div>
              <div className="text-sm text-muted-foreground">Total Fields</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{metrics.empty_fields}</div>
              <div className="text-sm text-muted-foreground">Empty Fields</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{metrics.invalid_formats}</div>
              <div className="text-sm text-muted-foreground">Invalid Formats</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics.duplicate_values}</div>
              <div className="text-sm text-muted-foreground">Duplicates</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {metrics.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="h-5 w-5" />
              <span>Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.recommendations.map((rec, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">{rec}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};