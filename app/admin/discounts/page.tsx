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
import { Trash2, Edit, AlertTriangle } from 'lucide-react';

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedDiscountType, setSelectedDiscountType] = useState<'PRODUCT' | 'ORDER' | null>(null);
  const [currentDiscount, setCurrentDiscount] = useState<any | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [discountToDelete, setDiscountToDelete] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    scope: 'ORDER' as 'PRODUCT' | 'ORDER',
    type: 'percent' as 'percent' | 'fixed',
    value: '',
    minSubtotalMinor: '',
    usageLimit: '',
    active: true,
    productIds: [] as string[],
  });

  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    loadDiscounts();
  }, []);

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await fetch('/api/v2/admin/products/list');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

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
    
    // Load products when selecting PRODUCT scope
    if (type === 'PRODUCT') {
      loadProducts();
    }
  };

  const handleBackToTypeSelection = () => {
    setSelectedDiscountType(null);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      scope: 'ORDER',
      type: 'percent',
      value: '',
      minSubtotalMinor: '',
      usageLimit: '',
      active: true,
      productIds: [],
    });
    setSelectedDiscountType(null);
    setCurrentDiscount(null);
  };

  const handleEdit = (discount: any) => {
    setCurrentDiscount(discount);
    setFormData({
      code: discount.code,
      scope: discount.scope,
      type: discount.type,
      value: discount.type === 'percent' ? discount.value.toString() : (discount.value / 100).toString(),
      minSubtotalMinor: discount.minSubtotalMinor ? (discount.minSubtotalMinor / 100).toString() : '',
      usageLimit: discount.usageLimit ? discount.usageLimit.toString() : '',
      active: discount.active,
      productIds: discount.productDiscounts?.map((pd: any) => pd.productId) || [],
    });
    setSelectedDiscountType(discount.scope);
    
    // Load products if editing a PRODUCT scope discount
    if (discount.scope === 'PRODUCT') {
      loadProducts();
    }
    
    setCreateOpen(true);
  };

  const handleDelete = async () => {
    if (!discountToDelete || deleteConfirmText !== 'delete') return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/v2/admin/discounts/delete/${discountToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadDiscounts();
        setDeleteOpen(false);
        setDiscountToDelete(null);
        setDeleteConfirmText('');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete discount');
      }
    } catch (error) {
      console.error('Error deleting discount:', error);
      alert('An unexpected error occurred');
    } finally {
      setDeleting(false);
    }
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
        productIds: formData.scope === 'PRODUCT' ? formData.productIds : undefined,
      };

      const method = currentDiscount ? 'PUT' : 'POST';
      const url = currentDiscount ? `/api/v2/admin/discounts/update/${currentDiscount.id}` : '/api/v2/admin/discounts/create';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setCreateOpen(false);
        resetForm();
        loadDiscounts();
      } else {
        const error = await res.json();
        alert(error.error || `Failed to ${currentDiscount ? 'update' : 'create'} discount`);
      }
    } catch (error) {
      console.error(`Error ${currentDiscount ? 'updating' : 'creating'} discount:`, error);
      alert(`Failed to ${currentDiscount ? 'update' : 'create'} discount`);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Discounts</h1>
            <p className="text-gray-500 mt-1">Create and manage discount codes</p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="text-gray-500">Loading discounts...</div>
        </div>
      </div>
    );
  }

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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                    No discounts created yet. Click &ldquo;Create Discount&rdquo; to add one.
                  </TableCell>
                </TableRow>
              ) : (
                discounts.map((discount) => (
                  <TableRow key={discount.id}>
                    <TableCell className="font-mono font-semibold">{discount.code}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline">
                          {discount.scope === 'PRODUCT' ? 'Amount off products' : 'Amount off order'}
                        </Badge>
                        {discount.scope === 'PRODUCT' && discount.productDiscounts && discount.productDiscounts.length > 0 && (
                          <div className="text-xs text-gray-600">
                            {discount.productDiscounts.length} product{discount.productDiscounts.length !== 1 ? 's' : ''} selected
                          </div>
                        )}
                      </div>
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
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(discount)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            console.log('Attempting to delete discount:', discount);
                            setDiscountToDelete(discount);
                            setDeleteConfirmText('');
                            setDeleteOpen(true);
                          }}
                          className="h-8 w-8 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Discount Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => {
        setCreateOpen(open);
        if (!open) {
          resetForm();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {currentDiscount ? 'Edit Discount Code' : (selectedDiscountType ? 'Create Discount Code' : 'Select Discount Type')}
            </DialogTitle>
          </DialogHeader>
          
          {!selectedDiscountType && !currentDiscount ? (
            // Discount Type Selection (only for creation)
            <div className="space-y-6 py-6">
              <div>
                <p className="text-gray-600 text-base">Choose the type of discount you want to create:</p>
              </div>
              <div className="space-y-4">
                <Button
                  variant="outline"
                  className="w-full h-24 flex flex-col items-start justify-center space-y-2 hover:bg-gray-50 transition-colors p-6"
                  onClick={() => handleDiscountTypeSelect('PRODUCT')}
                >
                  <div className="text-xl font-semibold text-gray-900">Amount off products</div>
                  <div className="text-sm text-gray-600">Apply discount to individual products</div>
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-24 flex flex-col items-start justify-center space-y-2 hover:bg-gray-50 transition-colors p-6"
                  onClick={() => handleDiscountTypeSelect('ORDER')}
                >
                  <div className="text-xl font-semibold text-gray-900">Amount off order</div>
                  <div className="text-sm text-gray-600">Apply discount to the entire order</div>
                </Button>
              </div>
            </div>
          ) : (
            // Discount Creation Form
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold text-lg">
                    {formData.scope === 'PRODUCT' ? 'Amount off products' : 'Amount off order'}
                  </h3>
                  <p className="text-sm text-gray-600">Configure your discount settings</p>
                </div>
                {!currentDiscount && (
                  <Button variant="ghost" size="sm" onClick={handleBackToTypeSelection} className="text-gray-600 hover:text-gray-900">
                    ← Back
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-sm font-medium">Discount Code</Label>
                  <Input
                    id="code"
                    placeholder="SUMMER2024"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="font-mono"
                    disabled={!!currentDiscount}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-sm font-medium">Type</Label>
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
                    <Label htmlFor="value" className="text-sm font-medium">
                      {formData.type === 'percent' ? 'Percentage (%)' : 'Amount (₹)'}
                    </Label>
                    <Input
                      id="value"
                      type="number"
                      placeholder={formData.type === 'percent' ? '10' : '500'}
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    />
                  </div>
                </div>

                {formData.scope === 'PRODUCT' && (
                  <div className="space-y-2">
                    <Label htmlFor="products" className="text-sm font-medium">Select Products</Label>
                    <Select
                      value=""
                      onValueChange={(productId) => {
                        if (productId && !formData.productIds.includes(productId)) {
                          setFormData({
                            ...formData,
                            productIds: [...formData.productIds, productId]
                          });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingProducts ? "Loading products..." : "Select products to apply discount to"} />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem 
                            key={product.id} 
                            value={product.id}
                            disabled={formData.productIds.includes(product.id)}
                          >
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {formData.productIds.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Selected Products:</div>
                        <div className="flex flex-wrap gap-2">
                          {formData.productIds.map((productId) => {
                            const product = products.find(p => p.id === productId);
                            return (
                              <div key={productId} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-1">
                                <span className="text-sm">{product?.name}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      productIds: formData.productIds.filter(id => id !== productId)
                                    });
                                  }}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="minOrder" className="text-sm font-medium">Min Order (₹) (optional)</Label>
                    <Input
                      id="minOrder"
                      type="number"
                      placeholder="1000"
                      value={formData.minSubtotalMinor}
                      onChange={(e) => setFormData({ ...formData, minSubtotalMinor: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="usageLimit" className="text-sm font-medium">Usage Limit (optional)</Label>
                    <Input
                      id="usageLimit"
                      type="number"
                      placeholder="100"
                      value={formData.usageLimit}
                      onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    />
                  </div>
                </div>
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
                <Button onClick={handleCreate} disabled={creating || !formData.code || !formData.value || (formData.scope === 'PRODUCT' && formData.productIds.length === 0)}>
                  {creating ? 'Saving...' : (currentDiscount ? 'Save Changes' : 'Create Discount')}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={(open) => {
        setDeleteOpen(open);
        if (!open) {
          setDiscountToDelete(null);
          setDeleteConfirmText('');
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <DialogTitle className="text-red-600">Delete Discount</DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-gray-900">
              You are about to delete 1 discount(s). This action cannot be undone.
            </p>
            
            {discountToDelete && (
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="font-medium text-gray-900 mb-2">Discount to be deleted:</div>
                <div className="space-y-1">
                  <div className="font-mono text-sm">{discountToDelete.code}</div>
                  <div className="text-sm text-gray-600">
                    {discountToDelete.scope === 'PRODUCT' ? 'Amount off products' : 'Amount off order'} • 
                    {discountToDelete.type === 'percent' ? ` ${discountToDelete.value}%` : ` ₹${(discountToDelete.value / 100).toFixed(2)}`}
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="deleteConfirm" className="text-sm font-medium">
                Type <span className="font-mono bg-gray-100 px-1 rounded">delete</span> to confirm:
              </Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type 'delete' to confirm"
                className="font-mono"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDeleteOpen(false);
                setDiscountToDelete(null);
                setDeleteConfirmText('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDelete} 
              disabled={deleteConfirmText !== 'delete' || deleting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300"
            >
              {deleting ? 'Deleting...' : 'Delete Discount'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

