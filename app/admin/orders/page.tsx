'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { padOrderNumber, formatMoney } from '@/lib/util';
import { Plus, Package, Tag, Check, ChevronsUpDown, Trash2, AlertTriangle } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: number;
  email: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  deliveryStatus?: string;
  totalMinor: number;
  createdAt: string;
  items: any[];
  customer?: {
    firstName?: string;
    lastName?: string;
  } | null;
}

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

interface AlyraProduct {
  id: string;
  name: string;
  sku: string;
  type: string;
  status: string;
  inventory: number;
  priceMinor: number;
}

interface OrderItem {
  productId: string;
  variantId: string;
  title: string;
  variantTitle?: string;
  sku: string;
  unitPriceMinor: number;
  qty: number;
  lineTotalMinor: number;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [products, setProducts] = useState<AlyraProduct[]>([]);
  const [creating, setCreating] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [orderForm, setOrderForm] = useState({
    customerEmail: '',
    customerFirstName: '',
    customerLastName: '',
    customerPhone: '+91 ',
    items: [] as OrderItem[],
    subtotalMinor: 0,
    discountMinor: 0,
    shippingMinor: 0,
    taxMinor: 0,
    totalMinor: 0,
    discountCode: '',
    paymentStatus: 'paid',
    fulfillmentStatus: 'unfulfilled',
    deliveryStatus: 'pending',
    status: 'paid',
    notes: '',
    shippingAddress: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India'
    }
  });
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>('none');
  const [stateSearch, setStateSearch] = useState('');
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [validationErrors, setValidationErrors] = useState({
    email: false,
    phone: false,
    postalCode: false
  });
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Expected format: "+91 XXXXXXXXXX" with exactly 10 digits
    const phoneRegex = /^\+91 \d{10}$/;
    return phoneRegex.test(phone);
  };

  const validatePostalCode = (postalCode: string): boolean => {
    // Must be exactly 6 digits
    const postalCodeRegex = /^\d{6}$/;
    return postalCodeRegex.test(postalCode);
  };

  const formatPhoneNumber = (value: string): string => {
    // Extract only digits from the input
    const digits = value.replace(/\D/g, '');
    
    // Limit to 10 digits maximum
    const phoneDigits = digits.substring(0, 10);
    
    // Always format as +91 XXXXXXXXXX
    return `+91 ${phoneDigits}`;
  };

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
    'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
    'Ladakh', 'Lakshadweep', 'Puducherry'
  ];

  const filteredStates = indianStates.filter(state =>
    state.toLowerCase().includes(stateSearch.toLowerCase())
  );

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchDiscounts();
    // Clear selected orders when filter changes
    setSelectedOrders([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll]);

  // Sync state search with form state
  useEffect(() => {
    setStateSearch(orderForm.shippingAddress.state);
  }, [orderForm.shippingAddress.state]);


  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v2/admin/orders/list?showAll=${showAll}`);
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/alyra-products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchDiscounts = async () => {
    try {
      const response = await fetch('/api/v2/admin/discounts/list');
      const data = await response.json();
      setDiscounts(data.discounts || []);
    } catch (error) {
      console.error('Failed to fetch discounts:', error);
    }
  };

  const handleCreateOrder = async () => {
    if (!orderForm.customerEmail || !orderForm.customerPhone || !orderForm.customerFirstName || orderForm.items.length === 0) {
      alert('Please fill in customer email, phone, first name and add at least one item');
      return;
    }

    // Validate email format
    if (!validateEmail(orderForm.customerEmail)) {
      setValidationErrors(prev => ({ ...prev, email: true }));
      return;
    }

    // Validate phone number format
    if (!validatePhone(orderForm.customerPhone)) {
      setValidationErrors(prev => ({ ...prev, phone: true }));
      return;
    }

    // Validate postal code if shipping address is provided
    if (orderForm.shippingAddress.line1 || orderForm.shippingAddress.city || orderForm.shippingAddress.postalCode) {
      if (!validatePostalCode(orderForm.shippingAddress.postalCode)) {
        setValidationErrors(prev => ({ ...prev, postalCode: true }));
        alert('Please enter a valid 6-digit postal code');
        return;
      }
    }

    setCreating(true);
    try {
      // Prepare request body - only include shippingAddress if it has required fields
      const requestBody = {
        ...orderForm,
        shippingAddress: 
          orderForm.shippingAddress.line1 && 
          orderForm.shippingAddress.city && 
          orderForm.shippingAddress.postalCode
            ? orderForm.shippingAddress
            : undefined,
      };

      const response = await fetch('/api/v2/admin/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        setOrders([data.order, ...orders]);
        setIsCreateDialogOpen(false);
        setOrderForm({
          customerEmail: '',
          customerFirstName: '',
          customerLastName: '',
          customerPhone: '+91 ',
          items: [],
          subtotalMinor: 0,
          discountMinor: 0,
          shippingMinor: 0,
          taxMinor: 0,
          totalMinor: 0,
          discountCode: '',
          paymentStatus: 'paid',
          fulfillmentStatus: 'unfulfilled',
          deliveryStatus: 'pending',
          status: 'paid',
          notes: '',
          shippingAddress: {
            line1: '',
            line2: '',
            city: '',
            state: '',
            postalCode: '',
            country: 'India'
          }
        });
        setSelectedProductId('');
        setSelectedDiscountId('none');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create order');
    } finally {
      setCreating(false);
    }
  };

  const addItem = (product: AlyraProduct) => {
    const newItem: OrderItem = {
      productId: product.id,
      variantId: product.id, // Using product ID as variant ID for Alyra products
      title: product.name,
      variantTitle: product.type,
      sku: product.sku,
      unitPriceMinor: product.priceMinor, // Use product's price from database
      qty: 1,
      lineTotalMinor: product.priceMinor, // Calculate line total
    };
    
    setOrderForm(prev => {
      const newItems = [...prev.items, newItem];
      // Recalculate totals
      const subtotalMinor = newItems.reduce((sum, item) => {
        const lineTotal = isNaN(item.lineTotalMinor) ? 0 : item.lineTotalMinor;
        return sum + lineTotal;
      }, 0);
      const totalMinor = subtotalMinor + prev.discountMinor + prev.shippingMinor + prev.taxMinor;
      
      return {
        ...prev,
        items: newItems,
        subtotalMinor,
        totalMinor
      };
    });
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    // Prevent price changes - price should only come from product data
    if (field === 'unitPriceMinor') {
      return;
    }
    
    setOrderForm(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Recalculate line total
      if (field === 'qty') {
        const unitPrice = isNaN(newItems[index].unitPriceMinor) ? 0 : newItems[index].unitPriceMinor;
        const qty = isNaN(newItems[index].qty) ? 0 : newItems[index].qty;
        newItems[index].lineTotalMinor = unitPrice * qty;
      }
      
      // Recalculate totals
      const subtotalMinor = newItems.reduce((sum, item) => {
        const lineTotal = isNaN(item.lineTotalMinor) ? 0 : item.lineTotalMinor;
        return sum + lineTotal;
      }, 0);
      const totalMinor = subtotalMinor + prev.discountMinor + prev.shippingMinor + prev.taxMinor;
      
      return {
        ...prev,
        items: newItems,
        subtotalMinor,
        totalMinor
      };
    });
  };

  const removeItem = (index: number) => {
    setOrderForm(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      const subtotalMinor = newItems.reduce((sum, item) => {
        const lineTotal = isNaN(item.lineTotalMinor) ? 0 : item.lineTotalMinor;
        return sum + lineTotal;
      }, 0);
      const totalMinor = subtotalMinor + prev.discountMinor + prev.shippingMinor + prev.taxMinor;
      
      return {
        ...prev,
        items: newItems,
        subtotalMinor,
        totalMinor
      };
    });
    // Reset the selected product when removing items
    setSelectedProductId('');
  };

  const getCustomerName = (order: Order) => {
    if (order.customer?.firstName && order.customer?.lastName) {
      return `${order.customer.firstName} ${order.customer.lastName}`;
    }
    if (order.customer?.firstName) {
      return order.customer.firstName;
    }
    return 'Guest';
  };

  const getProductTypeIcon = (type: string) => {
    return type === 'Set' ? <Package className="h-4 w-4" /> : <Tag className="h-4 w-4" />;
  };

  const getProductTypeColor = (type: string) => {
    return type === 'Set' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800';
  };

  const applyDiscount = (discountId: string) => {
    const discount = discounts.find(d => d.id === discountId);
    if (!discount) return;

    let discountAmount = 0;
    if (discount.type === 'percent') {
      discountAmount = Math.round((orderForm.subtotalMinor * discount.value) / 100);
    } else {
      discountAmount = discount.value; // Already in minor units
    }

    setOrderForm(prev => ({
      ...prev,
      discountMinor: discountAmount,
      discountCode: discount.code,
      totalMinor: prev.subtotalMinor + prev.shippingMinor + prev.taxMinor - discountAmount
    }));
  };

  const clearDiscount = () => {
    setSelectedDiscountId('none');
    setOrderForm(prev => ({
      ...prev,
      discountMinor: 0,
      discountCode: '',
      totalMinor: prev.subtotalMinor + prev.shippingMinor + prev.taxMinor
    }));
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length && orders.length > 0) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(o => o.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedOrders.length === 0) return;
    setDeleteConfirmText('');
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText !== 'delete') {
      alert('Please type "delete" to confirm');
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch('/api/v2/admin/orders/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderIds: selectedOrders }),
      });

      if (response.ok) {
        await fetchOrders();
        setSelectedOrders([]);
        setIsDeleteDialogOpen(false);
        setDeleteConfirmText('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete orders');
      }
    } catch (error) {
      console.error('Error deleting orders:', error);
      alert('Failed to delete orders');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setDeleteConfirmText('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-gray-500 mt-1">Manage and fulfill customer orders</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{showAll ? 'All Orders' : 'Recent Orders'}</CardTitle>
            <div className="flex items-center gap-3">
              <Button onClick={() => {
                setIsCreateDialogOpen(true);
                setSelectedProductId('');
                setSelectedDiscountId('none');
                setStateSearch('');
                setShowStateDropdown(false);
                setOrderForm({
                  customerEmail: '',
                  customerFirstName: '',
                  customerLastName: '',
                  customerPhone: '+91 ',
                  items: [],
                  subtotalMinor: 0,
                  discountMinor: 0,
                  shippingMinor: 0,
                  taxMinor: 0,
                  totalMinor: 0,
                  discountCode: '',
                  paymentStatus: 'paid',
                  fulfillmentStatus: 'unfulfilled',
                  deliveryStatus: 'pending',
                  status: 'paid',
                  notes: '',
                  shippingAddress: {
                    line1: '',
                    line2: '',
                    city: '',
                    state: '',
                    postalCode: '',
                    country: 'India'
                  }
                });
              }}>
                Create Order
              </Button>
              {selectedOrders.length > 0 && (
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete ({selectedOrders.length})
                </Button>
              )}
              <Select value={showAll ? 'all' : 'recent'} onValueChange={(value) => setShowAll(value === 'all')}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Orders</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading orders...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedOrders.length === orders.length && orders.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Fulfillment Status</TableHead>
                  <TableHead>Delivery Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-gray-500">
                      No orders yet
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow 
                      key={order.id} 
                      className="hover:bg-gray-50"
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                          className="rounded border-gray-300"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer font-medium"
                        onClick={() => window.location.href = `/admin/orders/${order.id}`}
                      >
                        #{padOrderNumber(order.orderNumber)}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => window.location.href = `/admin/orders/${order.id}`}
                      >
                        {getCustomerName(order)}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => window.location.href = `/admin/orders/${order.id}`}
                      >
                        {order.email}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => window.location.href = `/admin/orders/${order.id}`}
                      >
                        {order.items.length} items
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => window.location.href = `/admin/orders/${order.id}`}
                      >
                        {formatMoney(order.totalMinor)}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => window.location.href = `/admin/orders/${order.id}`}
                      >
                        <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                          {order.paymentStatus.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => window.location.href = `/admin/orders/${order.id}`}
                      >
                        <Badge className={getFulfillmentStatusColor(order.fulfillmentStatus)}>
                          {order.fulfillmentStatus.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => window.location.href = `/admin/orders/${order.id}`}
                      >
                        <Badge className={getDeliveryStatusColor(order.deliveryStatus || 'pending')}>
                          {(order.deliveryStatus || 'pending').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => window.location.href = `/admin/orders/${order.id}`}
                      >
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
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
          )}
        </CardContent>
      </Card>

      {/* Create Order Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) {
          // Reset form when dialog is closed
          setStateSearch('');
          setShowStateDropdown(false);
          setOrderForm({
            customerEmail: '',
            customerFirstName: '',
            customerLastName: '',
            customerPhone: '+91 ',
            items: [],
            subtotalMinor: 0,
            discountMinor: 0,
            shippingMinor: 0,
            taxMinor: 0,
            totalMinor: 0,
            discountCode: '',
            paymentStatus: 'paid',
            fulfillmentStatus: 'unfulfilled',
            deliveryStatus: 'pending',
            status: 'paid',
            notes: '',
            shippingAddress: {
              line1: '',
              line2: '',
              city: '',
              state: '',
              zipCode: '',
              country: 'India'
            }
          });
          setSelectedProductId('');
          setSelectedDiscountId('none');
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Customer Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerEmail">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={orderForm.customerEmail || ''}
                    onChange={(e) => {
                      setOrderForm(prev => ({ ...prev, customerEmail: e.target.value }));
                      setValidationErrors(prev => ({ ...prev, email: false }));
                    }}
                    placeholder="customer@example.com"
                    className={validationErrors.email ? 'border-red-500' : ''}
                  />
                  {validationErrors.email && (
                    <p className="text-red-500 text-sm mt-1">Please enter a valid email address</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="customerPhone">
                    Phone <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex">
                    <div className="flex items-center px-3 py-2 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md text-gray-600 text-sm">
                      +91
                    </div>
                    <Input
                      id="customerPhone"
                      type="tel"
                      value={(orderForm.customerPhone || '+91 ').replace('+91 ', '')}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Only allow digits and limit to 10 characters
                        const digits = value.replace(/\D/g, '').substring(0, 10);
                        const formatted = `+91 ${digits}`;
                        setOrderForm(prev => ({ ...prev, customerPhone: formatted }));
                        setValidationErrors(prev => ({ ...prev, phone: false }));
                      }}
                      placeholder="9876543210"
                      maxLength={10}
                      className={`rounded-l-none ${validationErrors.phone ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {validationErrors.phone && (
                    <p className="text-red-500 text-sm mt-1">Please enter a valid 10-digit phone number</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="customerFirstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customerFirstName"
                    value={orderForm.customerFirstName || ''}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, customerFirstName: e.target.value }))}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="customerLastName">Last Name</Label>
                  <Input
                    id="customerLastName"
                    value={orderForm.customerLastName || ''}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, customerLastName: e.target.value }))}
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Notes</h3>
              <div>
                <Label htmlFor="orderNotes">
                  Order Notes
                </Label>
                <textarea
                  id="orderNotes"
                  value={orderForm.notes || ''}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical min-h-[100px]"
                  rows={4}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Use this space to add Razorpay Payment ID, Order ID, or any other relevant notes for this order.
                </p>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 className="text-lg font-medium">Shipping Address</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="shippingLine1" className="font-semibold">
                    Address Line 1
                  </Label>
                  <Input
                    id="shippingLine1"
                    value={orderForm.shippingAddress.line1 || ''}
                    onChange={(e) => setOrderForm(prev => ({
                      ...prev,
                      shippingAddress: { ...prev.shippingAddress, line1: e.target.value }
                    }))}
                    placeholder="Enter your address"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="shippingLine2" className="font-semibold">
                    Address Line 2
                  </Label>
                  <Input
                    id="shippingLine2"
                    value={orderForm.shippingAddress.line2 || ''}
                    onChange={(e) => setOrderForm(prev => ({
                      ...prev,
                      shippingAddress: { ...prev.shippingAddress, line2: e.target.value }
                    }))}
                    placeholder="Apartment, suite, etc. (optional)"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="shippingCity" className="font-semibold">
                      City
                    </Label>
                    <Input
                      id="shippingCity"
                      value={orderForm.shippingAddress.city || ''}
                      onChange={(e) => setOrderForm(prev => ({
                        ...prev,
                        shippingAddress: { ...prev.shippingAddress, city: e.target.value }
                      }))}
                      placeholder="Enter your city"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="shippingState" className="font-semibold">
                      State
                    </Label>
                    <Popover open={showStateDropdown} onOpenChange={setShowStateDropdown}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={showStateDropdown}
                          className="w-full justify-between mt-1"
                        >
                          {orderForm.shippingAddress.state || "Select your state"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Search states..." 
                            value={stateSearch}
                            onValueChange={(value) => {
                              setStateSearch(value);
                              if (value === '') {
                                setOrderForm(prev => ({
                                  ...prev,
                                  shippingAddress: { ...prev.shippingAddress, state: '' }
                                }));
                              }
                            }}
                          />
                          <CommandList>
                            <CommandEmpty>No state found.</CommandEmpty>
                            <CommandGroup>
                              {filteredStates.map((state) => (
                                <CommandItem
                                  key={state}
                                  value={state}
                                  onSelect={(currentValue) => {
                                    setOrderForm(prev => ({
                                      ...prev,
                                      shippingAddress: { ...prev.shippingAddress, state: currentValue }
                                    }));
                                    setShowStateDropdown(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      orderForm.shippingAddress.state === state ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  {state}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="shippingPostalCode" className="font-semibold">
                      ZIP Code <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="shippingPostalCode"
                      type="text"
                      value={orderForm.shippingAddress.postalCode || ''}
                      onChange={(e) => {
                        // Only allow digits and limit to 6 characters
                        const value = e.target.value.replace(/\D/g, '').substring(0, 6);
                        setOrderForm(prev => ({
                          ...prev,
                          shippingAddress: { ...prev.shippingAddress, postalCode: value }
                        }));
                        setValidationErrors(prev => ({ ...prev, postalCode: false }));
                      }}
                      placeholder="123456"
                      maxLength={6}
                      className={`mt-1 ${validationErrors.postalCode ? 'border-red-500' : ''}`}
                    />
                    {validationErrors.postalCode && (
                      <p className="text-red-500 text-sm mt-1">Postal code must be exactly 6 digits</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="shippingCountry" className="font-semibold">
                      Country
                    </Label>
                    <Input
                      id="shippingCountry"
                      value="India"
                      readOnly
                      className="mt-1 bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Add Product Button */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Order Items</h3>
                <Select 
                  value={selectedProductId} 
                  onValueChange={(productId) => {
                    setSelectedProductId(productId);
                    const product = products.find(p => p.id === productId);
                    if (product) {
                      addItem(product);
                      setSelectedProductId(''); // Reset after adding
                    }
                  }}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Add a product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        <div className="flex items-center gap-2">
                          {getProductTypeIcon(product.type)}
                          <span>{product.name}</span>
                          <Badge className={`ml-2 ${getProductTypeColor(product.type)}`}>
                            {product.type}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-4">
              <div className="space-y-3">
                {orderForm.items.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                    <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No items added yet. Use the dropdown above to add products.</p>
                  </div>
                ) : (
                  orderForm.items.map((item, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{item.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {item.variantTitle}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">{item.sku}</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Price (₹)</Label>
                            <Input
                              type="number"
                              value={isNaN(item.unitPriceMinor / 100) ? '' : item.unitPriceMinor / 100}
                              readOnly
                              className="w-24 h-8 bg-gray-50 cursor-not-allowed"
                              placeholder="0.00"
                            />
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Qty</Label>
                            <Input
                              type="number"
                              value={isNaN(item.qty) ? '' : item.qty}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                updateItem(index, 'qty', isNaN(value) ? 0 : value);
                              }}
                              className="w-16 h-8"
                              placeholder="1"
                            />
                          </div>
                          
                          <div className="w-24 text-right">
                            <p className="font-semibold text-lg">
                              ₹{isNaN(item.lineTotalMinor / 100) ? '0.00' : (item.lineTotalMinor / 100).toFixed(2)}
                            </p>
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Discount Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Apply Discount</h3>
                <div className="flex items-center gap-2">
                  <Select 
                    value={selectedDiscountId} 
                    onValueChange={(discountId) => {
                      setSelectedDiscountId(discountId);
                      if (discountId && discountId !== 'none') {
                        applyDiscount(discountId);
                      } else {
                        clearDiscount();
                      }
                    }}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select a discount..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No discount</SelectItem>
                      {discounts.map((discount) => (
                        <SelectItem key={discount.id} value={discount.id}>
                          <div className="flex items-center gap-2">
                            <span>{discount.code}</span>
                            <Badge variant="outline" className="text-xs">
                              {discount.type === 'percent' ? `${discount.value}%` : `₹${(discount.value / 100).toFixed(2)}`}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {orderForm.discountMinor > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-800">
                      Discount Applied: {orderForm.discountCode}
                    </span>
                    <span className="text-sm font-bold text-green-800">
                      -₹{(orderForm.discountMinor / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Order Status */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Order Status</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="paymentStatus" className="font-semibold">
                    Payment Status
                  </Label>
                  <Select 
                    value={orderForm.paymentStatus} 
                    onValueChange={(value) => setOrderForm(prev => ({ ...prev, paymentStatus: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fulfillmentStatus" className="font-semibold">
                    Fulfillment Status
                  </Label>
                  <Select 
                    value={orderForm.fulfillmentStatus} 
                    onValueChange={(value) => setOrderForm(prev => ({ ...prev, fulfillmentStatus: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                      <SelectItem value="fulfilled">Fulfilled</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="deliveryStatus" className="font-semibold">
                    Delivery Status
                  </Label>
                  <Select 
                    value={orderForm.deliveryStatus} 
                    onValueChange={(value) => setOrderForm(prev => ({ ...prev, deliveryStatus: value }))}
                  >
                    <SelectTrigger className="mt-1">
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
            </div>

            {/* Order Totals */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Order Summary</h3>
              <Card className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">₹{isNaN(orderForm.subtotalMinor / 100) ? '0.00' : (orderForm.subtotalMinor / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount:</span>
                    <span className="font-medium text-green-600">-₹{isNaN(orderForm.discountMinor / 100) ? '0.00' : (orderForm.discountMinor / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping:</span>
                    <span className="font-medium">₹{isNaN(orderForm.shippingMinor / 100) ? '0.00' : (orderForm.shippingMinor / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-medium">₹{isNaN(orderForm.taxMinor / 100) ? '0.00' : (orderForm.taxMinor / 100).toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-blue-600">₹{isNaN(orderForm.totalMinor / 100) ? '0.00' : (orderForm.totalMinor / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              // Reset form when cancel is clicked
              setStateSearch('');
              setShowStateDropdown(false);
              setOrderForm({
                customerEmail: '',
                customerFirstName: '',
                customerLastName: '',
                customerPhone: '+91 ',
                items: [],
                subtotalMinor: 0,
                discountMinor: 0,
                shippingMinor: 0,
                taxMinor: 0,
                totalMinor: 0,
                discountCode: '',
                paymentStatus: 'paid',
                fulfillmentStatus: 'unfulfilled',
                deliveryStatus: 'pending',
                status: 'paid',
                notes: '',
                shippingAddress: {
                  line1: '',
                  line2: '',
                  city: '',
                  state: '',
                  postalCode: '',
                  country: 'India'
                }
              });
              setSelectedProductId('');
              setSelectedDiscountId('none');
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrder} disabled={creating}>
              {creating ? 'Creating...' : 'Create Order'}
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
              Delete Orders
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                You are about to delete <strong>{selectedOrders.length}</strong> order(s). This action cannot be undone.
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Note:</strong> Order numbers are sequential and will never be reused, similar to Shopify.
              </p>
              <p className="text-sm text-gray-600">
                Orders to be deleted:
              </p>
              <ul className="text-sm text-gray-500 mt-1 max-h-32 overflow-y-auto">
                {selectedOrders.map(id => {
                  const order = orders.find(o => o.id === id);
                  return order ? (
                    <li key={id} className="flex items-center gap-2">
                      <span className="font-medium">#{padOrderNumber(order.orderNumber)}</span>
                      <span>-</span>
                      <span>{getCustomerName(order)}</span>
                      <span className="text-gray-400">({formatMoney(order.totalMinor)})</span>
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
            <Button variant="outline" onClick={handleCancelDelete} disabled={deleting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete} 
              disabled={deleting || deleteConfirmText !== 'delete'}
            >
              {deleting ? 'Deleting...' : 'Delete Orders'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

