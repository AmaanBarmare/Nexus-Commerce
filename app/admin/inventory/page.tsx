'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney } from '@/lib/util';

export default function InventoryPage() {
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [newQty, setNewQty] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    loadVariants();
  }, []);

  const loadVariants = async () => {
    try {
      const res = await fetch('/api/v2/products/list');
      const data = await res.json();
      // Convert AlyraProduct to variant-like format for compatibility
      const allVariants = data.products.map((p: any) => ({
        id: p.id,
        sku: p.sku,
        title: p.name,
        variantTitle: p.type,
        inventoryQty: p.inventory,
        unitPriceMinor: p.priceMinor,
        productTitle: p.name
      }));
      setVariants(allVariants);
    } catch (error) {
      console.error('Error loading variants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustClick = (variant: any) => {
    setSelectedVariant(variant);
    setNewQty(String(variant.inventoryQty));
    setAdjustOpen(true);
  };

  const handleAdjust = async () => {
    if (!selectedVariant) return;
    setAdjusting(true);

    try {
      const res = await fetch('/api/v2/admin/products/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: selectedVariant.id,
          inventoryQty: parseInt(newQty),
        }),
      });

      if (res.ok) {
        setAdjustOpen(false);
        loadVariants();
      } else {
        alert('Failed to update inventory');
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      alert('Failed to update inventory');
    } finally {
      setAdjusting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventory</h1>
        <p className="text-gray-500 mt-1">Manage product variants and stock levels</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Variants</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No variants found
                  </TableCell>
                </TableRow>
              ) : (
                variants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell className="font-mono text-sm">{variant.sku}</TableCell>
                    <TableCell>{variant.productTitle}</TableCell>
                    <TableCell>{variant.title}</TableCell>
                    <TableCell className="text-right">{formatMoney(variant.priceMinor)}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          variant.inventoryQty <= 10
                            ? 'text-red-600 font-semibold'
                            : variant.inventoryQty <= 25
                            ? 'text-yellow-600'
                            : ''
                        }
                      >
                        {variant.inventoryQty}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => handleAdjustClick(variant)}>
                        Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Adjust Inventory Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Inventory</DialogTitle>
          </DialogHeader>
          {selectedVariant && (
            <div className="space-y-4 py-4">
              <div>
                <div className="text-sm font-medium mb-1">Product</div>
                <div className="text-sm text-gray-600">
                  {selectedVariant.productTitle} - {selectedVariant.title}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">SKU</div>
                <div className="text-sm text-gray-600 font-mono">{selectedVariant.sku}</div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qty">New Quantity</Label>
                <Input
                  id="qty"
                  type="number"
                  min="0"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdjust} disabled={adjusting}>
              {adjusting ? 'Updating...' : 'Update Quantity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

