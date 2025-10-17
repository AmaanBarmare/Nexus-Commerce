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

  const [formData, setFormData] = useState({
    code: '',
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
      // In a real app, create an admin endpoint to list discounts
      // For now, we'll just show a placeholder
      setDiscounts([]);
    } catch (error) {
      console.error('Error loading discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);

    try {
      const payload = {
        code: formData.code.toUpperCase(),
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
          type: 'percent',
          value: '',
          minSubtotalMinor: '',
          usageLimit: '',
          active: true,
        });
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
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No discounts created yet. Click &ldquo;Create Discount&rdquo; to add one.
                  </TableCell>
                </TableRow>
              ) : (
                discounts.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell className="font-mono font-semibold">{discount.code}</TableCell>
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
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Discount Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !formData.code || !formData.value}>
              {creating ? 'Creating...' : 'Create Discount'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

