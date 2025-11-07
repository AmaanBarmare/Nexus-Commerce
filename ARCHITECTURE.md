# Alyra Admin - Complete Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Application Architecture](#application-architecture)
4. [Database Schema](#database-schema)
5. [Authentication & Authorization](#authentication--authorization)
6. [API Architecture](#api-architecture)
7. [Data Flow](#data-flow)
8. [External Integrations](#external-integrations)
9. [File Structure](#file-structure)
10. [Key Features](#key-features)

---

## System Overview

Alyra Admin is a **Next.js 15** e-commerce admin panel built with the App Router. It provides a comprehensive backend API and admin dashboard for managing an e-commerce storefront. The system handles:

- **Product Management**: Inventory tracking, product CRUD operations
- **Order Management**: Order processing, fulfillment, payment tracking
- **Customer Management**: Customer profiles, addresses, email subscriptions
- **Discount Management**: Discount codes with product/order-level scoping
- **Analytics**: Revenue and order tracking with charts
- **Payment Processing**: Razorpay integration with webhook handling
- **Email Notifications**: Order confirmations via Resend
- **Analytics Tracking**: GA4 purchase events

---

## Technology Stack

### Core Framework
- **Next.js 15.5.5** (App Router)
- **React 19** (Server & Client Components)
- **TypeScript 5.7**

### Database & ORM
- **PostgreSQL** (via Supabase)
- **Prisma 6.17** (ORM & migrations)

### Authentication
- **Supabase Auth** (Email/password & magic links)
- **@supabase/ssr** for server-side session management

### UI & Styling
- **Tailwind CSS 3.4**
- **shadcn/ui** components (Radix UI primitives)
- **Lucide React** (icons)
- **Recharts 2.13** (charts/analytics)

### Third-Party Services
- **Razorpay** (payment processing)
- **Google Analytics 4** (Measurement Protocol)
- **Resend** (email delivery)

### Validation
- **Zod 3.23** (schema validation)

---

## Application Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser)                          │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  Storefront      │◄────────┤  Admin Dashboard │          │
│  │  (alyra.in)      │         │  (Next.js App)   │          │
│  └────────┬─────────┘         └────────┬─────────┘          │
└───────────┼────────────────────────────┼────────────────────┘
            │                            │
            │ HTTPS                      │ HTTPS
            │                            │
┌───────────▼────────────────────────────▼────────────────────┐
│              Next.js 15 Application (Vercel)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Middleware (Route Protection)                       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  App Router                                          │   │
│  │  ├── /admin/* (Protected)                           │   │
│  │  └── /api/v2/* (Public & Admin APIs)                │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Business Logic                                      │   │
│  │  ├── lib/auth.ts (Supabase client)                  │   │
│  │  ├── lib/db.ts (Prisma client)                      │   │
│  │  ├── lib/cors.ts (CORS headers)                     │   │
│  │  ├── lib/ga.ts (GA4 tracking)                       │   │
│  │  └── lib/resend.ts (Email sending)                  │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────┬──────────────────────────────────────────────────┘
            │
            ├──────────────────┬──────────────────┬────────────┐
            │                  │                  │            │
┌───────────▼─────────┐ ┌──────▼────────┐ ┌──────▼──────┐ ┌──▼──────┐
│  Supabase (Postgres)│ │  Razorpay     │ │  GA4        │ │ Resend  │
│  - Database         │ │  - Payments   │ │  - Analytics│ │ - Email │
│  - Auth             │ │  - Webhooks   │ │             │ │         │
└─────────────────────┘ └───────────────┘ └─────────────┘ └─────────┘
```

### Request Flow

1. **Admin Dashboard Request**:
   ```
   Browser → Middleware (auth check) → Admin Page → Server Component → Database
   ```

2. **Public API Request**:
   ```
   Storefront → API Route → CORS Check → Business Logic → Database → Response
   ```

3. **Payment Webhook**:
   ```
   Razorpay → Webhook Route → Signature Verification → Update Order → GA4 + Email
   ```

---

## Database Schema

### Core Models

#### **AlyraProduct**
- Product catalog (Refills, Sets)
- Fields: `id`, `name`, `sku`, `type`, `status`, `inventory`, `priceMinor`
- Relationships: `discountProducts` (many-to-many with Discount)

#### **Customer**
- Customer profiles
- Fields: `id`, `email`, `firstName`, `lastName`, `phone`, `acceptsEmail`
- Relationships: `addresses` (one-to-many), `orders` (one-to-many)

#### **Address**
- Shipping/billing addresses
- Fields: `id`, `customerId`, `line1`, `line2`, `city`, `state`, `postalCode`, `country`, `isDefault`
- Cascade delete with customer

#### **Order**
- Order records
- Fields: 
  - Status: `status` (pending/paid/fulfilled/cancelled/refunded)
  - Payment: `paymentStatus` (unpaid/paid/refunded)
  - Fulfillment: `fulfillmentStatus` (unfulfilled/fulfilled/returned)
  - Delivery: `deliveryStatus` (pending/shipped/delivered)
  - Financial: `subtotalMinor`, `discountMinor`, `shippingMinor`, `taxMinor`, `totalMinor`
  - Metadata: `orderNumber` (unique, sequential), `razorpayOrderId`, `paymentRef`, `notes`
- Relationships: `customer` (optional), `items` (one-to-many)

#### **OrderItem**
- Line items in orders
- Fields: `productId`, `variantId`, `title`, `variantTitle`, `sku`, `unitPriceMinor`, `qty`, `lineTotalMinor`
- Immutable after order creation

#### **Discount**
- Discount codes
- Fields: `code` (unique), `type` (percent/fixed), `value`, `scope` (PRODUCT/ORDER)
- Constraints: `startsAt`, `endsAt`, `usageLimit`, `perCustomer`, `minSubtotalMinor`, `timesUsed`, `active`
- Relationships: `productDiscounts` (many-to-many with AlyraProduct)

#### **DiscountProduct**
- Junction table for product-specific discounts
- Links `discountId` ↔ `productId`

#### **Cart & CartItem**
- Shopping cart (cookie-based)
- Cart: `id`, `email` (optional), `discountCode`
- CartItem: `productId`, `variantId`, `title`, `sku`, `unitPriceMinor`, `qty`

#### **Subscriber**
- Newsletter subscribers
- Fields: `email` (unique), `name`, `source`, `status`

#### **ProcessedEvent**
- Webhook idempotency
- Fields: `id` (event ID), `createdAt`

#### **OrderCounter**
- Singleton table for order number tracking
- Fields: `id` ('singleton'), `counter`

### Enums

- **OrderStatus**: `pending`, `paid`, `fulfilled`, `cancelled`, `refunded`
- **PaymentStatus**: `unpaid`, `paid`, `refunded`
- **FulfillmentStatus**: `unfulfilled`, `fulfilled`, `returned`
- **DeliveryStatus**: `pending`, `shipped`, `delivered`
- **DiscountType**: `percent`, `fixed`
- **DiscountScope**: `PRODUCT`, `ORDER`
- **AlyraProductType**: `Refill`, `Set`
- **AlyraProductStatus**: `Active`, `Inactive`

---

## Authentication & Authorization

### Authentication Flow

1. **Middleware Protection** (`middleware.ts`):
   - Protects all `/admin/*` routes (except `/admin`)
   - Uses Supabase SSR client to check session
   - Redirects unauthenticated users to `/admin`

2. **Login Page** (`/admin`):
   - Email/password authentication via Supabase
   - Client-side: `createBrowserClient` from `@supabase/ssr`
   - Redirects to `/admin/overview` on success

3. **Server-Side Auth** (`lib/auth.ts`):
   - `createSupabaseServerClient()`: Creates server client using cookies
   - `isAdminUser()`: Checks if user is authenticated (any authenticated user = admin)

4. **Session Management**:
   - Supabase handles session cookies automatically
   - Middleware validates session on every request
   - No role-based access control (any authenticated user = admin)

### Authorization

- **Admin Routes**: Protected by middleware, requires Supabase session
- **Public APIs**: No authentication required (CORS-protected)
- **Admin APIs**: Currently no explicit auth check (relies on middleware if under `/admin/api`)

---

## API Architecture

### API Structure

All APIs are versioned under `/api/v2/`:

```
/api/v2/
├── products/          # Public product APIs
├── cart/              # Public cart APIs
├── orders/            # Public order APIs
├── discounts/         # Public discount APIs
├── subscribers/       # Public subscriber API
├── webhooks/          # Public webhook endpoints
└── admin/             # Admin-only APIs
    ├── orders/
    ├── products/
    ├── discounts/
    └── customers/
```

### Public APIs (CORS-enabled)

#### Products
- `GET /api/v2/products/list` - List active products with inventory
- `GET /api/v2/products/by-slug?slug=...` - Get product by slug

#### Cart
- `POST /api/v2/cart/add-item` - Add item to cart (cookie-based)
- `PATCH /api/v2/cart/update-item` - Update cart item quantity
- `POST /api/v2/cart/apply-discount` - Apply discount code to cart

#### Orders
- `POST /api/v2/orders/checkout` - Create order & Razorpay payment
- `GET /api/v2/orders/get?id=...` - Get order details

#### Discounts
- `POST /api/v2/discounts/validate` - Validate discount code

#### Subscribers
- `POST /api/v2/subscribers` - Add newsletter subscriber

#### Webhooks
- `POST /api/v2/webhooks/razorpay` - Razorpay payment webhook

### Admin APIs

#### Orders
- `GET /api/v2/admin/orders/list` - List orders (paginated)
- `POST /api/v2/admin/orders/create` - Create manual order
- `POST /api/v2/admin/orders/fulfill` - Mark order as fulfilled
- `POST /api/v2/admin/orders/update-payment-status` - Update payment status
- `POST /api/v2/admin/orders/update-fulfillment-status` - Update fulfillment status
- `POST /api/v2/admin/orders/update-delivery-status` - Update delivery status
- `POST /api/v2/admin/orders/update-notes` - Update order notes
- `DELETE /api/v2/admin/orders/delete` - Delete order

#### Products
- `GET /api/v2/admin/products/list` - List all products
- `PATCH /api/v2/admin/products/update` - Update product/variant

#### Discounts
- `GET /api/v2/admin/discounts/list` - List all discounts
- `POST /api/v2/admin/discounts/create` - Create/update discount
- `PATCH /api/v2/admin/discounts/update/[id]` - Update discount
- `DELETE /api/v2/admin/discounts/delete/[id]` - Delete discount

#### Customers
- `GET /api/v2/admin/customers/list` - List customers
- `GET /api/v2/admin/customers/get?id=...` - Get customer details
- `POST /api/v2/admin/customers/create` - Create customer
- `POST /api/v2/admin/customers/update-email-subscription` - Update email preference
- `DELETE /api/v2/admin/customers/delete` - Delete customer

### CORS Configuration

- **Origin**: `ALLOWED_ORIGIN` env var (default: `*`)
- **Methods**: `GET, POST, PATCH, DELETE, OPTIONS`
- **Headers**: `Content-Type, Authorization, X-Cart-Id`
- **Credentials**: `true`

---

## Data Flow

### Order Creation Flow

```
1. Storefront → POST /api/v2/orders/checkout
   ├── Validates cart items
   ├── Checks inventory availability
   ├── Calculates totals (subtotal, discount, shipping, tax)
   └── Creates order in database (status: pending, paymentStatus: unpaid)

2. Database Transaction:
   ├── Creates Order record
   ├── Creates OrderItem records
   ├── Decrements inventory
   └── Creates/updates Customer record

3. Razorpay Integration:
   ├── Creates Razorpay order
   ├── Links razorpayOrderId to Order
   └── Returns payment details to storefront

4. Storefront → User completes payment on Razorpay

5. Razorpay → POST /api/v2/webhooks/razorpay
   ├── Verifies webhook signature
   ├── Checks idempotency (ProcessedEvent)
   ├── Updates Order (paymentStatus: paid, status: paid)
   ├── Sends GA4 purchase event
   └── Sends order confirmation email
```

### Cart Management Flow

```
1. Storefront → POST /api/v2/cart/add-item
   ├── Gets/creates Cart from cookie (X-Cart-Id)
   ├── Adds/updates CartItem
   └── Returns updated cart

2. Cart persists via cookie (X-Cart-Id = cart.id)

3. Storefront → POST /api/v2/cart/apply-discount
   ├── Validates discount code
   ├── Checks discount constraints (scope, usage, dates)
   ├── Applies discount to cart
   └── Returns updated totals
```

### Discount Application Logic

```
Discount Types:
- PRODUCT: Applied to specific products (via DiscountProduct junction)
- ORDER: Applied to entire order

Discount Validation:
1. Check if code exists and is active
2. Check date range (startsAt, endsAt)
3. Check usage limits (usageLimit, perCustomer)
4. Check minimum subtotal (minSubtotalMinor)
5. For PRODUCT scope: Verify product is in discountProducts
6. Calculate discount value:
   - percent: (subtotal * value) / 100
   - fixed: value (in minor units)
```

---

## External Integrations

### Razorpay (Payments)

**Setup**:
- Environment: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- Webhook URL: `/api/v2/webhooks/razorpay`
- Event: `payment.captured`

**Flow**:
1. Create Razorpay order during checkout
2. Store `razorpayOrderId` in Order
3. User pays on Razorpay checkout
4. Razorpay sends webhook with payment details
5. Webhook verifies signature (HMAC SHA256)
6. Updates order status to `paid`
7. Triggers GA4 event and email

**Webhook Security**:
- Signature verification using `RAZORPAY_WEBHOOK_SECRET`
- Idempotency via `ProcessedEvent` table
- Returns 204 on success, 401 on invalid signature

### Google Analytics 4 (Analytics)

**Setup**:
- Environment: `VITE_GA4_ID`, `GA4_API_SECRET`
- Measurement Protocol API

**Tracking**:
- Purchase events sent on successful payment
- Data: `transaction_id`, `value`, `currency`, `tax`, `shipping`, `coupon`, `items`
- Sent via `lib/ga.ts` → `sendGaPurchase()`

**Event Format**:
```json
{
  "client_id": "anon.{orderNumber}",
  "user_id": "{customerId}",
  "events": [{
    "name": "purchase",
    "params": {
      "transaction_id": "{orderNumber}",
      "value": {totalMinor / 100},
      "currency": "INR",
      "items": [...]
    }
  }]
}
```

### Resend (Email)

**Setup**:
- Environment: `RESEND_API_KEY`
- From: `Alyra <contact@alyra.in>`

**Emails Sent**:
- Order confirmation (on payment success)
- Template: `generateOrderConfirmationEmail()` in `lib/resend.ts`
- Includes: order number, items, total, shipping address

### Supabase (Database & Auth)

**Database**:
- PostgreSQL hosted on Supabase
- Connection: `DATABASE_URL`, `DIRECT_URL`
- Migrations: Prisma

**Authentication**:
- Email/password auth
- Session management via cookies
- Client: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## File Structure

```
alyra-admin/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin dashboard pages
│   │   ├── layout.tsx           # Admin shell with sidebar
│   │   ├── page.tsx             # Login page
│   │   ├── overview/            # Dashboard with KPIs & charts
│   │   ├── orders/              # Order management
│   │   │   ├── page.tsx         # Orders list
│   │   │   └── [id]/page.tsx    # Order detail
│   │   ├── product/             # Product management
│   │   ├── inventory/           # Inventory management
│   │   ├── discounts/           # Discount management
│   │   ├── customers/           # Customer management
│   │   ├── subscribers/         # Newsletter subscribers
│   │   └── settings/            # Settings page
│   ├── api/                      # API routes
│   │   ├── v2/                  # Versioned APIs
│   │   │   ├── products/        # Product APIs
│   │   │   ├── cart/            # Cart APIs
│   │   │   ├── orders/          # Order APIs
│   │   │   ├── discounts/       # Discount APIs
│   │   │   ├── subscribers/     # Subscriber API
│   │   │   ├── webhooks/        # Webhook endpoints
│   │   │   └── admin/           # Admin APIs
│   │   ├── auth/                # Auth routes
│   │   └── session/             # Session routes
│   ├── globals.css              # Global styles
│   └── layout.tsx               # Root layout
│
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── ...
│   └── charts/                  # Chart components
│       ├── orders-bar-chart.tsx
│       └── revenue-line-chart.tsx
│
├── lib/                          # Utility libraries
│   ├── auth.ts                  # Supabase auth helpers
│   ├── db.ts                    # Prisma client
│   ├── cors.ts                  # CORS utilities
│   ├── ga.ts                    # GA4 tracking
│   ├── resend.ts                # Email sending
│   ├── order-counter.ts         # Order number generation
│   ├── util.ts                  # Utility functions
│   ├── utils.ts                 # shadcn/utils
│   └── zod-schemas.ts           # Validation schemas
│
├── prisma/                       # Database
│   ├── schema.prisma            # Prisma schema
│   ├── migrations/              # Migration history
│   └── seed.ts                  # Seed script
│
├── middleware.ts                 # Route protection
├── next.config.js               # Next.js config
├── tailwind.config.ts           # Tailwind config
├── tsconfig.json                # TypeScript config
└── package.json                 # Dependencies
```

---

## Key Features

### Admin Dashboard

1. **Overview Page** (`/admin/overview`):
   - Today's orders count
   - Today's revenue
   - Average order value (30 days)
   - Orders bar chart (7 days)
   - Revenue line chart (30 days)

2. **Orders Management**:
   - List view with pagination
   - Order detail page with:
     - Order information
     - Customer details
     - Order items
     - Payment status updates
     - Fulfillment status updates
     - Delivery status updates
     - Order notes
     - Shipping address

3. **Product Management**:
   - List products
   - Update inventory
   - Update product details

4. **Discount Management**:
   - Create/edit discounts
   - Set product-specific or order-wide discounts
   - Configure usage limits and date ranges

5. **Customer Management**:
   - View customer list
   - View customer details
   - Manage email subscriptions
   - View customer orders

6. **Subscribers**:
   - View newsletter subscribers
   - Export subscriber list

### Order Number Generation

- **Monotonic**: Sequential, never reused
- **Atomic**: Generated in database to prevent race conditions
- **Persistent**: Never reset, even if orders deleted
- Implementation: `lib/order-counter.ts` → `getNextOrderNumber()`

### Inventory Management

- **Real-time tracking**: Inventory decremented on order creation
- **Lock-based**: Transactions prevent overselling
- **Validation**: Check inventory before order creation

### Payment Processing

- **Razorpay integration**: Create orders, handle payments
- **Webhook processing**: Automatic payment confirmation
- **Idempotency**: Prevent duplicate webhook processing
- **Status tracking**: Payment status, fulfillment status, delivery status

### Analytics & Tracking

- **GA4 integration**: Purchase events on successful payments
- **Server-side tracking**: Measurement Protocol API
- **Dashboard analytics**: Revenue and order charts

### Email Notifications

- **Order confirmations**: Sent on successful payment
- **HTML templates**: Professional email design
- **Resend integration**: Reliable email delivery

---

## Security Considerations

1. **Authentication**: Supabase session-based auth
2. **CORS**: Restricted to `ALLOWED_ORIGIN`
3. **Webhook Security**: HMAC signature verification
4. **SQL Injection**: Prisma ORM prevents SQL injection
5. **XSS**: Next.js auto-escaping, React sanitization
6. **CSRF**: SameSite cookies, CORS headers
7. **Rate Limiting**: Not implemented (consider adding)
8. **Input Validation**: Zod schemas for API validation

---

## Performance Optimizations

1. **Database Indexing**: Indexes on frequently queried fields
2. **Prisma Query Optimization**: Select only needed fields
3. **Caching**: Dashboard data cached for 60 seconds
4. **Server Components**: Minimal client-side JavaScript
5. **Image Optimization**: Next.js Image component (if used)

---

## Deployment

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Razorpay
RAZORPAY_KEY_ID=rzp_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# GA4
VITE_GA4_ID=G-...
GA4_API_SECRET=...

# Resend
RESEND_API_KEY=re_...

# CORS
ALLOWED_ORIGIN=https://www.alyra.in

# App
NODE_ENV=production
```

### Build Process

1. `prisma generate` - Generate Prisma client
2. `next build` - Build Next.js application
3. `prisma migrate deploy` - Run migrations (production)

### Deployment Platform

- **Vercel** (recommended)
- Automatic deployments from Git
- Environment variables configured in Vercel dashboard
- Webhook URL: `https://your-domain.vercel.app/api/v2/webhooks/razorpay`

---

## Future Enhancements

1. **Role-Based Access Control**: Different admin roles/permissions
2. **Rate Limiting**: Protect APIs from abuse
3. **Audit Logging**: Track admin actions
4. **Bulk Operations**: Bulk product updates, bulk order fulfillment
5. **Advanced Analytics**: More detailed reporting
6. **Export Functionality**: CSV/Excel exports for orders, customers
7. **Search & Filtering**: Advanced search in admin panels
8. **Real-time Updates**: WebSocket for live order updates
9. **Multi-currency Support**: Support for multiple currencies
10. **Product Variants**: Better variant management

---

## Support & Documentation

- **Main Documentation**: `README.md`
- **Quick Start**: `QUICKSTART.md`
- **Database Schema**: `prisma/schema.prisma`
- **API Documentation**: This document (API Architecture section)

---

**Last Updated**: 2025-01-27
**Version**: 1.0.0

