'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatMoney } from '@/lib/util';
import { useRouter } from 'next/navigation';

type Customer = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  marketingSubscribed: boolean;
  createdAt: string;
  orders: {
    id: string;
    totalMinor: number;
    status: string;
  }[];
  totalSpent: number;
  orderCount: number;
};

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteOrders, setDeleteOrders] = useState(false);
  const [customersWithOrdersInfo, setCustomersWithOrdersInfo] = useState<Array<{email: string, orderCount: number}>>([]);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    marketingSubscribed: false,
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/v2/admin/customers/list');
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/v2/admin/customers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setCreateOpen(false);
        setFormData({
          email: '',
          firstName: '',
          lastName: '',
          phone: '',
          marketingSubscribed: false,
        });
        loadCustomers();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Failed to create customer');
    } finally {
      setCreating(false);
    }
  };

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map(c => c.id));
    }
  };

  const handleDelete = async () => {
    if (selectedCustomers.length === 0) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch('/api/v2/admin/customers/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customerIds: selectedCustomers,
          deleteOrders: deleteOrders 
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setDeleteOpen(false);
        setSelectedCustomers([]);
        setDeleteError(null);
        setDeleteOrders(false);
        setCustomersWithOrdersInfo([]);
        loadCustomers();
      } else {
        const error = await response.json();
        setDeleteError(error.error || 'Failed to delete customers');
        if (error.customersWithOrders) {
          setCustomersWithOrdersInfo(error.customersWithOrders);
        }
      }
    } catch (error) {
      console.error('Error deleting customers:', error);
      setDeleteError('Failed to delete customers. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const getCustomerName = (customer: Customer) => {
    if (customer.firstName && customer.lastName) {
      return `${customer.firstName} ${customer.lastName}`;
    }
    if (customer.firstName) {
      return customer.firstName;
    }
    if (customer.lastName) {
      return customer.lastName;
    }
    return '-';
  };

  const getEmailSubscriptionStatus = (customer: Customer) => {
    return customer.marketingSubscribed ? 'subscribed' : 'not subscribed';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Customers</h1>
            <p className="text-gray-500 mt-1">Customer management and analytics</p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="text-gray-500">Loading customers...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-gray-500 mt-1">Customer management and analytics</p>
        </div>
        <div className="flex gap-2">
          {selectedCustomers.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={() => setDeleteOpen(true)}
            >
              Delete ({selectedCustomers.length})
            </Button>
          )}
          <Button onClick={() => setCreateOpen(true)}>Add Customer</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Customers ({customers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.length === customers.length && customers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Email Subscription</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Amount Spent</TableHead>
                <TableHead>Date Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    No customers yet. Click &quot;Add Customer&quot; to add one.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow 
                    key={customer.id}
                    className="hover:bg-gray-50"
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={() => handleSelectCustomer(customer.id)}
                        className="rounded border-gray-300"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell 
                      className="font-medium cursor-pointer"
                      onClick={() => router.push(`/admin/customers/${customer.id}`)}
                    >
                      {getCustomerName(customer)}
                    </TableCell>
                    <TableCell 
                      className="font-mono text-sm cursor-pointer"
                      onClick={() => router.push(`/admin/customers/${customer.id}`)}
                    >
                      {customer.email}
                    </TableCell>
                    <TableCell 
                      className="cursor-pointer"
                      onClick={() => router.push(`/admin/customers/${customer.id}`)}
                    >
                      <Badge variant={customer.marketingSubscribed ? 'default' : 'secondary'}>
                        {getEmailSubscriptionStatus(customer)}
                      </Badge>
                    </TableCell>
                    <TableCell 
                      className="cursor-pointer"
                      onClick={() => router.push(`/admin/customers/${customer.id}`)}
                    >
                      {customer.orderCount}
                    </TableCell>
                    <TableCell 
                      className="cursor-pointer"
                      onClick={() => router.push(`/admin/customers/${customer.id}`)}
                    >
                      {formatMoney(customer.totalSpent)}
                    </TableCell>
                    <TableCell 
                      className="cursor-pointer"
                      onClick={() => router.push(`/admin/customers/${customer.id}`)}
                    >
                      {new Date(customer.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Customer Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Customer</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="customer@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
              <Input
                id="phone"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="marketingSubscribed" className="text-sm font-medium">Email Subscription</Label>
              <Select
                value={formData.marketingSubscribed ? 'subscribed' : 'not-subscribed'}
                onValueChange={(value) => setFormData({ ...formData, marketingSubscribed: value === 'subscribed' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscribed">Subscribed</SelectItem>
                  <SelectItem value="not-subscribed">Not Subscribed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !formData.email}>
              {creating ? 'Creating...' : 'Create Customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={(open) => {
        setDeleteOpen(open);
        if (!open) {
          setDeleteError(null);
          setDeleteOrders(false);
          setCustomersWithOrdersInfo([]);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Customers</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {deleteError ? (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-red-800 font-medium mb-1">Cannot Delete Customers</p>
                  <p className="text-red-700 text-sm mb-3">{deleteError}</p>
                  {customersWithOrdersInfo.length > 0 && (
                    <div className="mt-3">
                      <p className="text-red-700 text-sm font-medium mb-2">Customers with orders:</p>
                      <ul className="text-red-600 text-sm space-y-1">
                        {customersWithOrdersInfo.map((info, idx) => (
                          <li key={idx}>
                            {info.email} ({info.orderCount} order{info.orderCount !== 1 ? 's' : ''})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-yellow-800 text-sm font-medium mb-2">Options:</p>
                  <ul className="text-yellow-700 text-sm space-y-1 list-disc list-inside">
                    <li>Delete the orders first, then delete the customers</li>
                    <li>Or manually delete orders from the Orders page</li>
                  </ul>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="deleteOrders"
                    checked={deleteOrders}
                    onChange={(e) => setDeleteOrders(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="deleteOrders" className="text-sm text-gray-700">
                    Also delete {customersWithOrdersInfo.reduce((sum, c) => sum + c.orderCount, 0)} order{customersWithOrdersInfo.reduce((sum, c) => sum + c.orderCount, 0) !== 1 ? 's' : ''} before deleting customers
                  </label>
                </div>
              </div>
            ) : (
              <>
                <p className="text-gray-900">
                  You are about to delete {selectedCustomers.length} customer{selectedCustomers.length !== 1 ? 's' : ''}. This action cannot be undone.
                </p>
                
                <div className="bg-gray-50 p-4 rounded-md">
                  <div className="font-medium text-gray-900 mb-2">Customers to be deleted:</div>
                  <div className="space-y-1">
                    {selectedCustomers.map(customerId => {
                      const customer = customers.find(c => c.id === customerId);
                      const orderCount = customer?.orderCount || 0;
                      return (
                        <div key={customerId} className="text-sm">
                          <div className="font-medium">{getCustomerName(customer!)}</div>
                          <div className="text-gray-600">{customer!.email}</div>
                          {orderCount > 0 && (
                            <div className="text-yellow-600 text-xs mt-1">
                              ⚠️ {orderCount} order{orderCount !== 1 ? 's' : ''} will be affected
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedCustomers.some(id => {
                  const customer = customers.find(c => c.id === id);
                  return (customer?.orderCount || 0) > 0;
                }) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p className="text-yellow-800 text-sm font-medium mb-2">⚠️ Warning: Some customers have orders</p>
                    <p className="text-yellow-700 text-sm mb-3">
                      If you delete these customers, their orders will remain but will no longer be linked to a customer.
                    </p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="deleteOrdersCheck"
                        checked={deleteOrders}
                        onChange={(e) => setDeleteOrders(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor="deleteOrdersCheck" className="text-sm text-yellow-800">
                        Delete orders first (recommended)
                      </label>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDeleteOpen(false);
              setDeleteError(null);
              setDeleteOrders(false);
              setCustomersWithOrdersInfo([]);
            }}>
              {deleteError ? 'Close' : 'Cancel'}
            </Button>
            {!deleteError && (
              <Button 
                variant="destructive" 
                onClick={handleDelete} 
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Customers'}
              </Button>
            )}
            {deleteError && deleteOrders && (
              <Button 
                variant="destructive" 
                onClick={handleDelete} 
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Customers & Orders'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
