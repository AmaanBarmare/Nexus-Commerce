'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';

// Type definition for AlyraProduct
type AlyraProduct = {
  id: string;
  name: string;
  sku: string;
  type: 'Refill' | 'Set';
  status: 'Active' | 'Inactive';
  inventory: number;
  createdAt: string;
  updatedAt: string;
};

function getStatusColor(status: string) {
  switch (status) {
    case 'Active':
      return 'bg-green-100 text-green-800';
    case 'Draft':
      return 'bg-yellow-100 text-yellow-800';
    case 'Archived':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getTypeColor(type: string) {
  switch (type) {
    case 'Refill':
      return 'bg-blue-100 text-blue-800';
    case 'Set':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function ProductPage() {
  const [productsList, setProductsList] = useState<AlyraProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<AlyraProduct | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [editForm, setEditForm] = useState({
    name: '',
    sku: '',
    type: 'Refill' as 'Refill' | 'Set',
    status: 'Active' as 'Active' | 'Inactive',
    inventory: 0,
  });
  const [addForm, setAddForm] = useState({
    name: '',
    sku: '',
    type: 'Refill' as 'Refill' | 'Set',
    status: 'Active' as 'Active' | 'Inactive',
    inventory: 0,
  });

  // Fetch products from API
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/alyra-products');
      if (response.ok) {
        const data = await response.json();
        setProductsList(data.products);
      } else {
        console.error('Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = (product: AlyraProduct) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      sku: product.sku,
      type: product.type,
      status: product.status,
      inventory: product.inventory,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!editingProduct) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/alyra-products/${editingProduct.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        // Refresh the products list
        await fetchProducts();
        setIsEditDialogOpen(false);
        setEditingProduct(null);
      } else {
        console.error('Failed to update product');
        alert('Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditDialogOpen(false);
    setEditingProduct(null);
  };

  const handleAddProduct = () => {
    setAddForm({
      name: '',
      sku: '',
      type: 'Refill',
      status: 'Active',
      inventory: 0,
    });
    setIsAddDialogOpen(true);
  };

  const handleSaveNewProduct = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/alyra-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addForm),
      });

      if (response.ok) {
        await fetchProducts();
        setIsAddDialogOpen(false);
        setAddForm({
          name: '',
          sku: '',
          type: 'Refill',
          status: 'Active',
          inventory: 0,
        });
      } else {
        console.error('Failed to create product');
        alert('Failed to create product');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelAdd = () => {
    setIsAddDialogOpen(false);
    setAddForm({
      name: '',
      sku: '',
      type: 'Refill',
      status: 'Active',
      inventory: 0,
    });
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === productsList.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(productsList.map(p => p.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedProducts.length === 0) return;
    setDeleteConfirmText('');
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText !== 'delete') {
      alert('Please type "delete" to confirm');
      return;
    }

    setSaving(true);
    try {
      const deletePromises = selectedProducts.map(id => 
        fetch(`/api/admin/alyra-products/${id}`, {
          method: 'DELETE',
        })
      );

      const results = await Promise.all(deletePromises);
      const failed = results.filter(r => !r.ok);

      if (failed.length === 0) {
        await fetchProducts();
        setSelectedProducts([]);
        setIsDeleteDialogOpen(false);
        setDeleteConfirmText('');
      } else {
        alert(`Failed to delete ${failed.length} products`);
      }
    } catch (error) {
      console.error('Error deleting products:', error);
      alert('Failed to delete products');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setDeleteConfirmText('');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-gray-500 mt-1">Manage your product inventory and catalog</p>
        </div>
        <div className="text-center py-12">
          <div className="text-gray-500">Loading products...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Products</h1>
        <p className="text-gray-500 mt-1">Manage your product inventory and catalog</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Product Catalog</CardTitle>
            <div className="flex gap-2">
              <Button onClick={handleAddProduct} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
              {selectedProducts.length > 0 && (
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete ({selectedProducts.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === productsList.length && productsList.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Inventory</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsList.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    No products found
                  </TableCell>
                </TableRow>
              ) : (
                productsList.map((product) => (
                  <TableRow 
                    key={product.id} 
                    className="hover:bg-gray-50"
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => handleSelectProduct(product.id)}
                        className="rounded border-gray-300"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell 
                      className="font-medium cursor-pointer"
                      onClick={() => handleEditProduct(product)}
                    >
                      {product.name}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-gray-600">{product.sku}</TableCell>
                    <TableCell>
                      <Badge className={getTypeColor(product.type)}>{product.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(product.status)}>{product.status}</Badge>
                    </TableCell>
                    <TableCell>{product.inventory} in stock</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Product Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="add-name">Product Name</Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter product name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-sku">SKU</Label>
              <Input
                id="add-sku"
                value={addForm.sku}
                onChange={(e) => setAddForm(prev => ({ ...prev, sku: e.target.value }))}
                placeholder="Enter SKU (e.g., ALY-XXX-XXX)"
                className="font-mono"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-type">Type</Label>
              <Select value={addForm.type} onValueChange={(value: 'Refill' | 'Set') => setAddForm(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Refill">Refill</SelectItem>
                  <SelectItem value="Set">Set</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-status">Status</Label>
              <Button
                type="button"
                variant={addForm.status === 'Active' ? 'default' : 'outline'}
                className={addForm.status === 'Active' ? 'bg-green-600 hover:bg-green-700' : ''}
                onClick={() => setAddForm(prev => ({ 
                  ...prev, 
                  status: prev.status === 'Active' ? 'Inactive' : 'Active' 
                }))}
              >
                {addForm.status}
              </Button>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-inventory">Inventory</Label>
              <Input
                id="add-inventory"
                type="number"
                value={addForm.inventory}
                onChange={(e) => setAddForm(prev => ({ ...prev, inventory: parseInt(e.target.value) || 0 }))}
                placeholder="Enter inventory quantity"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelAdd} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewProduct} disabled={saving}>
              {saving ? 'Creating...' : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={editForm.sku}
                onChange={(e) => setEditForm(prev => ({ ...prev, sku: e.target.value }))}
                className="font-mono"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={editForm.type} onValueChange={(value: 'Refill' | 'Set') => setEditForm(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Refill">Refill</SelectItem>
                  <SelectItem value="Set">Set</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Button
                type="button"
                variant={editForm.status === 'Active' ? 'default' : 'outline'}
                className={editForm.status === 'Active' ? 'bg-green-600 hover:bg-green-700' : ''}
                onClick={() => setEditForm(prev => ({ 
                  ...prev, 
                  status: prev.status === 'Active' ? 'Inactive' : 'Active' 
                }))}
              >
                {editForm.status}
              </Button>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inventory">Inventory</Label>
              <Input
                id="inventory"
                type="number"
                value={editForm.inventory}
                onChange={(e) => setEditForm(prev => ({ ...prev, inventory: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveProduct} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Delete Products
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                You are about to delete <strong>{selectedProducts.length}</strong> product(s). This action cannot be undone.
              </p>
              <p className="text-sm text-gray-600">
                Products to be deleted:
              </p>
              <ul className="text-sm text-gray-500 mt-1 max-h-32 overflow-y-auto">
                {selectedProducts.map(id => {
                  const product = productsList.find(p => p.id === id);
                  return product ? (
                    <li key={id} className="flex items-center gap-2">
                      <span className="font-mono text-xs">{product.sku}</span>
                      <span>{product.name}</span>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-confirm">
                Type <strong>delete</strong> to confirm:
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type 'delete' to confirm"
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete} disabled={saving}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete} 
              disabled={saving || deleteConfirmText !== 'delete'}
            >
              {saving ? 'Deleting...' : 'Delete Products'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
