// Test script to verify delivery status functionality
// This can be run to test the backend APIs

const testDeliveryStatus = async () => {
  console.log('🧪 Testing Delivery Status Backend Integration...\n');

  // Test 1: Create Order with Delivery Status
  console.log('1️⃣ Testing Create Order API...');
  try {
    const createOrderResponse = await fetch('/api/v2/admin/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail: 'test@example.com',
        customerFirstName: 'Test',
        customerLastName: 'User',
        customerPhone: '+91 9876543210',
        items: [{
          productId: 'test-product-id',
          variantId: 'test-variant-id',
          title: 'Test Product',
          variantTitle: 'Test Variant',
          sku: 'TEST-SKU',
          unitPriceMinor: 10000, // ₹100.00
          qty: 1,
          lineTotalMinor: 10000,
        }],
        subtotalMinor: 10000,
        discountMinor: 0,
        shippingMinor: 0,
        taxMinor: 0,
        totalMinor: 10000,
        paymentStatus: 'paid',
        fulfillmentStatus: 'unfulfilled',
        deliveryStatus: 'pending',
        status: 'paid',
        shippingAddress: {
          line1: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          country: 'India',
        },
      }),
    });

    if (createOrderResponse.ok) {
      const order = await createOrderResponse.json();
      console.log('✅ Create Order API: SUCCESS');
      console.log(`   Order ID: ${order.order.id}`);
      console.log(`   Delivery Status: ${order.order.deliveryStatus}`);
      
      // Test 2: Update Delivery Status
      console.log('\n2️⃣ Testing Update Delivery Status API...');
      const updateResponse = await fetch('/api/v2/admin/orders/update-delivery-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.order.id,
          deliveryStatus: 'shipped',
        }),
      });

      if (updateResponse.ok) {
        const updatedOrder = await updateResponse.json();
        console.log('✅ Update Delivery Status API: SUCCESS');
        console.log(`   Updated Delivery Status: ${updatedOrder.order.deliveryStatus}`);
      } else {
        console.log('❌ Update Delivery Status API: FAILED');
        console.log(await updateResponse.text());
      }

      // Test 3: Get Order with Delivery Status
      console.log('\n3️⃣ Testing Get Order API...');
      const getOrderResponse = await fetch(`/api/v2/orders/get?id=${order.order.id}`);
      
      if (getOrderResponse.ok) {
        const orderData = await getOrderResponse.json();
        console.log('✅ Get Order API: SUCCESS');
        console.log(`   Delivery Status: ${orderData.order.deliveryStatus}`);
      } else {
        console.log('❌ Get Order API: FAILED');
        console.log(await getOrderResponse.text());
      }

    } else {
      console.log('❌ Create Order API: FAILED');
      console.log(await createOrderResponse.text());
    }

  } catch (error) {
    console.log('❌ Test failed with error:', error);
  }

  console.log('\n🎉 Backend Integration Test Complete!');
};

// Export for use in other files
export { testDeliveryStatus };
