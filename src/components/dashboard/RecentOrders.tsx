import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  User
} from 'lucide-react';

const recentOrders = [
  {
    id: 'DKEGL-2024-001',
    itemName: 'Premium Tape 50mm',
    customer: 'Hindustan Unilever',
    status: 'In Production',
    stage: 'Gravure Printing',
    progress: 45,
    dueDate: '2024-01-28',
    priority: 'High'
  },
  {
    id: 'DKEGL-2024-002',
    itemName: 'Industrial Adhesive Tape',
    customer: 'ITC Limited',
    status: 'Quality Check',
    stage: 'Slitting',
    progress: 85,
    dueDate: '2024-01-30',
    priority: 'Medium'
  },
  {
    id: 'DKEGL-2024-003',
    itemName: 'Packaging Tape 25mm',
    customer: 'Nestle India',
    status: 'Pending',
    stage: 'Order Review',
    progress: 10,
    dueDate: '2024-02-05',
    priority: 'Low'
  },
  {
    id: 'DKEGL-2024-004',
    itemName: 'Security Tape Custom',
    customer: 'Amazon India',
    status: 'Completed',
    stage: 'Dispatched',
    progress: 100,
    dueDate: '2024-01-25',
    priority: 'High'
  },
  {
    id: 'DKEGL-2024-005',
    itemName: 'Double Sided Tape',
    customer: 'Flipkart',
    status: 'In Production',
    stage: 'Lamination',
    progress: 60,
    dueDate: '2024-02-01',
    priority: 'Medium'
  }
];

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
              {recentOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-sm font-medium">
                    {order.id}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{order.itemName}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {order.customer}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {getStatusBadge(order.status)}
                      <div className="text-xs text-muted-foreground">{order.stage}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{order.progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${order.progress}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {order.dueDate}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getPriorityBadge(order.priority)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}