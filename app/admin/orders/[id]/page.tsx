'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { padOrderNumber, formatMoney } from '@/lib/util';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';

function getStatusColor(status: string) {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'fulfilled':
      return 'bg-blue-100 text-blue-800';
    case 'unfulfilled':
      return 'bg-yellow-100 text-yellow-800';
    case 'returned':
      return 'bg-red-100 text-red-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getDeliveryStatusColor(status: string) {
  switch (status) {
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'shipped':
      return 'bg-blue-100 text-blue-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [fulfilling, setFulfilling] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [updatingNotes, setUpdatingNotes] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({
    paymentStatus: '',
    fulfillmentStatus: '',
    deliveryStatus: '',
  });
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetch(`/api/v2/orders/get?id=${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setOrder(data.order);
        setNotes(data.order.notes || '');
        // Initialize status form with current order statuses
        setStatusForm({
          paymentStatus: data.order.paymentStatus,
          fulfillmentStatus: data.order.fulfillmentStatus,
          deliveryStatus: data.order.deliveryStatus || 'pending',
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching order:', err);
        setLoading(false);
      });
  }, [params.id]);

  // Reset status form when dialog opens
  useEffect(() => {
    if (statusDialogOpen && order) {
      setStatusForm({
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        deliveryStatus: order.deliveryStatus || 'pending',
      });
    }
  }, [statusDialogOpen, order]);

  const handleFulfill = async () => {
    setFulfilling(true);
    try {
      const res = await fetch('/api/v2/admin/orders/fulfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          trackingNumber: trackingNumber || undefined,
        }),
      });

      if (res.ok) {
        router.refresh();
        setFulfillOpen(false);
        // Refresh order data
        const updatedOrder = await fetch(`/api/v2/orders/get?id=${params.id}`).then(r => r.json());
        setOrder(updatedOrder.order);
      } else {
        alert('Failed to fulfill order');
      }
    } catch (error) {
      console.error('Error fulfilling order:', error);
      alert('Failed to fulfill order');
    } finally {
      setFulfilling(false);
    }
  };

  const handleUpdateNotes = async () => {
    setUpdatingNotes(true);
    try {
      const res = await fetch('/api/v2/admin/orders/update-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          notes: notes.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
        setNotesOpen(false);
      } else {
        alert('Failed to update notes');
      }
    } catch (error) {
      console.error('Error updating notes:', error);
      alert('Failed to update notes');
    } finally {
      setUpdatingNotes(false);
    }
  };

  const handleUpdateAllStatuses = async () => {
    if (!order) return;

    setUpdatingStatus(true);
    try {
      // Update each status that has changed
      const updatePromises = [];

      if (statusForm.paymentStatus !== order.paymentStatus) {
        updatePromises.push(
          fetch('/api/v2/admin/orders/update-payment-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: order.id,
              paymentStatus: statusForm.paymentStatus,
            }),
          })
        );
      }

      if (statusForm.fulfillmentStatus !== order.fulfillmentStatus) {
        updatePromises.push(
          fetch('/api/v2/admin/orders/update-fulfillment-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: order.id,
              fulfillmentStatus: statusForm.fulfillmentStatus,
            }),
          })
        );
      }

      if (statusForm.deliveryStatus !== (order.deliveryStatus || 'pending')) {
        updatePromises.push(
          fetch('/api/v2/admin/orders/update-delivery-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: order.id,
              deliveryStatus: statusForm.deliveryStatus,
            }),
          })
        );
      }

      if (updatePromises.length === 0) {
        setUpdatingStatus(false);
        return;
      }

      const results = await Promise.all(updatePromises);
      const failed = results.filter(r => !r.ok);

      if (failed.length === 0) {
        // Refresh order data
        const updatedOrder = await fetch(`/api/v2/orders/get?id=${params.id}`).then(r => r.json());
        setOrder(updatedOrder.order);
        setStatusDialogOpen(false);
      } else {
        alert('Failed to update some statuses');
      }
    } catch (error) {
      console.error('Error updating statuses:', error);
      alert('Failed to update statuses');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Check if statuses have changed
  const hasStatusChanges = () => {
    if (!order) return false;
    return (
      statusForm.paymentStatus !== order.paymentStatus ||
      statusForm.fulfillmentStatus !== order.fulfillmentStatus ||
      statusForm.deliveryStatus !== (order.deliveryStatus || 'pending')
    );
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!order) {
    return <div className="text-center py-12">Order not found</div>;
  }

  const shippingAddress = order.shippingAddress || {};

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => router.push('/admin/orders')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Button>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order #{padOrderNumber(order.orderNumber)}</h1>
          <p className="text-gray-500 mt-1">
            {new Date(order.createdAt).toLocaleString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="flex gap-3">
          {order.status === 'paid' && order.fulfillmentStatus !== 'fulfilled' && (
            <Button onClick={() => setFulfillOpen(true)}>Mark as Fulfilled</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.title}</div>
                          {item.variantTitle && (
                            <div className="text-sm text-gray-500">{item.variantTitle}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{item.sku}</TableCell>
                      <TableCell className="text-right">{item.qty}</TableCell>
                      <TableCell className="text-right">{formatMoney(item.unitPriceMinor)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(item.lineTotalMinor)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 space-y-2 border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatMoney(order.subtotalMinor)}</span>
                </div>
                {order.discountMinor > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount ({order.discountCode})</span>
                    <span>-{formatMoney(order.discountMinor)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>{formatMoney(order.shippingMinor)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax</span>
                  <span>{formatMoney(order.taxMinor)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>{formatMoney(order.totalMinor)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Details Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Order Number</div>
                <div className="font-medium">#{padOrderNumber(order.orderNumber)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Order Date</div>
                <div className="text-sm">
                  {new Date(order.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Payment Status</div>
                <Badge className={getStatusColor(order.paymentStatus)}>
                  {order.paymentStatus.toUpperCase()}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Fulfillment Status</div>
                <Badge className={getStatusColor(order.fulfillmentStatus)}>
                  {order.fulfillmentStatus.toUpperCase()}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Delivery Status</div>
                <Badge className={getDeliveryStatusColor(order.deliveryStatus || 'pending')}>
                  {(order.deliveryStatus || 'pending').toUpperCase()}
                </Badge>
              </div>
              <div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                  onClick={() => setStatusDialogOpen(true)}
                >
                  Change Status
                </Button>
              </div>
              {order.paymentRef && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Payment Reference</div>
                  <div className="text-sm font-mono">{order.paymentRef}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <div className="font-medium">
                  {order.customer?.firstName && order.customer?.lastName 
                    ? `${order.customer.firstName} ${order.customer.lastName}`
                    : order.customer?.firstName || 'Guest'}
                </div>
                <div className="text-gray-500">{order.email}</div>
                {order.customer?.phone && (
                  <div className="text-gray-500">{order.customer.phone}</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {shippingAddress.line1 && <div>{shippingAddress.line1}</div>}
              {shippingAddress.line2 && <div>{shippingAddress.line2}</div>}
              {(shippingAddress.city || shippingAddress.state || shippingAddress.postalCode) && (
                <div>
                  {[shippingAddress.city, shippingAddress.state, shippingAddress.postalCode].filter(Boolean).join(', ')}
                </div>
              )}
              {shippingAddress.country && <div>{shippingAddress.country}</div>}
              {!shippingAddress.line1 && !shippingAddress.city && (
                <div className="text-gray-500 italic">No shipping address provided</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Order Notes</CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setNotesOpen(true)}
                >
                  {order.notes ? 'Edit Notes' : 'Add Notes'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {order.notes ? (
                <div className="text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-md">
                  {order.notes}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  No notes added yet. Click &quot;Add Notes&quot; to add some.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fulfill Dialog */}
      <Dialog open={fulfillOpen} onOpenChange={setFulfillOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Order as Fulfilled</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tracking">Tracking Number (optional)</Label>
              <Input
                id="tracking"
                placeholder="Enter tracking number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFulfillOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFulfill} disabled={fulfilling}>
              {fulfilling ? 'Fulfilling...' : 'Mark as Fulfilled'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {order.notes ? 'Edit Order Notes' : 'Add Order Notes'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this order..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <p className="text-sm text-gray-500">
                Use this space to add Razorpay Payment ID, Order ID, or any other relevant notes for this order.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateNotes} disabled={updatingNotes}>
              {updatingNotes ? 'Saving...' : 'Save Notes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Order Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment-status">Payment Status</Label>
              <Select 
                value={statusForm.paymentStatus} 
                onValueChange={(value) => setStatusForm(prev => ({ ...prev, paymentStatus: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fulfillment-status">Fulfillment Status</Label>
              <Select 
                value={statusForm.fulfillmentStatus} 
                onValueChange={(value) => setStatusForm(prev => ({ ...prev, fulfillmentStatus: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-status">Delivery Status</Label>
              <Select 
                value={statusForm.deliveryStatus} 
                onValueChange={(value) => setStatusForm(prev => ({ ...prev, deliveryStatus: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)} disabled={updatingStatus}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAllStatuses} disabled={updatingStatus || !hasStatusChanges()}>
              {updatingStatus ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

