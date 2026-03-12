# NexusCommerce

### AI-Native E-Commerce Admin Platform

[Next.js](https://nextjs.org/)
[React](https://react.dev/)
[TypeScript](https://www.typescriptlang.org/)
[Prisma](https://www.prisma.io/)
[PostgreSQL](https://supabase.com/)
[OpenAI](https://platform.openai.com/)
[Tailwind](https://tailwindcss.com/)
[License](#license)

**A production-grade, full-stack e-commerce admin with agentic AI workflows — built to demonstrate modern system design and AI engineering.**

[Demo](#) · [Architecture](#-system-architecture) · [Getting Started](#-getting-started) · [Contact](#-contact--portfolio)



---

## 👀 For Hiring Managers & Recruiters

**TL;DR:** NexusCommerce is a complete e-commerce backend and admin platform with an AI-powered marketing layer. It demonstrates full-stack development, distributed systems patterns, and production-ready AI integration.


| What I Showcase                  | Where to Look                                                         |
| -------------------------------- | --------------------------------------------------------------------- |
| **Full-stack architecture**      | Next.js 15 App Router, Prisma ORM, PostgreSQL (Supabase)              |
| **Agentic AI / LLM engineering** | `/lib/ai` — structured outputs, RAG, tool-calling patterns            |
| **Distributed systems thinking** | Webhooks with HMAC verification, idempotency, transactional integrity |
| **Domain-driven API design**     | `/app/api/v2/`* — versioned, CORS-aware, schema-validated             |
| **Workflow orchestration**       | React Flow canvas + AI-generated marketing automation graphs          |
| **Safe SQL generation**          | Constrained schema, read-only execution, Zod validation               |
| **Production-ready ops**         | Auth (Supabase), migrations, seeds, environment isolation             |


**Best files to review:**

- `app/admin/marketing/assistant/flows/page.tsx` — AI-assisted visual flow builder (1,200+ lines)
- `lib/ai/generateSql.ts` — NL → SQL with allowed-table whitelist and schema validation
- `lib/flows/runtime.ts` — Marketing automation execution engine
- `app/api/v2/webhooks/razorpay/route.ts` — Idempotent webhook handling with signature verification
- `lib/ai/embeddings.ts` — RAG pipeline with pgvector
- `emails/` + `lib/emails/compileMjml.ts` — MJML → HTML email design system

---

## 🌟 Overview

NexusCommerce is an **end-to-end e-commerce admin platform** that combines:

1. **Traditional commerce operations** — Orders, inventory, discounts, customers, payments
2. **AI-powered marketing tools** — Natural language → SQL analytics, email generation, automation flows
3. **Production-grade infrastructure** — Auth, webhooks, idempotency, CORS, migrations

It serves as both a functional admin for a real storefront and a showcase for **agentic AI patterns** (tool-calling, RAG, schema validation, human-in-the-loop).

---

## ✨ Key Features

### Commerce Admin


| Feature                 | Description                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------- |
| **Order Management**    | Full lifecycle — create, fulfill, update payment/delivery status, notes, CSV import |
| **Product & Inventory** | CRUD, variant-level inventory, low-stock awareness                                  |
| **Discount Engine**     | Product/order-scoped, usage limits, date ranges, min subtotal                       |
| **Customer Management** | Profiles, addresses, marketing preferences, order history                           |
| **Subscribers**         | Newsletter signup with deduplication                                                |
| **Analytics Dashboard** | Revenue, orders, AOV, bar/line charts (Recharts)                                    |


### AI-Powered Marketing Assistant


| Capability                 | How It Works                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Natural language → SQL** | User asks "revenue by day last 7 days" → constrained SQL over allowed tables only → safe execution                  |
| **Natural language → GA4** | "Top 5 countries by sessions" → rule-based NL planner → GA4 Reporting API                                           |
| **Email generation**       | RAG-grounding on product/brand docs → MJML templates → variable injection                                           |
| **Flow builder**           | Chat: "abandoned cart flow with 2h wait and 10% discount" → AI proposes flow graph → validation → React Flow canvas |
| **Schema validation**      | All AI outputs validated with Zod before execution; failures fed back for self-correction                           |


### Integrations

- **Razorpay** — Checkout, webhooks, HMAC verification, idempotent processing
- **Google Analytics 4** — Server-side purchase events, Reporting API for NL queries
- **Resend** — Transactional and marketing emails
- **Supabase** — PostgreSQL database + authentication (email/password, magic link)
- **pgvector** — Vector embeddings for RAG (brand docs, product context)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Client (Browser)                                   │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌──────────────────┐ │
│  │  Admin Dashboard    │    │  Flow Builder       │    │  AI Assistant    │ │
│  │  (Orders, Products, │    │  (React Flow)       │    │  (Chat + Tools)  │ │
│  │   Discounts, etc.)  │    │                     │    │                  │ │
│  └──────────┬──────────┘    └──────────┬──────────┘    └────────┬─────────┘ │
└─────────────┼──────────────────────────┼────────────────────────┼───────────┘
              │                          │                        │
              ▼                          ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Next.js 15 (App Router)                                 │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Middleware — Auth check, admin allowlist (Supabase)                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  API Routes (/api/v2/*)                                              │   │
│  │  • products, cart, orders, discounts, subscribers (public)            │   │
│  │  • admin/* (protected)                                               │   │
│  │  • webhooks/razorpay                                                 │   │
│  │  • ai/assistant, flows/generate, flows/[id]/validate                  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  AI Layer                                                            │   │
│  │  • OpenAI (function-calling, embeddings)                             │   │
│  │  • RAG: embed query → vector search (pgvector) → inject context      │   │
│  │  • Schema validation (Zod) + self-correction loops                   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Supabase     │    │  Razorpay        │    │  GA4 / Resend    │
│  Postgres +   │    │  Payments +      │    │  Analytics +     │
│  Auth         │    │  Webhooks        │    │  Email           │
└───────────────┘    └──────────────────┘    └──────────────────┘
```

### Design Patterns


| Pattern                     | Implementation                                                                |
| --------------------------- | ----------------------------------------------------------------------------- |
| **Idempotency**             | `ProcessedEvent` table for webhook event IDs; 204 on duplicate                |
| **CQRS-lite**               | Separate read paths (analytics, reports) from write paths (orders, inventory) |
| **Schema-first validation** | Zod schemas on all API inputs and AI outputs                                  |
| **Edge protection**         | Auth + allowlist in middleware before hitting app logic                       |
| **Safe SQL**                | Whitelist of allowed tables/columns; read-only execution; no `DROP`/`DELETE`  |


---

## 🧠 AI Layer Deep Dive

### 1. Retrieval-Augmented Generation (RAG)

Before generating emails or content:

- User query is embedded via `text-embedding-3-small`
- Vector search over `BrandDocument` (pgvector) for brand tone, product info
- Relevant context injected into system prompt
- **Result:** Emails reference actual products, prices, and brand voice — not hallucinations

### 2. Safe SQL Generation

- **Input:** Natural language (e.g., "revenue by day last 7 days")
- **Output:** Parameterized SQL + visualization hint (table, timeseries, bar)
- **Guardrails:**
  - Only allowed tables: `Order`, `OrderItem`, `AlyraProduct`, `Customer`
  - Canonical column mapping; invalid columns rejected
  - Read-only execution via Prisma `$queryRawUnsafe` (no mutations)
- **Validation:** `SqlPlanSchema` (Zod) — on failure, error returned to caller (or LLM for retry)

### 3. Flow Generation & Validation

- **Input:** Natural language prompt (e.g., "order confirmation + winback after 30 days")
- **Output:** Flow manifest (nodes + edges) with trigger, condition, delay, send_email nodes
- **Rules:** Marketing emails require `marketingSubscribed` condition; transactional emails follow strict MJML layout
- **Validation:** `/api/flows/[id]/validate` checks structure before activation

### 4. Dual Analytics Sources

- **Store DB:** NL → SQL (revenue, orders, products)
- **GA4:** NL → rule-based planner → GA4 Reporting API (sessions, traffic, countries)
- Intent routing: GA4 for "traffic", "sessions", "countries"; otherwise SQL

---

## 🛠️ Tech Stack


| Layer         | Technologies                                                        |
| ------------- | ------------------------------------------------------------------- |
| **Framework** | Next.js 15.5 (App Router), React 19                                 |
| **Language**  | TypeScript 5.7                                                      |
| **Database**  | PostgreSQL (Supabase), Prisma 6.17                                  |
| **Auth**      | Supabase Auth (email/password, magic link), `admin_allowlist` table |
| **UI**        | Tailwind CSS, shadcn/ui (Radix), Lucide icons, Recharts             |
| **AI**        | OpenAI (GPT-4o-mini, text-embedding-3-small), zod-to-json-schema    |
| **Email**     | MJML → HTML (GrapeJS, `@react-email`), Resend                       |
| **Payments**  | Razorpay (checkout, webhooks)                                       |
| **Analytics** | GA4 Measurement Protocol, GA4 Reporting API                         |
| **Workflows** | React Flow (@xyflow/react), custom runtime engine                   |


---

## 📁 Project Structure

```
nexus-commerce/
├── app/
│   ├── admin/                    # Protected admin pages
│   │   ├── overview/             # Dashboard (KPIs, charts)
│   │   ├── orders/               # Order list + detail
│   │   ├── product/              # Product management
│   │   ├── inventory/            # Inventory view
│   │   ├── discounts/            # Discount CRUD
│   │   ├── customers/            # Customer management
│   │   ├── subscribers/          # Newsletter subscribers
│   │   ├── analytics/            # Reports, charts
│   │   ├── marketing/            # Marketing assistant
│   │   │   └── assistant/
│   │   │       ├── flows/        # Flow builder (React Flow)
│   │   │       └── metrics/      # AI metrics queries
│   │   ├── flows/                # Flow list
│   │   └── settings/             # Settings
│   └── api/
│       ├── v2/                   # Versioned REST API
│       │   ├── products/         # Public product APIs
│       │   ├── cart/             # Cart (cookie-based)
│       │   ├── orders/           # Checkout, get order
│       │   ├── discounts/        # Validate discount
│       │   ├── subscribers/      # Newsletter signup
│       │   ├── webhooks/razorpay # Payment webhook
│       │   └── admin/            # Admin CRUD APIs
│       ├── ai/assistant/         # AI marketing assistant
│       ├── flows/                # Flow CRUD, generate, validate, activate
│       └── templates/            # Email templates
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── charts/                   # Order/revenue charts
│   └── analytics/                # Chart cards, reports
├── lib/
│   ├── ai/                       # OpenAI client, embeddings, generateSql, generateEmail
│   ├── db/                       # runSql (read-only), Prisma client
│   ├── flows/                    # Runtime, validation
│   ├── ga4/                      # NL planner, GA4 client
│   ├── emails/                   # MJML compilation
│   ├── auth.ts                   # Supabase server client
│   ├── cors.ts                   # CORS headers
│   ├── ga.ts                     # GA4 purchase events
│   ├── resend.ts                 # Email sending
│   ├── order-counter.ts          # Monotonic order numbers
│   └── schemas/                  # Zod schemas
├── prisma/
│   ├── schema.prisma             # Full schema (20+ models)
│   ├── seed.ts                   # Seed script
│   └── migrations/               # Migration history
├── emails/                       # MJML + React Email templates
├── types/                        # Flow types, etc.
└── middleware.ts                 # Auth + admin allowlist
```

---

## ⚡ Getting Started

### Prerequisites

- **Node.js** 18+
- **PostgreSQL** (Supabase recommended)
- **API keys:** OpenAI, Resend, Razorpay (test mode), GA4 (optional)

### 1. Clone & Install

```bash
git clone https://github.com/your-username/nexus-commerce.git
cd nexus-commerce
npm install
```

### 2. Environment Variables

Create `.env.local` from `.env.example` and configure:

```env
# Database (Supabase)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# Add your email to admin_allowlist table in Supabase

# AI
OPENAI_API_KEY=sk-...
OPENAI_GENERATION_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Payments
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Email
RESEND_API_KEY=re_...

# Analytics (optional)
VITE_GA4_ID=G-...
GA4_API_SECRET=...

# CORS
ALLOWED_ORIGIN=https://your-storefront.com
```

### 3. Database Setup

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000/admin](http://localhost:3000/admin) — you'll be redirected to login. Use Supabase magic link or email/password for an account in `admin_allowlist`.

### 5. Razorpay Webhook (Payments)

- **URL:** `POST https://your-domain.com/api/v2/webhooks/razorpay`
- **Event:** `payment.captured`
- **Verification:** HMAC SHA256 with `RAZORPAY_WEBHOOK_SECRET`

---

## 🧪 Try It Yourself


| Task                                               | Where                             |
| -------------------------------------------------- | --------------------------------- |
| Ask "revenue by day last 7 days"                   | Marketing Assistant → Metrics     |
| Generate "product launch email for Summer Set"     | Marketing Assistant → Email       |
| Build "abandoned cart flow, 2h wait, 10% discount" | Marketing Assistant → Flows       |
| Create order → apply discount → checkout           | Orders, Discounts, Cart API       |
| Import orders from CSV                             | Admin → Orders → Import           |
| View GA4 traffic by country                        | Ask "top 5 countries by sessions" |


---

## 📡 API Overview

### Public (CORS-enabled)


| Method | Endpoint                         | Description             |
| ------ | -------------------------------- | ----------------------- |
| GET    | `/api/v2/products/list`          | List active products    |
| GET    | `/api/v2/products/by-slug?slug=` | Product by slug         |
| POST   | `/api/v2/cart/add-item`          | Add to cart             |
| PATCH  | `/api/v2/cart/update-item`       | Update quantity         |
| POST   | `/api/v2/cart/apply-discount`    | Apply discount code     |
| POST   | `/api/v2/orders/checkout`        | Create order + Razorpay |
| GET    | `/api/v2/orders/get?id=`         | Get order details       |
| POST   | `/api/v2/discounts/validate`     | Validate discount       |
| POST   | `/api/v2/subscribers`            | Newsletter signup       |


### Admin (Protected)

Orders, products, discounts, customers — full CRUD. See `ARCHITECTURE.md` for details.

### Webhooks


| Endpoint                         | Service  | Verification |
| -------------------------------- | -------- | ------------ |
| POST `/api/v2/webhooks/razorpay` | Razorpay | HMAC SHA256  |


---

## 🔒 Security & Reliability

- **Auth:** Supabase session + `admin_allowlist` table (only allowlisted emails access `/admin`)
- **CORS:** Scoped to `ALLOWED_ORIGIN`
- **Webhooks:** Signature verification, idempotency via `ProcessedEvent`
- **Input validation:** Zod on all API requests
- **SQL injection:** Prisma ORM + read-only SQL with whitelisted tables
- **PII:** Customer IDs/emails redacted from AI metric responses when possible

---

## 📦 Scripts

```bash
npm run dev               # Start dev server
npm run build             # Prisma generate + Next build
npm run start             # Production server
npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate    # Dev migrations
npm run prisma:deploy     # Prod migrations
npm run seed              # Seed database
npm run lint              # ESLint
```

---

## 🧩 Engineering Takeaways

Building NexusCommerce deepened my experience in:

- **Agentic AI systems** — Tool-calling, structured outputs, validation loops, RAG
- **Workflow orchestration** — Designing a flow runtime from triggers → conditions → delays → actions
- **Safe AI outputs** — Constrained SQL, schema validation, human-in-the-loop for risky actions
- **Distributed systems** — Webhooks, idempotency, transactional consistency
- **Domain-driven APIs** — Versioning, clear boundaries, CORS for cross-origin storefronts
- **Full-stack deployment** — Environment config, migrations, seeds, Vercel-ready

---

## 🗺️ Roadmap

- Role-based access control (RBAC)
- Rate limiting & audit logging
- Advanced exports (CSV/Excel) and scheduled reports
- Multi-channel flow actions (SMS, push)
- Real-time order updates (WebSockets)

---

## 📚 Documentation


| Document          | Description                                     |
| ----------------- | ----------------------------------------------- |
| `README.md`       | This file                                       |
| `ARCHITECTURE.md` | Detailed architecture, API reference, data flow |
| `QUICKSTART.md`   | Quick setup and testing checklist               |


---

## 📬 Contact & Portfolio

I built NexusCommerce to demonstrate full-stack and AI engineering skills. If you're a recruiter, hiring manager, or engineer interested in the system:

- **Email:** [your-email@example.com](mailto:your-email@example.com)
- **LinkedIn:** [your-linkedin](https://linkedin.com/in/your-profile)
- **Portfolio:** [your-portfolio](https://your-portfolio.com)

---

## 📄 License

This repository is private and not licensed for commercial use. Code may be viewed for evaluation purposes only.

© 2026
