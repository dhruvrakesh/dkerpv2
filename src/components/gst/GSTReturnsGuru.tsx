import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Download, CheckCircle, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { useGSTAnalytics } from '@/hooks/useGSTAnalytics';
import { LoadingState } from '@/components/ui/loading-spinner';
import { formatCurrency } from '@/lib/utils';

export const GSTReturnsGuru: React.FC = () => {
  const { gstReturns, loading, generateGSTReturns, exportGSTData } = useGSTAnalytics();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [returnType, setReturnType] = useState<'GSTR1' | 'GSTR3B'>('GSTR1');

  const handleGenerateReturn = async () => {
    await generateGSTReturns(returnType, selectedMonth, selectedYear);
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (loading) {
    return <LoadingState message="Generating GST returns..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GST Returns Guru</h1>
          <p className="text-muted-foreground">
            Making GST compliance a breeze with intelligent automation
          </p>
        </div>
      </div>

      {/* Return Generation Controls */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate GST Returns
          </CardTitle>
          <CardDescription>
            Select the period and return type to automatically generate compliant GST returns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Return Type</label>
              <Select value={returnType} onValueChange={(value: 'GSTR1' | 'GSTR3B') => setReturnType(value)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GSTR1">GSTR-1</SelectItem>
                  <SelectItem value="GSTR3B">GSTR-3B</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleGenerateReturn} className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Return
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Returns Display */}
      {gstReturns && (
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="details">Detailed Data</TabsTrigger>
            <TabsTrigger value="validation">Validation</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Return Summary</CardTitle>
                <CardDescription>
                  {returnType} for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Total Transactions</div>
                    <div className="text-2xl font-bold">{gstReturns.summary?.total_transactions || 0}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Tax Liability</div>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(gstReturns.summary?.total_tax_liability || 0)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Input Credit</div>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(gstReturns.summary?.total_input_credit || 0)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Net Payable</div>
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(gstReturns.summary?.net_tax_payable || 0)}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                  <Button onClick={() => exportGSTData('json', gstReturns)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download JSON
                  </Button>
                  <Button variant="outline" onClick={() => exportGSTData('excel', gstReturns)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Excel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Return Data</CardTitle>
                <CardDescription>
                  Complete breakdown of all transactions and calculations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {returnType === 'GSTR1' && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Outward Supplies</h4>
                    <div className="max-h-96 overflow-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">GSTIN</th>
                            <th className="text-left p-2">Invoice No.</th>
                            <th className="text-left p-2">Invoice Value</th>
                            <th className="text-left p-2">Tax Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gstReturns.return_data?.outward_supplies?.map((supply: any, index: number) => (
                            <tr key={index} className="border-b">
                              <td className="p-2">{supply.gstin}</td>
                              <td className="p-2">{supply.invoice_number}</td>
                              <td className="p-2">{formatCurrency(supply.invoice_value)}</td>
                              <td className="p-2">{formatCurrency(supply.igst_amount + supply.cgst_amount + supply.sgst_amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {returnType === 'GSTR3B' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-medium mb-3">Outward Supplies</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Inter-state supplies:</span>
                          <span>{formatCurrency(gstReturns.return_data?.outward_supplies?.inter_state || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Intra-state supplies:</span>
                          <span>{formatCurrency(gstReturns.return_data?.outward_supplies?.intra_state || 0)}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Input Tax Credit</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>ITC Available:</span>
                          <span>{formatCurrency(gstReturns.return_data?.inward_supplies?.itc_available || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>ITC Reversed:</span>
                          <span>{formatCurrency(gstReturns.return_data?.inward_supplies?.itc_reversed || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Validation Results
                </CardTitle>
                <CardDescription>
                  Automated checks and compliance validation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {gstReturns.validation_errors?.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-green-600 mb-2">All Validations Passed!</h3>
                    <p className="text-muted-foreground">
                      Your GST return is ready for filing with no validation errors.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {gstReturns.validation_errors?.map((error: any, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                        <div>
                          <div className="font-medium text-destructive">{error.type}</div>
                          <div className="text-sm text-muted-foreground">{error.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>GST Guru Features</CardTitle>
          <CardDescription>
            Smart features to make GST compliance effortless
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <div className="font-medium">Auto-reconciliation</div>
                <div className="text-sm text-muted-foreground">Matches invoices with returns</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <Sparkles className="h-8 w-8 text-primary" />
              <div>
                <div className="font-medium">Smart Validation</div>
                <div className="text-sm text-muted-foreground">AI-powered error detection</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <Clock className="h-8 w-8 text-blue-600" />
              <div>
                <div className="font-medium">Deadline Tracking</div>
                <div className="text-sm text-muted-foreground">Never miss a filing deadline</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};