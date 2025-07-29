import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { StockValuationItem, ValuationMethod } from '@/hooks/useStockValuation';

interface StockValuationTableProps {
  data: StockValuationItem[];
  selectedMethod: ValuationMethod['id'];
  loading: boolean;
}

export const StockValuationTable: React.FC<StockValuationTableProps> = ({
  data,
  selectedMethod,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof StockValuationItem>('item_code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter and sort data
  const filteredData = data
    .filter(item => 
      item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

  const handleSort = (column: keyof StockValuationItem) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) > 50) return 'text-destructive';
    if (Math.abs(variance) > 25) return 'text-warning';
    return 'text-success';
  };

  const getVarianceIcon = (variance: number) => {
    return variance > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />;
  };

  const getMethodColumnTitle = (method: ValuationMethod['id']) => {
    switch (method) {
      case 'grn_average': return 'GRN Avg Price';
      case 'standard_cost': return 'Standard Cost';
      case 'opening_stock': return 'Opening Price';
      case 'custom_upload': return 'Custom Price';
      default: return 'Price';
    }
  };

  const getMethodPrice = (item: StockValuationItem, method: ValuationMethod['id']) => {
    switch (method) {
      case 'grn_average': return item.grn_avg_price;
      case 'standard_cost': return item.standard_cost;
      case 'opening_stock': return item.opening_stock_price;
      case 'custom_upload': return item.custom_upload_price;
      default: return 0;
    }
  };

  const getMethodTotalValue = (item: StockValuationItem, method: ValuationMethod['id']) => {
    switch (method) {
      case 'grn_average': return item.grn_total_value;
      case 'standard_cost': return item.standard_total_value;
      case 'opening_stock': return item.opening_total_value;
      case 'custom_upload': return item.custom_total_value;
      default: return 0;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Badge variant="outline">
          {filteredData.length} of {data.length} items
        </Badge>
      </div>

      {/* Table */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('item_code')}
                  className="h-auto p-0 font-medium"
                >
                  Item Code
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('item_name')}
                  className="h-auto p-0 font-medium"
                >
                  Item Name
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('current_qty')}
                  className="h-auto p-0 font-medium"
                >
                  Qty
                  <ArrowUpDown className="ml-2 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right">{getMethodColumnTitle(selectedMethod)}</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead className="text-right">Variance %</TableHead>
              <TableHead className="text-center">Other Methods</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item) => {
              const selectedPrice = getMethodPrice(item, selectedMethod);
              const selectedValue = getMethodTotalValue(item, selectedMethod);
              
              return (
                <TableRow key={item.item_code}>
                  <TableCell className="font-medium">{item.item_code}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={item.item_name}>
                    {item.item_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.category_name}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{item.current_qty.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {selectedPrice > 0 ? formatCurrency(selectedPrice) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {selectedValue > 0 ? formatCurrency(selectedValue) : '-'}
                  </TableCell>
                  <TableCell className={`text-right ${getVarianceColor(item.variance_percentage)}`}>
                    <div className="flex items-center justify-end gap-1">
                      {getVarianceIcon(item.variance_percentage)}
                      {Math.abs(item.variance_percentage).toFixed(1)}%
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-xs">
                      {selectedMethod !== 'grn_average' && item.grn_avg_price > 0 && (
                        <div className="flex justify-between">
                          <span>GRN:</span>
                          <span>{formatCurrency(item.grn_avg_price)}</span>
                        </div>
                      )}
                      {selectedMethod !== 'standard_cost' && item.standard_cost > 0 && (
                        <div className="flex justify-between">
                          <span>Std:</span>
                          <span>{formatCurrency(item.standard_cost)}</span>
                        </div>
                      )}
                      {selectedMethod !== 'opening_stock' && item.opening_stock_price > 0 && (
                        <div className="flex justify-between">
                          <span>Open:</span>
                          <span>{formatCurrency(item.opening_stock_price)}</span>
                        </div>
                      )}
                      {selectedMethod !== 'custom_upload' && item.custom_upload_price > 0 && (
                        <div className="flex justify-between">
                          <span>Custom:</span>
                          <span>{formatCurrency(item.custom_upload_price)}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No items found matching your search criteria.
        </div>
      )}
    </div>
  );
};