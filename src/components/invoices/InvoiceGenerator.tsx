import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, FileText, Download, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LineItem {
  id: string;
  item_code?: string;
  item_name: string;
  hsn_code?: string;
  quantity: number;
  unit_rate: number;
  discount_percentage: number;
  discount_amount: number;
  taxable_amount: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
}

interface InvoiceData {
  invoice_number: string;
  invoice_type: string;
  bill_date: string;
  party_name: string;
  party_gstin: string;
  party_address: string;
  party_state_code: string;
  place_of_supply: string;
  line_items: LineItem[];
  total_taxable_amount: number;
  total_cgst_amount: number;
  total_sgst_amount: number;
  total_igst_amount: number;
  round_off_amount: number;
  invoice_amount: number;
}

export function InvoiceGenerator() {
  const { toast } = useToast();
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    invoice_number: '',
    invoice_type: 'tax_invoice',
    bill_date: new Date().toISOString().split('T')[0],
    party_name: '',
    party_gstin: '',
    party_address: '',
    party_state_code: '',
    place_of_supply: '',
    line_items: [],
    total_taxable_amount: 0,
    total_cgst_amount: 0,
    total_sgst_amount: 0,
    total_igst_amount: 0,
    round_off_amount: 0,
    invoice_amount: 0
  });

  const [isLoading, setIsLoading] = useState(false);

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      item_name: '',
      hsn_code: '',
      quantity: 1,
      unit_rate: 0,
      discount_percentage: 0,
      discount_amount: 0,
      taxable_amount: 0,
      cgst_rate: 9,
      sgst_rate: 9,
      igst_rate: 0,
      cgst_amount: 0,
      sgst_amount: 0,
      igst_amount: 0,
      total_amount: 0
    };
    setInvoiceData(prev => ({
      ...prev,
      line_items: [...prev.line_items, newItem]
    }));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setInvoiceData(prev => ({
      ...prev,
      line_items: prev.line_items.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const calculateLineItemTotals = (item: LineItem) => {
    const grossAmount = item.quantity * item.unit_rate;
    const discountAmount = item.discount_percentage > 0 
      ? (grossAmount * item.discount_percentage) / 100 
      : item.discount_amount;
    const taxableAmount = grossAmount - discountAmount;
    
    // Check if interstate (IGST) or intrastate (CGST + SGST)
    const isInterstate = invoiceData.party_state_code !== '36'; // Assuming company is in Karnataka (36)
    
    let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
    
    if (isInterstate) {
      igstAmount = (taxableAmount * item.igst_rate) / 100;
    } else {
      cgstAmount = (taxableAmount * item.cgst_rate) / 100;
      sgstAmount = (taxableAmount * item.sgst_rate) / 100;
    }
    
    const totalAmount = taxableAmount + cgstAmount + sgstAmount + igstAmount;
    
    return {
      ...item,
      discount_amount: discountAmount,
      taxable_amount: taxableAmount,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      total_amount: totalAmount
    };
  };

  const removeLineItem = (id: string) => {
    setInvoiceData(prev => ({
      ...prev,
      line_items: prev.line_items.filter(item => item.id !== id)
    }));
  };

  const calculateTotals = () => {
    const updatedItems = invoiceData.line_items.map(calculateLineItemTotals);
    
    const totals = updatedItems.reduce((acc, item) => ({
      taxable: acc.taxable + item.taxable_amount,
      cgst: acc.cgst + item.cgst_amount,
      sgst: acc.sgst + item.sgst_amount,
      igst: acc.igst + item.igst_amount,
      total: acc.total + item.total_amount
    }), { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 });

    const roundedTotal = Math.round(totals.total);
    const roundOff = roundedTotal - totals.total;

    setInvoiceData(prev => ({
      ...prev,
      line_items: updatedItems,
      total_taxable_amount: totals.taxable,
      total_cgst_amount: totals.cgst,
      total_sgst_amount: totals.sgst,
      total_igst_amount: totals.igst,
      round_off_amount: roundOff,
      invoice_amount: roundedTotal
    }));
  };

  useEffect(() => {
    calculateTotals();
  }, [invoiceData.line_items.length, invoiceData.party_state_code]);

  const saveInvoice = async () => {
    if (!invoiceData.invoice_number || !invoiceData.party_name || invoiceData.line_items.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in invoice number, party name, and add at least one line item",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Save bill
      const { data: bill, error: billError } = await supabase
        .from('bills')
        .insert({
          order_id: invoiceData.invoice_number,
          bill_number: invoiceData.invoice_number,
          invoice_number: invoiceData.invoice_number,
          invoice_type: invoiceData.invoice_type,
          bill_date: invoiceData.bill_date,
          party_gstin: invoiceData.party_gstin,
          party_state_code: invoiceData.party_state_code,
          place_of_supply: invoiceData.place_of_supply,
          total_taxable_amount: invoiceData.total_taxable_amount,
          total_cgst_amount: invoiceData.total_cgst_amount,
          total_sgst_amount: invoiceData.total_sgst_amount,
          total_igst_amount: invoiceData.total_igst_amount,
          round_off_amount: invoiceData.round_off_amount,
          bill_data: JSON.parse(JSON.stringify({
            party_name: invoiceData.party_name,
            party_address: invoiceData.party_address,
            line_items: invoiceData.line_items
          }))
        })
        .select()
        .single();

      if (billError) throw billError;

      // Save line items
      const lineItemsData = invoiceData.line_items.map((item, index) => ({
        organization_id: null, // Will be set by RLS
        bill_id: bill.id,
        item_code: item.item_code,
        item_name: item.item_name,
        hsn_code: item.hsn_code,
        quantity: item.quantity,
        unit_rate: item.unit_rate,
        discount_percentage: item.discount_percentage,
        discount_amount: item.discount_amount,
        taxable_amount: item.taxable_amount,
        cgst_rate: item.cgst_rate,
        sgst_rate: item.sgst_rate,
        igst_rate: item.igst_rate,
        cgst_amount: item.cgst_amount,
        sgst_amount: item.sgst_amount,
        igst_amount: item.igst_amount,
        total_amount: item.total_amount,
        line_sequence: index + 1
      }));

      const { error: itemsError } = await supabase
        .from('dkegl_invoice_line_items')
        .insert(lineItemsData);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Invoice saved successfully"
      });

      // Reset form
      setInvoiceData({
        invoice_number: '',
        invoice_type: 'tax_invoice',
        bill_date: new Date().toISOString().split('T')[0],
        party_name: '',
        party_gstin: '',
        party_address: '',
        party_state_code: '',
        place_of_supply: '',
        line_items: [],
        total_taxable_amount: 0,
        total_cgst_amount: 0,
        total_sgst_amount: 0,
        total_igst_amount: 0,
        round_off_amount: 0,
        invoice_amount: 0
      });

    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({
        title: "Error",
        description: "Failed to save invoice",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate GST Invoice
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invoice Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="invoice_number">Invoice Number *</Label>
              <Input
                id="invoice_number"
                value={invoiceData.invoice_number}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, invoice_number: e.target.value }))}
                placeholder="INV-001"
              />
            </div>
            <div>
              <Label htmlFor="invoice_type">Invoice Type</Label>
              <Select value={invoiceData.invoice_type} onValueChange={(value) => setInvoiceData(prev => ({ ...prev, invoice_type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tax_invoice">Tax Invoice</SelectItem>
                  <SelectItem value="debit_note">Debit Note</SelectItem>
                  <SelectItem value="credit_note">Credit Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bill_date">Invoice Date</Label>
              <Input
                id="bill_date"
                type="date"
                value={invoiceData.bill_date}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, bill_date: e.target.value }))}
              />
            </div>
          </div>

          <Separator />

          {/* Party Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Party Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="party_name">Party Name *</Label>
                <Input
                  id="party_name"
                  value={invoiceData.party_name}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, party_name: e.target.value }))}
                  placeholder="Customer Name"
                />
              </div>
              <div>
                <Label htmlFor="party_gstin">Party GSTIN</Label>
                <Input
                  id="party_gstin"
                  value={invoiceData.party_gstin}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, party_gstin: e.target.value }))}
                  placeholder="29ABCDE1234F1Z5"
                />
              </div>
              <div>
                <Label htmlFor="party_state_code">State Code</Label>
                <Input
                  id="party_state_code"
                  value={invoiceData.party_state_code}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, party_state_code: e.target.value }))}
                  placeholder="29"
                />
              </div>
              <div>
                <Label htmlFor="place_of_supply">Place of Supply</Label>
                <Input
                  id="place_of_supply"
                  value={invoiceData.place_of_supply}
                  onChange={(e) => setInvoiceData(prev => ({ ...prev, place_of_supply: e.target.value }))}
                  placeholder="Karnataka"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="party_address">Party Address</Label>
              <Textarea
                id="party_address"
                value={invoiceData.party_address}
                onChange={(e) => setInvoiceData(prev => ({ ...prev, party_address: e.target.value }))}
                placeholder="Complete address with pincode"
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Line Items</h3>
              <Button onClick={addLineItem} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {invoiceData.line_items.map((item, index) => (
              <Card key={item.id} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="md:col-span-2">
                    <Label>Item Name *</Label>
                    <Input
                      value={item.item_name}
                      onChange={(e) => updateLineItem(item.id, 'item_name', e.target.value)}
                      placeholder="Item description"
                    />
                  </div>
                  <div>
                    <Label>HSN Code</Label>
                    <Input
                      value={item.hsn_code || ''}
                      onChange={(e) => updateLineItem(item.id, 'hsn_code', e.target.value)}
                      placeholder="8901"
                    />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Unit Rate</Label>
                    <Input
                      type="number"
                      value={item.unit_rate}
                      onChange={(e) => updateLineItem(item.id, 'unit_rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => removeLineItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <Label>Discount %</Label>
                    <Input
                      type="number"
                      value={item.discount_percentage}
                      onChange={(e) => updateLineItem(item.id, 'discount_percentage', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>CGST Rate %</Label>
                    <Input
                      type="number"
                      value={item.cgst_rate}
                      onChange={(e) => updateLineItem(item.id, 'cgst_rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>SGST Rate %</Label>
                    <Input
                      type="number"
                      value={item.sgst_rate}
                      onChange={(e) => updateLineItem(item.id, 'sgst_rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>IGST Rate %</Label>
                    <Input
                      type="number"
                      value={item.igst_rate}
                      onChange={(e) => updateLineItem(item.id, 'igst_rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="flex justify-end mt-4">
                  <Badge variant="secondary">
                    Total: ₹{calculateLineItemTotals(item).total_amount.toFixed(2)}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>

          <Separator />

          {/* Invoice Totals */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Invoice Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <Label>Taxable Amount</Label>
                <div className="font-mono">₹{invoiceData.total_taxable_amount.toFixed(2)}</div>
              </div>
              <div>
                <Label>CGST</Label>
                <div className="font-mono">₹{invoiceData.total_cgst_amount.toFixed(2)}</div>
              </div>
              <div>
                <Label>SGST</Label>
                <div className="font-mono">₹{invoiceData.total_sgst_amount.toFixed(2)}</div>
              </div>
              <div>
                <Label>IGST</Label>
                <div className="font-mono">₹{invoiceData.total_igst_amount.toFixed(2)}</div>
              </div>
            </div>
            <div className="flex justify-between items-center text-lg font-semibold pt-4 border-t">
              <span>Total Invoice Amount:</span>
              <span className="font-mono">₹{invoiceData.invoice_amount.toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-4">
            <Button onClick={saveInvoice} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Invoice'}
            </Button>
            <Button variant="outline" disabled>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}