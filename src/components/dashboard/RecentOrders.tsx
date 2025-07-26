import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Eye, 
  MoreHorizontal, 
  Package,
  Calendar,
  User,
  ClipboardList
} from 'lucide-react';
import { useRealOrderData } from '@/hooks/useRealOrderData';


const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Completed':
      return <Badge className="status-completed">Completed</Badge>;
    case 'In Production':
      return <Badge className="status-in-progress">In Production</Badge>;
    case 'Quality Check':
      return <Badge className="status-in-progress">Quality Check</Badge>;
    case 'Pending':
      return <Badge className="status-pending">Pending</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'High':
      return <Badge variant="destructive" className="text-xs">High</Badge>;
    case 'Medium':
      return <Badge variant="secondary" className="text-xs">Medium</Badge>;
    case 'Low':
      return <Badge variant="outline" className="text-xs">Low</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{priority}</Badge>;
  }
};

export function RecentOrders() {
  const { loading, orders, hasData, getStatusDisplay, getPriorityDisplay, getCustomerName } = useRealOrderData();

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

  if (!hasData) {
    return (
      <Card className="card-enterprise">
        <CardContent className="p-0">
          <EmptyState
            icon={ClipboardList}
            title="No Orders Yet"
            description="Create your first manufacturing order to start tracking order progress and status."
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
    <Card className="card-enterprise">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Recent Orders
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Latest manufacturing orders and their current status
            </p>
          </div>
          <Button variant="outline" size="sm">
            View All Orders
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="data-grid">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Item & Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const progress = order.status === 'completed' ? 100 : 
                               order.status === 'in_production' ? 50 : 
                               order.status === 'quality_check' ? 85 : 10;
                
                return (
                  <TableRow key={order.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-sm font-medium">
                      {order.order_number}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{order.item_name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {getCustomerName(order.customer_info)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(getStatusDisplay(order.status))}
                        <div className="text-xs text-muted-foreground">
                          {order.status === 'in_production' ? 'Processing' : 'Stage Complete'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'TBD'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPriorityBadge(getPriorityDisplay(order.priority_level))}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}