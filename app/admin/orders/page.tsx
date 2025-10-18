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
import { Plus, Package, Tag, Check, ChevronsUpDown } from 'lucide-react';

interface Order {
  id: string;
  orderNumber: number;
  email: string;
  paymentStatus: string;
  fulfillmentStatus: string;
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
      return 'bg-green-100 text-green-800';
    case 'partial':
      return 'bg-blue-100 text-blue-800';
    case 'unfulfilled':
      return 'bg-yellow-100 text-yellow-800';
    case 'returned':
      return 'bg-red-100 text-red-800';
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
    customerPhone: '',
    items: [] as OrderItem[],
    subtotalMinor: 0,
    discountMinor: 0,
    shippingMinor: 0,
    taxMinor: 0,
    totalMinor: 0,
    discountCode: '',
    paymentStatus: 'paid',
    fulfillmentStatus: 'unfulfilled',
    status: 'paid',
    shippingAddress: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India'
    }
  });
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [selectedDiscountId, setSelectedDiscountId] = useState<string>('none');
  const [stateSearch, setStateSearch] = useState('');
  const [showStateDropdown, setShowStateDropdown] = useState(false);

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

    setCreating(true);
    try {
      const response = await fetch('/api/v2/admin/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderForm),
      });

      if (response.ok) {
        const data = await response.json();
        setOrders([data.order, ...orders]);
        setIsCreateDialogOpen(false);
        setOrderForm({
          customerEmail: '',
          customerFirstName: '',
          customerLastName: '',
          customerPhone: '',
          items: [],
          subtotalMinor: 0,
          discountMinor: 0,
          shippingMinor: 0,
          taxMinor: 0,
          totalMinor: 0,
          discountCode: '',
          paymentStatus: 'paid',
          fulfillmentStatus: 'unfulfilled',
          status: 'paid',
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
      unitPriceMinor: 0, // Will be set by user
      qty: 1,
      lineTotalMinor: 0,
    };
    
    setOrderForm(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const updateItem = (index: number, field: keyof OrderItem, value: any) => {
    setOrderForm(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Recalculate line total
      if (field === 'unitPriceMinor' || field === 'qty') {
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
                  customerPhone: '',
                  items: [],
                  subtotalMinor: 0,
                  discountMinor: 0,
                  shippingMinor: 0,
                  taxMinor: 0,
                  totalMinor: 0,
                  discountCode: '',
                  paymentStatus: 'paid',
                  fulfillmentStatus: 'unfulfilled',
                  status: 'paid',
                  shippingAddress: {
                    line1: '',
                    line2: '',
                    city: '',
                    state: '',
                    zipCode: '',
                    country: 'India'
                  }
                });
              }}>
                Create Order
              </Button>
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
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Fulfillment Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500">
                      No orders yet
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow key={order.id} className="cursor-pointer hover:bg-gray-50">
                      <TableCell>
                        <Link href={`/admin/orders/${order.id}`} className="font-medium hover:underline">
                          #{padOrderNumber(order.orderNumber)}
                        </Link>
                      </TableCell>
                      <TableCell>{getCustomerName(order)}</TableCell>
                      <TableCell>{order.email}</TableCell>
                      <TableCell>{order.items.length} items</TableCell>
                      <TableCell>{formatMoney(order.totalMinor)}</TableCell>
                      <TableCell>
                        <Badge className={getPaymentStatusColor(order.paymentStatus)}>
                          {order.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getFulfillmentStatusColor(order.fulfillmentStatus)}>
                          {order.fulfillmentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
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
            customerPhone: '',
            items: [],
            subtotalMinor: 0,
            discountMinor: 0,
            shippingMinor: 0,
            taxMinor: 0,
            totalMinor: 0,
            discountCode: '',
            paymentStatus: 'paid',
            fulfillmentStatus: 'unfulfilled',
            status: 'paid',
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
                    value={orderForm.customerEmail}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, customerEmail: e.target.value }))}
                    placeholder="customer@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">
                    Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customerPhone"
                    type="tel"
                    value={orderForm.customerPhone}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                    placeholder="+91 9876543210"
                  />
                </div>
                <div>
                  <Label htmlFor="customerFirstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customerFirstName"
                    value={orderForm.customerFirstName}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, customerFirstName: e.target.value }))}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="customerLastName">Last Name</Label>
                  <Input
                    id="customerLastName"
                    value={orderForm.customerLastName}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, customerLastName: e.target.value }))}
                    placeholder="Doe"
                  />
                </div>
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
                    value={orderForm.shippingAddress.line1}
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
                    value={orderForm.shippingAddress.line2}
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
                      value={orderForm.shippingAddress.city}
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
                    <Label htmlFor="shippingZipCode" className="font-semibold">
                      ZIP Code
                    </Label>
                    <Input
                      id="shippingZipCode"
                      value={orderForm.shippingAddress.zipCode}
                      onChange={(e) => setOrderForm(prev => ({
                        ...prev,
                        shippingAddress: { ...prev.shippingAddress, zipCode: e.target.value }
                      }))}
                      placeholder="Enter ZIP code"
                      className="mt-1"
                    />
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
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                updateItem(index, 'unitPriceMinor', isNaN(value) ? 0 : Math.round(value * 100));
                              }}
                              className="w-24 h-8"
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
                customerPhone: '',
                items: [],
                subtotalMinor: 0,
                discountMinor: 0,
                shippingMinor: 0,
                taxMinor: 0,
                totalMinor: 0,
                discountCode: '',
                paymentStatus: 'paid',
                fulfillmentStatus: 'unfulfilled',
                status: 'paid',
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
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrder} disabled={creating}>
              {creating ? 'Creating...' : 'Create Order'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

