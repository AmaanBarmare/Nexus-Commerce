'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { padOrderNumber, formatMoney } from '@/lib/util';
import { ArrowLeft } from 'lucide-react';

function getPaymentStatusColor(status: string) {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'unpaid':
      return 'bg-yellow-100 text-yellow-800';
    case 'refunded':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getFulfillmentStatusColor(status: string) {
  switch (status) {
    case 'fulfilled':
      return 'bg-blue-100 text-blue-800';
    case 'unfulfilled':
      return 'bg-yellow-100 text-yellow-800';
    case 'returned':
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

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingSubscription, setUpdatingSubscription] = useState(false);

  useEffect(() => {
    fetch(`/api/v2/admin/customers/get?id=${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setCustomer(data.customer);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching customer:', err);
        setLoading(false);
      });
  }, [params.id]);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!customer) {
    return <div className="text-center py-12">Customer not found</div>;
  }

  const getCustomerName = () => {
    if (customer.firstName && customer.lastName) {
      return `${customer.firstName} ${customer.lastName}`;
    }
    if (customer.firstName) {
      return customer.firstName;
    }
    if (customer.lastName) {
      return customer.lastName;
    }
    return 'Guest';
  };

  const handleToggleEmailSubscription = async () => {
    if (!customer) return;

    setUpdatingSubscription(true);
    try {
      const response = await fetch('/api/v2/admin/customers/update-email-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          marketingSubscribed: !customer.marketingSubscribed,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCustomer(data.customer);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update email subscription');
      }
    } catch (error) {
      console.error('Error updating email subscription:', error);
      alert('Failed to update email subscription');
    } finally {
      setUpdatingSubscription(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => router.push('/admin/customers')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </Button>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{getCustomerName()}</h1>
          <p className="text-gray-500 mt-1">{customer.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Name</div>
                <div className="font-medium">{getCustomerName()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Email</div>
                <div className="font-mono text-sm">{customer.email}</div>
              </div>
              {customer.phone && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Phone</div>
                  <div>{customer.phone}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-gray-500 mb-1">Email Subscription</div>
                <Badge variant={customer.marketingSubscribed ? 'default' : 'secondary'}>
                  {customer.marketingSubscribed ? 'Subscribed' : 'Not Subscribed'}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Member Since</div>
                <div className="text-sm">
                  {new Date(customer.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>
              <div className="pt-2">
                <Button 
                  variant={customer.marketingSubscribed ? 'outline' : 'default'}
                  size="sm"
                  className="w-full"
                  onClick={handleToggleEmailSubscription}
                  disabled={updatingSubscription}
                >
                  {updatingSubscription
                    ? 'Updating...'
                    : customer.marketingSubscribed
                      ? 'Unsubscribe from Emails'
                      : 'Subscribe to Emails'
                  }
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">Total Orders</div>
                <div className="text-2xl font-bold">{customer.orderCount}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Total Spent</div>
                <div className="text-2xl font-bold">{formatMoney(customer.totalSpent)}</div>
              </div>
              {customer.orderCount > 0 && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Average Order Value</div>
                  <div className="text-2xl font-bold">
                    {formatMoney(Math.floor(customer.totalSpent / customer.orderCount))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Orders List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Orders ({customer.orderCount})</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.orders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No orders yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Fulfillment</TableHead>
                      <TableHead>Delivery</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.orders.map((order: any) => (
                      <TableRow 
                        key={order.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => router.push(`/admin/orders/${order.id}`)}
                      >
                        <TableCell className="font-medium">
                          #{padOrderNumber(order.orderNumber)}
                        </TableCell>
                        <TableCell>
                          {new Date(order.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>{order.items.length} items</TableCell>
                        <TableCell className="font-medium">
                          {formatMoney(order.totalMinor)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                            {order.paymentStatus.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getFulfillmentStatusColor(order.fulfillmentStatus)}>
                            {order.fulfillmentStatus.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getDeliveryStatusColor(order.deliveryStatus || 'pending')}>
                            {(order.deliveryStatus || 'pending').toUpperCase()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

