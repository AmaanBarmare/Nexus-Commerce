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

function getStatusColor(status: string) {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'fulfilled':
      return 'bg-blue-100 text-blue-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
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

  useEffect(() => {
    fetch(`/api/v2/orders/get?id=${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setOrder(data.order);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching order:', err);
        setLoading(false);
      });
  }, [params.id]);

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

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!order) {
    return <div className="text-center py-12">Order not found</div>;
  }

  const shippingAddress = order.shippingAddress || {};

  return (
    <div className="space-y-6">
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
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-gray-500 mb-1">Order Status</div>
                <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Payment Status</div>
                <Badge className={getStatusColor(order.paymentStatus)}>{order.paymentStatus}</Badge>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Fulfillment Status</div>
                <Badge className={getStatusColor(order.fulfillmentStatus)}>
                  {order.fulfillmentStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">{order.email}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>{shippingAddress.line1}</div>
              {shippingAddress.line2 && <div>{shippingAddress.line2}</div>}
              <div>
                {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
              </div>
              <div>{shippingAddress.country}</div>
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
    </div>
  );
}

