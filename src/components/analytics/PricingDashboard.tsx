import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertCircle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface PricingData {
  pricing_source: string;
  unit_price: number;
  total_price: number;
  discount_applied: number;
  margin_percentage: number;
  is_primary: boolean;
}

interface PricingDashboardProps {
  onCalculatePricing: (itemCode: string, customerTier: string, quantity: number) => Promise<PricingData[]>;
  items: Array<{ item_code: string; item_name: string; }>;
}

export const PricingDashboard = ({ onCalculatePricing, items }: PricingDashboardProps) => {
  const [selectedItem, setSelectedItem] = useState('');
  const [customerTier, setCustomerTier] = useState('standard');
  const [quantity, setQuantity] = useState(1);
  const [pricingResults, setPricingResults] = useState<PricingData[]>([]);
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    if (!selectedItem) return;
    
    setLoading(true);
    try {
      const results = await onCalculatePricing(selectedItem, customerTier, quantity);
      setPricingResults(results);
    } catch (error) {
      console.error('Error calculating pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (isPrimary: boolean, source: string) => {
    if (isPrimary) {
      return <CheckCircle className="h-4 w-4 text-primary" />;
    }
    if (source.includes('GRN')) {
      return <TrendingUp className="h-4 w-4 text-chart-2" />;
    }
    return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  };

  const getSourceBadge = (source: string, isPrimary: boolean) => {
    if (isPrimary) {
      return <Badge variant="default">{source}</Badge>;
    }
    if (source.includes('GRN')) {
      return <Badge variant="secondary">{source}</Badge>;
    }
    return <Badge variant="outline">{source}</Badge>;
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 30) return 'text-primary';
    if (margin >= 15) return 'text-chart-2';
    if (margin >= 5) return 'text-chart-3';
    return 'text-destructive';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Intelligent Pricing Calculator
          </CardTitle>
          <CardDescription>
            Three-tier pricing system: Pricing Master → GRN Average → Item Master Cost
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium">Item</label>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.item_code} value={item.item_code}>
                      {item.item_code} - {item.item_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Customer Tier</label>
              <Select value={customerTier} onValueChange={setCustomerTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="bulk">Bulk</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min="1"
              />
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={handleCalculate} 
                disabled={!selectedItem || loading}
                className="w-full"
              >
                {loading ? 'Calculating...' : 'Calculate Pricing'}
              </Button>
            </div>
          </div>

          {pricingResults.length > 0 && (
            <Tabs defaultValue="pricing" className="w-full">
              <TabsList>
                <TabsTrigger value="pricing">Pricing Hierarchy</TabsTrigger>
                <TabsTrigger value="analysis">Margin Analysis</TabsTrigger>
              </TabsList>
              
              <TabsContent value="pricing">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Pricing Results</CardTitle>
                    <CardDescription>
                      Available pricing options ranked by priority
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Priority</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total Price</TableHead>
                          <TableHead>Discount</TableHead>
                          <TableHead>Margin %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pricingResults.map((result, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getPriorityIcon(result.is_primary, result.pricing_source)}
                                <span className="text-sm">
                                  {result.is_primary ? 'Primary' : `Option ${index}`}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getSourceBadge(result.pricing_source, result.is_primary)}
                            </TableCell>
                            <TableCell>
                              ₹{Number(result.unit_price).toLocaleString('en-IN', { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                              })}
                            </TableCell>
                            <TableCell className="font-medium">
                              ₹{Number(result.total_price).toLocaleString('en-IN', { 
                                minimumFractionDigits: 2, 
                                maximumFractionDigits: 2 
                              })}
                            </TableCell>
                            <TableCell>
                              {result.discount_applied > 0 ? (
                                <Badge variant="secondary">
                                  {result.discount_applied}%
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className={getMarginColor(result.margin_percentage)}>
                                {result.margin_percentage > 0 ? (
                                  <div className="flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    {result.margin_percentage.toFixed(1)}%
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <TrendingDown className="h-3 w-3" />
                                    {Math.abs(result.margin_percentage).toFixed(1)}%
                                  </div>
                                )}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="analysis">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {pricingResults.map((result, index) => (
                    <Card key={index} className={result.is_primary ? 'ring-2 ring-primary' : ''}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          {getPriorityIcon(result.is_primary, result.pricing_source)}
                          {result.pricing_source}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <div>
                            <div className="text-2xl font-bold">
                              ₹{Number(result.unit_price).toLocaleString('en-IN', { 
                                maximumFractionDigits: 2 
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">Unit Price</div>
                          </div>
                          
                          <div>
                            <div className="text-lg font-semibold">
                              ₹{Number(result.total_price).toLocaleString('en-IN', { 
                                maximumFractionDigits: 2 
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Total for {quantity} units
                            </div>
                          </div>
                          
                          <div className="flex justify-between">
                            <div>
                              <div className="text-sm font-medium">
                                {result.discount_applied}%
                              </div>
                              <div className="text-xs text-muted-foreground">Discount</div>
                            </div>
                            <div>
                              <div className={`text-sm font-medium ${getMarginColor(result.margin_percentage)}`}>
                                {result.margin_percentage.toFixed(1)}%
                              </div>
                              <div className="text-xs text-muted-foreground">Margin</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};