import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StockAging {
  item_code: string;
  item_name: string;
  category_name: string;
  current_qty: number;
  last_movement_date: string;
  days_since_movement: number;
  aging_category: string;
  estimated_value: number;
}

interface StockAgingChartProps {
  data: StockAging[];
}

export const StockAgingChart = ({ data }: StockAgingChartProps) => {
  // Aggregate data by aging category
  const agingData = React.useMemo(() => {
    const categories = data.reduce((acc, item) => {
      const category = item.aging_category;
      if (!acc[category]) {
        acc[category] = {
          category,
          item_count: 0,
          total_value: 0,
          total_qty: 0
        };
      }
      acc[category].item_count += 1;
      acc[category].total_value += Number(item.estimated_value || 0);
      acc[category].total_qty += Number(item.current_qty || 0);
      return acc;
    }, {} as Record<string, any>);

    return Object.values(categories).sort((a: any, b: any) => {
      const order = ['Fresh (0-30 days)', 'Good (31-90 days)', 'Aging (91-180 days)', 'Old (181-365 days)', 'Critical (>365 days)'];
      return order.indexOf(a.category) - order.indexOf(b.category);
    });
  }, [data]);

  const getBarColor = (category: string) => {
    switch (category) {
      case 'Fresh (0-30 days)': return 'hsl(var(--primary))';
      case 'Good (31-90 days)': return 'hsl(var(--chart-2))';
      case 'Aging (91-180 days)': return 'hsl(var(--chart-3))';
      case 'Old (181-365 days)': return 'hsl(var(--chart-4))';
      case 'Critical (>365 days)': return 'hsl(var(--destructive))';
      default: return 'hsl(var(--muted))';
    }
  };

  const getBadgeVariant = (category: string) => {
    switch (category) {
      case 'Fresh (0-30 days)': return 'default';
      case 'Good (31-90 days)': return 'secondary';
      case 'Aging (91-180 days)': return 'outline';
      case 'Old (181-365 days)': return 'outline';
      case 'Critical (>365 days)': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Stock Aging Analysis</CardTitle>
          <CardDescription>
            Inventory breakdown by age categories showing value and quantity distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="category" 
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis 
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--card-foreground))'
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'total_value' 
                      ? `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                      : Number(value).toLocaleString('en-IN'),
                    name === 'total_value' ? 'Total Value' : 
                    name === 'item_count' ? 'Item Count' : 'Total Quantity'
                  ]}
                />
                <Bar dataKey="total_value" name="Total Value">
                  {agingData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.category)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {agingData.map((category: any) => (
          <Card key={category.category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                <Badge variant={getBadgeVariant(category.category) as any} className="text-xs">
                  {category.category}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {category.item_count}
                </div>
                <div className="text-xs text-muted-foreground">
                  Items
                </div>
                <div className="text-sm font-medium">
                  ₹{Number(category.total_value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {Number(category.total_qty).toLocaleString('en-IN')} units
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};