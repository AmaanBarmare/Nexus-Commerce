'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedDiscountType, setSelectedDiscountType] = useState<'PRODUCT' | 'ORDER' | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    scope: 'ORDER' as 'PRODUCT' | 'ORDER',
    type: 'percent' as 'percent' | 'fixed',
    value: '',
    minSubtotalMinor: '',
    usageLimit: '',
    active: true,
  });

  useEffect(() => {
    loadDiscounts();
  }, []);

  const loadDiscounts = async () => {
    try {
      const response = await fetch('/api/v2/admin/discounts/list');
      const data = await response.json();
      setDiscounts(data.discounts || []);
    } catch (error) {
      console.error('Error loading discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscountTypeSelect = (type: 'PRODUCT' | 'ORDER') => {
    setSelectedDiscountType(type);
    setFormData(prev => ({ ...prev, scope: type }));
  };

  const handleBackToTypeSelection = () => {
    setSelectedDiscountType(null);
  };

  const handleCreate = async () => {
    setCreating(true);

    try {
      const payload = {
        code: formData.code.toUpperCase(),
        scope: formData.scope,
        type: formData.type,
        value: formData.type === 'percent' ? parseInt(formData.value) : parseInt(formData.value) * 100,
        minSubtotalMinor: formData.minSubtotalMinor ? parseInt(formData.minSubtotalMinor) * 100 : undefined,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : undefined,
        active: formData.active,
      };

      const res = await fetch('/api/v2/admin/discounts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setCreateOpen(false);
        setFormData({
          code: '',
          scope: 'ORDER',
          type: 'percent',
          value: '',
          minSubtotalMinor: '',
          usageLimit: '',
          active: true,
        });
        setSelectedDiscountType(null);
        loadDiscounts();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create discount');
      }
    } catch (error) {
      console.error('Error creating discount:', error);
      alert('Failed to create discount');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Discounts</h1>
          <p className="text-gray-500 mt-1">Create and manage discount codes</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Create Discount</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Discount Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500">
                    No discounts created yet. Click &ldquo;Create Discount&rdquo; to add one.
                  </TableCell>
                </TableRow>
              ) : (
                discounts.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell className="font-mono font-semibold">{discount.code}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {discount.scope === 'PRODUCT' ? 'Amount off products' : 'Amount off order'}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{discount.type}</TableCell>
                    <TableCell>
                      {discount.type === 'percent'
                        ? `${discount.value}%`
                        : `₹${(discount.value / 100).toFixed(2)}`}
                    </TableCell>
                    <TableCell>
                      {discount.timesUsed}
                      {discount.usageLimit && ` / ${discount.usageLimit}`}
                    </TableCell>
                    <TableCell>
                      {discount.minSubtotalMinor
                        ? `₹${(discount.minSubtotalMinor / 100).toFixed(2)}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={discount.active ? 'default' : 'secondary'}>
                        {discount.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Discount Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => {
        setCreateOpen(open);
        if (!open) {
          setSelectedDiscountType(null);
          setFormData({
            code: '',
            scope: 'ORDER',
            type: 'percent',
            value: '',
            minSubtotalMinor: '',
            usageLimit: '',
            active: true,
          });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDiscountType ? 'Create Discount Code' : 'Select Discount Type'}
            </DialogTitle>
          </DialogHeader>
          
          {!selectedDiscountType ? (
            // Discount Type Selection
            <div className="space-y-4 py-4">
              <p className="text-gray-600">Choose the type of discount you want to create:</p>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => handleDiscountTypeSelect('PRODUCT')}
                >
                  <div className="text-lg font-semibold">Amount off products</div>
                  <div className="text-sm text-gray-500">Apply discount to individual products</div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => handleDiscountTypeSelect('ORDER')}
                >
                  <div className="text-lg font-semibold">Amount off order</div>
                  <div className="text-sm text-gray-500">Apply discount to the entire order</div>
                </Button>
              </div>
            </div>
          ) : (
            // Discount Creation Form
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">
                    {selectedDiscountType === 'PRODUCT' ? 'Amount off products' : 'Amount off order'}
                  </h3>
                  <p className="text-sm text-gray-500">Configure your discount settings</p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleBackToTypeSelection}>
                  ← Back
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  placeholder="SUMMER2024"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'percent' | 'fixed') => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">
                  {formData.type === 'percent' ? 'Percentage (e.g., 10 for 10%)' : 'Amount (₹)'}
                </Label>
                <Input
                  id="value"
                  type="number"
                  placeholder={formData.type === 'percent' ? '10' : '500'}
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minOrder">Minimum Order Amount (₹) - Optional</Label>
                <Input
                  id="minOrder"
                  type="number"
                  placeholder="1000"
                  value={formData.minSubtotalMinor}
                  onChange={(e) => setFormData({ ...formData, minSubtotalMinor: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usageLimit">Usage Limit - Optional</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  placeholder="100"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            {!selectedDiscountType ? (
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={creating || !formData.code || !formData.value}>
                  {creating ? 'Creating...' : 'Create Discount'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

