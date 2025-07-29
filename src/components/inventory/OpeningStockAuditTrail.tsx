import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { History, User, Calendar, FileText } from 'lucide-react';

interface AuditTrailEntry {
  id: string;
  action: string;
  user_id: string;
  timestamp: string;
  details: any;
  affected_items: number;
}

interface OpeningStockAuditTrailProps {
  auditTrail: AuditTrailEntry[];
  loading: boolean;
}

export function OpeningStockAuditTrail({ auditTrail, loading }: OpeningStockAuditTrailProps) {
  const formatTimestamp = (timestamp: string) => {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(timestamp));
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action.toLowerCase()) {
      case 'import':
        return 'default';
      case 'export':
        return 'secondary';
      case 'update':
        return 'outline';
      case 'delete':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'import':
        return <FileText className="h-4 w-4" />;
      case 'export':
        return <FileText className="h-4 w-4" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Audit Trail
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete history of all opening stock operations and modifications
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading audit trail...</div>
          </div>
        ) : auditTrail && auditTrail.length > 0 ? (
          <div className="space-y-4">
            {auditTrail.map((entry, index) => (
              <div key={entry.id}>
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                    {getActionIcon(entry.action)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={getActionBadgeVariant(entry.action)}>
                          {entry.action}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {entry.affected_items} items affected
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatTimestamp(entry.timestamp)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>User ID: {entry.user_id}</span>
                    </div>

                    {entry.details && (
                      <div className="text-sm">
                        <p className="font-medium">Details:</p>
                        <div className="mt-1 p-2 bg-muted rounded text-xs">
                          <pre className="whitespace-pre-wrap">
                            {typeof entry.details === 'string' 
                              ? entry.details 
                              : JSON.stringify(entry.details, null, 2)
                            }
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {index < auditTrail.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Audit Trail</h3>
            <p className="text-sm text-muted-foreground">
              No opening stock operations have been recorded yet.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}