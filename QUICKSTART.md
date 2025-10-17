# Quick Start Guide

## ✅ Project Successfully Created!

Your complete Next.js 14 admin panel for Alyra is ready. All components have been implemented:

- ✅ Admin Authentication (Supabase magic link)
- ✅ Order Management System
- ✅ Inventory Management  
- ✅ Discount Code Management
- ✅ Newsletter Subscriber Management
- ✅ Dashboard with Analytics Charts
- ✅ Public APIs with CORS
- ✅ Razorpay Payment Integration
- ✅ GA4 Server-Side Tracking
- ✅ Resend Email Integration

## 🚀 Next Steps

### 1. Set Up Environment Variables

Create a `.env.local` file (copy from `.env.example`):

```bash
cp .env.example .env.local
```

Then update `.env.local` with your actual credentials:

**Required for local development:**
- `NEXT_PUBLIC_SUPABASE_URL` - Get from Supabase project settings
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Get from Supabase project settings  
- `DATABASE_URL` - Your Supabase Postgres connection string

**Required for full functionality:**
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` - For payments
- `RAZORPAY_WEBHOOK_SECRET` - For webhook verification
- `GA4_API_SECRET` - For analytics tracking
- `RESEND_API_KEY` - For sending emails

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your credentials from Settings → API
3. Enable Email Auth in Authentication → Providers
4. Configure email templates in Authentication → Email Templates
5. Get your DATABASE_URL from Settings → Database → Connection String

### 3. Initialize Database

```bash
# Generate Prisma client
npm run prisma:generate

# Create migration
npm run prisma:migrate

# Seed sample data (creates 3 products and 2 discounts)
npm run seed
```

The seed script will automatically create the `order_number_seq` sequence.

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

You'll be redirected to `/admin/login`. Use the magic link with `amaanawesome13@gmail.com`.

### 5. Test the APIs

**Public APIs (accessible from https://www.alyra.in):**

```bash
# List products
curl http://localhost:3000/api/v2/products/list

# Add to cart
curl -X POST http://localhost:3000/api/v2/cart/add-item \
  -H "Content-Type: application/json" \
  -d '{"variantId":"<variant-id>","qty":1}'

# Checkout
curl -X POST http://localhost:3000/api/v2/orders/checkout \
  -H "Content-Type: application/json" \
  -H "Cookie: alyra_cart=<cart-id>" \
  -d '{"email":"test@example.com","shippingAddress":{...}}'
```

## 📁 Project Structure

```
alyra-admin/
├── app/
│   ├── admin/              # Admin UI (protected by middleware)
│   │   ├── page.tsx        # Dashboard with KPIs + charts
│   │   ├── orders/         # Orders management
│   │   ├── inventory/      # Inventory management
│   │   ├── discounts/      # Discount management
│   │   ├── subscribers/    # Newsletter management
│   │   └── settings/       # Settings & health check
│   └── api/v2/             # API routes
│       ├── products/       # Product listing
│       ├── cart/           # Cart operations
│       ├── orders/         # Checkout + get order
│       ├── subscribers/    # Newsletter signup
│       ├── webhooks/       # Razorpay webhook
│       └── admin/          # Admin-only APIs
├── components/
│   ├── ui/                 # shadcn/ui components
│   └── charts/             # Chart components
├── lib/
│   ├── db.ts              # Prisma client
│   ├── auth.ts            # Supabase helpers
│   ├── cors.ts            # CORS utilities
│   ├── ga.ts              # GA4 tracking
│   ├── resend.ts          # Email helpers
│   └── util.ts            # Utilities
└── prisma/
    ├── schema.prisma      # Database schema
    └── seed.ts            # Sample data
```

## 🔒 Security Notes

1. **Admin Access:** Only `amaanawesome13@gmail.com` can log in (controlled by `ADMIN_EMAILS` env var)
2. **Middleware:** Protects all `/admin/*` routes
3. **CORS:** APIs only accept requests from `https://www.alyra.in`
4. **Webhook:** Razorpay webhook verifies HMAC signatures

## 🚢 Deploy to Vercel

1. Push code to GitHub
2. Import repository in Vercel
3. Add environment variables in Project Settings
4. Deploy
5. Run migrations:
   ```bash
   npx vercel env pull .env.production
   npm run prisma:deploy
   ```

## 📊 Key Features

### Dashboard
- Today's orders and revenue
- Average order value
- Orders chart (last 7 days)
- Revenue chart (last 30 days)

### Order Management
- View all orders
- Order details with items and address
- Fulfill orders with tracking
- Automatic inventory deduction

### Inventory Management
- View all product variants
- Adjust stock levels
- Low stock warnings (<10 items)

### Discount Management
- Create percentage or fixed discounts
- Set minimum order requirements
- Usage limits and expiry dates
- Apply at checkout

### Analytics
- Server-side GA4 purchase events
- Automatic tracking on payment success
- Client ID and user ID support

### Email Notifications
- Order confirmation emails
- Resend integration
- HTML email templates

## 🧪 Testing Checklist

- [ ] Admin login works with magic link
- [ ] Only allowed email can access admin
- [ ] Products API returns seeded data
- [ ] Cart operations work (add/update/apply discount)
- [ ] Checkout creates Razorpay order
- [ ] Webhook processes payment
- [ ] Order appears in admin panel
- [ ] Fulfill order updates status
- [ ] Inventory adjustments work
- [ ] Create discount codes
- [ ] GA4 events fire (check DebugView)
- [ ] Emails send via Resend

## 📚 Documentation

See `README.md` for complete documentation including:
- Full API reference
- Deployment instructions
- Troubleshooting guide
- Environment variable reference

## 🆘 Support

For questions or issues:
- Email: amaanawesome13@gmail.com
- Check the comprehensive README.md

---

**Built with:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Prisma, Supabase, Razorpay, GA4, Resend

