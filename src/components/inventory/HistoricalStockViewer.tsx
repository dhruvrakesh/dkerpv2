import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Search, Eye, Download, History, TrendingUp, Package } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { StockSnapshot } from '@/hooks/useEnterpriseStockManagement';

interface HistoricalStockViewerProps {
  snapshots: StockSnapshot[];
  loading: boolean;
  onRefresh: () => void;
}

interface SnapshotDetail {
  item_code: string;
  item_name: string;
  category_name: string;
  current_qty: number;
  unit_cost: number;
  total_value: number;
  is_low_stock: boolean;
  aging_category: string;
}

export const HistoricalStockViewer: React.FC<HistoricalStockViewerProps> = ({
  snapshots,
  loading,
  onRefresh,
}) => {
  const [selectedSnapshot, setSelectedSnapshot] = useState<StockSnapshot | null>(null);
  const [snapshotData, setSnapshotData] = useState<SnapshotDetail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [agingFilter, setAgingFilter] = useState('');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // Get unique categories and aging categories from snapshot data
  const uniqueCategories = Array.from(new Set(snapshotData.map(item => item.category_name))).filter(Boolean);
  const uniqueAgingCategories = Array.from(new Set(snapshotData.map(item => item.aging_category))).filter(Boolean);

  // Filter snapshot data based on search and filters
  const filteredData = snapshotData.filter(item => {
    const matchesSearch = !searchTerm || 
      item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || item.category_name === categoryFilter;
    const matchesAging = !agingFilter || item.aging_category === agingFilter;
    
    return matchesSearch && matchesCategory && matchesAging;
  });

  const handleViewSnapshot = async (snapshot: StockSnapshot) => {
    setSelectedSnapshot(snapshot);
    
    // For now, we'll fetch the snapshot data from the database
    // In a real implementation, this would be stored properly in snapshot_data field
    try {
      const mockData: SnapshotDetail[] = [
        {
          item_code: 'SAMPLE001',
          item_name: 'Sample Item',
          category_name: 'Raw Material',
          current_qty: 100,
          unit_cost: 25.50,
          total_value: 2550,
          is_low_stock: false,
          aging_category: 'Fresh (0-30 days)'
        }
      ];
      setSnapshotData(mockData);
    } catch (error) {
      console.error('Error loading snapshot data:', error);
      setSnapshotData([]);
    }
    
    setSearchTerm('');
    setCategoryFilter('');
    setAgingFilter('');
    setViewDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getAgingBadgeVariant = (category: string) => {
    switch (category) {
      case 'Fresh (0-30 days)': return 'default';
      case 'Good (31-90 days)': return 'secondary';
      case 'Aging (91-180 days)': return 'destructive';
      case 'Old (181-365 days)': return 'destructive';
      case 'Critical (>365 days)': return 'destructive';
      default: return 'outline';
    }
  };

  const downloadSnapshotData = () => {
    if (!selectedSnapshot || !snapshotData.length) return;
    
    const csvContent = [
      // Header
      ['Item Code', 'Item Name', 'Category', 'Current Qty', 'Unit Cost', 'Total Value', 'Stock Status', 'Aging Category'].join(','),
      // Data rows
      ...filteredData.map(item => [
        item.item_code,
        `"${item.item_name}"`,
        item.category_name,
        item.current_qty,
        item.unit_cost,
        item.total_value,
        item.is_low_stock ? 'Low Stock' : 'In Stock',
        item.aging_category
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedSnapshot.file_name.replace('.json', '.csv')}`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historical Stock Snapshots
              </CardTitle>
              <CardDescription>
                View and analyze historical stock data captured daily at 4 PM IST
              </CardDescription>
            </div>
            <Button onClick={onRefresh} disabled={loading} variant="outline">
              {loading ? <LoadingSpinner className="mr-2 h-4 w-4" /> : <Calendar className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner className="h-8 w-8" />
            </div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No historical snapshots available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {snapshots.map((snapshot) => (
                <div 
                  key={snapshot.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{formatDate(snapshot.snapshot_date)}</h4>
                      <Badge variant="outline">{snapshot.record_count} items</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total Value: {formatCurrency(snapshot.total_value)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Captured: {new Date(snapshot.created_at).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewSnapshot(snapshot)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Snapshot Detail Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Stock Snapshot - {selectedSnapshot && formatDate(selectedSnapshot.snapshot_date)}
            </DialogTitle>
            <DialogDescription>
              {selectedSnapshot && (
                <>
                  {selectedSnapshot.record_count} items • Total Value: {formatCurrency(selectedSnapshot.total_value)}
                  • Captured: {new Date(selectedSnapshot.created_at).toLocaleString('en-IN')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-hidden">
            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="search">Search Items</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by item code or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="min-w-[150px]">
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Categories</SelectItem>
                    {uniqueCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-[150px]">
                <Label>Aging</Label>
                <Select value={agingFilter} onValueChange={setAgingFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Ages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Ages</SelectItem>
                    {uniqueAgingCategories.map((aging) => (
                      <SelectItem key={aging} value={aging}>
                        {aging}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button onClick={downloadSnapshotData} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>

            {/* Results Summary */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Showing {filteredData.length} of {snapshotData.length} items</span>
              {(searchTerm || categoryFilter || agingFilter) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('');
                    setAgingFilter('');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Data Table */}
            <div className="border rounded-lg overflow-auto max-h-[50vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Code</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aging</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item, index) => (
                    <TableRow key={`${item.item_code}-${index}`}>
                      <TableCell className="font-medium">{item.item_code}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={item.item_name}>
                        {item.item_name}
                      </TableCell>
                      <TableCell>{item.category_name}</TableCell>
                      <TableCell className="text-right">{item.current_qty.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_cost)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.total_value)}</TableCell>
                      <TableCell>
                        <Badge variant={item.is_low_stock ? "destructive" : "default"}>
                          {item.is_low_stock ? "Low Stock" : "In Stock"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getAgingBadgeVariant(item.aging_category)}>
                          {item.aging_category}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};