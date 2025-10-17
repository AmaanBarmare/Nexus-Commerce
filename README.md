# Alyra Admin Panel

Complete Next.js 14 admin panel for Alyra e-commerce with Prisma, Supabase, Razorpay, GA4, and Resend integrations.

## Features

- **Admin Authentication**: Magic link login via Supabase (restricted to `amaanawesome13@gmail.com`)
- **Order Management**: View, fulfill, and track orders
- **Inventory Management**: Adjust product variant stock levels
- **Discount Management**: Create and manage discount codes
- **Newsletter Subscribers**: View and export subscriber list
- **Dashboard Analytics**: Orders and revenue charts with recharts
- **Public APIs**: CORS-enabled APIs for storefront integration
- **Razorpay Integration**: Auto-capture payments with webhook handling
- **GA4 Tracking**: Server-side purchase event tracking
- **Email Notifications**: Order confirmation emails via Resend

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Authentication**: Supabase Auth
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Payments**: Razorpay
- **Analytics**: Google Analytics 4 (Measurement Protocol)
- **Email**: Resend

## Setup Instructions

### 1. Clone and Install

```bash
cd alyra-admin
npm install
```

### 2. Environment Variables

Create a `.env.local` file with the following:

```env
# Database (Supabase Postgres)
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Supabase Authentication
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Admin Access
ADMIN_EMAILS=amaanawesome13@gmail.com

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx

# Google Analytics 4
VITE_GA4_ID=G-PJQ5C8R3JH
GA4_API_SECRET=xxx

# Resend Email
RESEND_API_KEY=re_xxx

# CORS
ALLOWED_ORIGIN=https://www.alyra.in

# App
COOKIE_CART_NAME=alyra_cart
NODE_ENV=development
```

### 3. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Settings > API
3. Enable Email Auth in Authentication > Providers
4. Configure email templates in Authentication > Email Templates
5. Get the Database URL from Settings > Database

### 4. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed sample data
npm run seed
```

The seed script will automatically create the `order_number_seq` sequence.

### 5. Development

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app. You'll be redirected to `/admin/login`.

### 6. Razorpay Webhook Setup

1. Go to Razorpay Dashboard > Settings > Webhooks
2. Add webhook URL: `https://admin-alyra.vercel.app/api/v2/webhooks/razorpay`
3. Select event: `payment.captured`
4. Set the webhook secret in your environment variables

### 7. GA4 Setup

1. Create a GA4 property at [analytics.google.com](https://analytics.google.com)
2. Get your Measurement ID (G-XXXXXXXXXX)
3. Create an API secret: Admin > Data Streams > Choose stream > Measurement Protocol API secrets
4. Add both to your environment variables

### 8. Resend Setup

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain (alyra.in)
3. Create an API key
4. Add to environment variables

## Deployment to Vercel

### 1. Connect Repository

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository

### 2. Configure Environment Variables

Add all environment variables from `.env.example` in Project Settings > Environment Variables.

**Important**: Use test Razorpay keys for Preview deployments and production keys for Production.

### 3. Deploy

Click "Deploy". Vercel will automatically run `prisma generate` during build (configured in `package.json`).

### 4. Post-Deployment Database Setup

After first deployment, connect to your production database and verify the sequence exists:

```sql
-- Check if sequence exists
SELECT EXISTS (
  SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'order_number_seq'
);

-- If not, create it (the seed script should have done this)
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;
```

You can run this via Supabase SQL Editor or by connecting to the database directly.

### 5. Run Migrations

```bash
# Using Vercel CLI (recommended)
vercel env pull .env.production
npm run prisma:deploy
```

Or manually in Supabase SQL Editor.

## API Endpoints

### Public APIs (CORS-enabled for https://www.alyra.in)

#### Products
- `GET /api/v2/products/list` - List active products with variants
- `GET /api/v2/products/by-slug?slug=...` - Get product by slug

#### Cart
- `POST /api/v2/cart/add-item` - Add item to cart
- `PATCH /api/v2/cart/update-item` - Update cart item quantity
- `POST /api/v2/cart/apply-discount` - Apply discount code

#### Orders
- `POST /api/v2/orders/checkout` - Create order and Razorpay payment
- `GET /api/v2/orders/get?id=...` - Get order details

#### Discounts
- `POST /api/v2/discounts/validate` - Validate discount code

#### Subscribers
- `POST /api/v2/subscribers` - Add newsletter subscriber

#### Webhooks
- `POST /api/v2/webhooks/razorpay` - Razorpay payment webhook

### Admin APIs (Requires admin cookie)

- `GET /api/v2/admin/orders/list` - List orders with pagination
- `POST /api/v2/admin/orders/fulfill` - Mark order as fulfilled
- `POST /api/v2/admin/discounts/create` - Create/update discount
- `PATCH /api/v2/admin/products/update` - Update product/variant

## Testing Checklist

- [ ] Admin login with magic link works
- [ ] Only `amaanawesome13@gmail.com` can access admin panel
- [ ] GET `/api/v2/products/list` returns seeded products
- [ ] Create discount in admin panel
- [ ] Apply discount via `/api/v2/cart/apply-discount`
- [ ] Add items to cart (cookie persists)
- [ ] Checkout creates Razorpay order
- [ ] Webhook marks order as paid
- [ ] GA4 purchase event fires (check in GA4 DebugView)
- [ ] Order confirmation email sent
- [ ] Order appears in admin orders list
- [ ] Fulfill order from admin panel
- [ ] Adjust inventory from admin panel
- [ ] CORS allows requests from https://www.alyra.in

## Project Structure

```
alyra-admin/
├── app/
│   ├── admin/              # Admin UI pages
│   │   ├── layout.tsx      # Admin shell with sidebar
│   │   ├── page.tsx        # Dashboard with KPIs and charts
│   │   ├── orders/         # Orders management
│   │   ├── inventory/      # Inventory management
│   │   ├── discounts/      # Discount management
│   │   ├── subscribers/    # Newsletter subscribers
│   │   └── settings/       # Settings and health check
│   ├── api/
│   │   ├── v2/             # Public APIs (CORS-enabled)
│   │   │   ├── products/
│   │   │   ├── cart/
│   │   │   ├── orders/
│   │   │   ├── discounts/
│   │   │   ├── subscribers/
│   │   │   ├── webhooks/
│   │   │   └── admin/      # Admin-only APIs
│   │   └── session/
│   ├── globals.css
│   └── layout.tsx
├── components/
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── db.ts              # Prisma client
│   ├── auth.ts            # Supabase helpers
│   ├── cors.ts            # CORS utilities
│   ├── ga.ts              # GA4 tracking
│   ├── resend.ts          # Email helpers
│   ├── util.ts            # Utilities
│   └── zod-schemas.ts     # Validation schemas
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Seed data
├── middleware.ts          # Admin route protection
├── next.config.js
├── tailwind.config.ts
└── package.json
```

## Support

For questions or issues, contact: amaanawesome13@gmail.com

## License

Private - © 2025 Alyra

