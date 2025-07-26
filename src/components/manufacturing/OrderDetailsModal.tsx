import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Clock, User, Package, Calendar, Target, MapPin } from 'lucide-react';

interface OrderDetailsModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose
}) => {
  if (!order) return null;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'default';
      case 'on_hold':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-100 border-green-300';
      case 'in_progress':
        return 'text-blue-700 bg-blue-100 border-blue-300';
      case 'on_hold':
        return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'cancelled':
        return 'text-red-700 bg-red-100 border-red-300';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-300';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Details - UIORN: {order.uiorn}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Order Number:</span>
                  <span>{order.order_number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Item Name:</span>
                  <span>{order.item_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Quantity:</span>
                  <span>{order.order_quantity?.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Status:</span>
                  <Badge 
                    variant={getStatusBadgeVariant(order.status)}
                    className={getStatusColor(order.status)}
                  >
                    {order.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Delivery Date:</span>
                  <span>
                    {order.delivery_date 
                      ? new Date(order.delivery_date).toLocaleDateString()
                      : 'Not set'
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Priority:</span>
                  <Badge variant={order.priority_level >= 3 ? 'destructive' : 'secondary'}>
                    {order.priority_level === 1 ? 'Low' :
                     order.priority_level === 2 ? 'Medium' :
                     order.priority_level === 3 ? 'High' : 'Critical'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Item Code:</span>
                  <span className="font-mono text-sm">{order.item_code}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          {order.customer_info && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div><strong>Name:</strong> {order.customer_info.customer_name || 'N/A'}</div>
                  <div><strong>Contact Person:</strong> {order.customer_info.contact_person || 'N/A'}</div>
                </div>
                <div className="space-y-2">
                  <div><strong>Email:</strong> {order.customer_info.email || 'N/A'}</div>
                  <div><strong>Phone:</strong> {order.customer_info.phone || 'N/A'}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Specifications */}
          {(order.specifications || order.substrate_details || order.printing_details) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Technical Specifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.specifications && Object.keys(order.specifications).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">General Specifications</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {Object.entries(order.specifications).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-medium">{key.replace('_', ' ')}:</span>
                          <span>{value as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {order.substrate_details && Object.keys(order.substrate_details).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Substrate Details</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {Object.entries(order.substrate_details).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-medium">{key.replace('_', ' ')}:</span>
                          <span>{value as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {order.printing_details && Object.keys(order.printing_details).length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Printing Details</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {Object.entries(order.printing_details).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-medium">{key.replace('_', ' ')}:</span>
                          <span>{Array.isArray(value) ? value.join(', ') : value as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Workflow Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Production Workflow Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.workflow_progress
                  ?.filter((progress: any) => progress.stage) // Only show progress with valid stages
                  ?.sort((a: any, b: any) => 
                    (a.stage?.sequence_order || 0) - (b.stage?.sequence_order || 0)
                  )
                  ?.map((progress: any, index: number) => (
                  <div key={progress.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{progress.stage?.stage_name}</span>
                        <Badge 
                          variant={getStatusBadgeVariant(progress.status)}
                          className={getStatusColor(progress.status)}
                        >
                          {progress.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {progress.progress_percentage || 0}% Complete
                      </div>
                    </div>
                    
                    <Progress value={progress.progress_percentage || 0} className="mb-2" />
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                      {progress.started_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Started: {new Date(progress.started_at).toLocaleDateString()}
                        </div>
                      )}
                      {progress.completed_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Completed: {new Date(progress.completed_at).toLocaleDateString()}
                        </div>
                      )}
                      {progress.assigned_to && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Assigned: {progress.assigned_to}
                        </div>
                      )}
                      <div>Quality: {progress.quality_status || 'Pending'}</div>
                    </div>
                    
                    {progress.notes && (
                      <div className="mt-2 text-sm">
                        <strong>Notes:</strong> {progress.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};