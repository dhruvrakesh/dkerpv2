import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface StockMovement {
  transaction_date: string;
  transaction_type: string;
  item_code: string;
  item_name: string;
  quantity: number;
  running_balance: number;
  source_reference: string;
  unit_cost: number;
}

interface StockMovementChartProps {
  data: StockMovement[];
  selectedItem?: string;
}

export const StockMovementChart = ({ data, selectedItem }: StockMovementChartProps) => {
  // Transform data for chart
  const chartData = React.useMemo(() => {
    const filteredData = selectedItem 
      ? data.filter(item => item.item_code === selectedItem)
      : data;

    // Group by date and aggregate
    const grouped = filteredData.reduce((acc, item) => {
      const date = item.transaction_date;
      if (!acc[date]) {
        acc[date] = {
          date,
          grn_qty: 0,
          issue_qty: 0,
          running_balance: item.running_balance
        };
      }
      
      if (item.transaction_type === 'GRN') {
        acc[date].grn_qty += Number(item.quantity);
      } else {
        acc[date].issue_qty += Math.abs(Number(item.quantity));
      }
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [data, selectedItem]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Movement Trends</CardTitle>
        <CardDescription>
          Daily stock movements showing GRN receipts, issues, and running balance
          {selectedItem && ` for ${selectedItem}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs fill-muted-foreground"
                tick={{ fontSize: 12 }}
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
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="grn_qty"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                name="GRN Quantity"
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="issue_qty"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                name="Issue Quantity"
                dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="running_balance"
                stroke="hsl(var(--accent-foreground))"
                strokeWidth={2}
                name="Running Balance"
                dot={{ fill: 'hsl(var(--accent-foreground))', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};