# NexusCommerce

### AI‑Native E‑Commerce Admin Platform

![Next.js](https://img.shields.io/badge/Next.js-15.5-000000?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6.17-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?logo=supabase&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-gpt--4o--mini-412991?logo=openai&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-Private-lightgrey)

**A full‑stack e‑commerce admin with an agentic AI marketing layer — natural‑language analytics, brand‑grounded email generation, and a visual marketing‑automation flow builder.**

[Project Status](#-project-status--known-limitations) · [Architecture](#-system-architecture) · [Getting Started](#-getting-started) · [API](#-api-reference) · [Contact](#-contact)

---

## 📑 Table of Contents

1. [Project Status & Known Limitations](#-project-status--known-limitations)
2. [For Hiring Managers & Recruiters](#-for-hiring-managers--recruiters)
3. [Overview](#-overview)
4. [Key Features](#-key-features)
5. [System Architecture](#-system-architecture)
6. [AI Layer Deep Dive](#-ai-layer-deep-dive)
7. [Tech Stack](#-tech-stack)
8. [Data Model](#-data-model)
9. [Project Structure](#-project-structure)
10. [Getting Started](#-getting-started)
11. [Environment Variables](#-environment-variables)
12. [API Reference](#-api-reference)
13. [Security & Reliability](#-security--reliability)
14. [Scripts](#-scripts)
15. [Roadmap](#-roadmap)
16. [Documentation](#-documentation)
17. [Contact](#-contact)
18. [License](#-license)

---

## 🚦 Project Status & Known Limitations

> **Read this first.** NexusCommerce is an active work‑in‑progress portfolio project. The commerce admin and the natural‑language metrics assistant are functional, but parts of the marketing/email layer are **not fully wired up yet**. The list below is intentionally honest so nothing surprises you when you run it.

| Area | Status | Notes |
| ---- | ------ | ----- |
| Commerce admin (orders, products, inventory, discounts, customers, subscribers) | ✅ Working | Full CRUD, CSV import, charts |
| Checkout + Razorpay order creation | ✅ Working | Transactional, monotonic order numbers |
| Razorpay webhook (`payment.captured`) | ✅ Working | HMAC verification + idempotency |
| **Metrics assistant** (NL → SQL / NL → GA4) | ✅ Working | Safe SQL guardrails + GA4 Reporting API |
| **Marketing flow builder** (chat → flow graph on React Flow canvas) | ⚠️ Partial | The flow **graph** is generated and rendered, but see email items below |
| **AI email‑generation chatbot** (the second assistant — "create emails in the brand's design" via RAG) | ❌ **Not working right now** | The brand‑design email assistant is currently non‑functional. The endpoint and RAG pipeline exist, but end‑to‑end email generation in the brand's design is broken / under repair. |
| **Marketing flow email delivery** (the email flow that actually *sends*) | ❌ **Not working right now** | The flow runtime evaluates triggers/conditions and renders templates, but actual sending is a **placeholder** — it logs/queues instead of dispatching via the email provider. No marketing emails are delivered yet. |
| `create_flow` intent on `/api/ai/assistant` | 🚫 Deprecated | Returns `501`; flow creation moved to `/api/flows/generate` |
| GA4 purchase events (Measurement Protocol) | ⚠️ Unconfigured | Helper exists (`lib/ga.ts`) but Measurement‑Protocol credentials are not provisioned via env; GA4 **reporting** uses a separate service account and works |

**In one sentence:** you can run the store, manage orders, and ask the assistant for analytics today — but the **brand‑design email chatbot is broken** and the **marketing flow does not actually send emails yet** (it stops at rendering/queuing). Both are tracked on the [roadmap](#-roadmap).

---

## 👀 For Hiring Managers & Recruiters

**TL;DR:** NexusCommerce is a complete e‑commerce backend and admin platform with an AI‑powered marketing layer. It demonstrates full‑stack development, distributed‑systems patterns, and production‑oriented AI integration (with a couple of in‑progress areas called out above).

| What I Showcase                  | Where to Look                                                          |
| -------------------------------- | --------------------------------------------------------------------- |
| **Full‑stack architecture**      | Next.js 15 App Router, Prisma ORM, PostgreSQL (Supabase)              |
| **Agentic AI / LLM engineering** | `lib/ai/` — structured outputs, RAG, schema‑validated generation       |
| **Distributed‑systems thinking** | Webhooks with HMAC verification, idempotency, transactional integrity |
| **Domain‑driven API design**     | `app/api/v2/*` — versioned, CORS‑aware, schema‑validated              |
| **Workflow orchestration**       | React Flow canvas + AI‑generated marketing automation graphs          |
| **Safe SQL generation**          | Constrained schema, SELECT‑only execution, Zod validation             |
| **Production‑oriented ops**      | Auth (Supabase allowlist), migrations, seeds, environment isolation   |

**Best files to review:**

- [`app/admin/marketing/assistant/flows/page.tsx`](app/admin/marketing/assistant/flows/page.tsx) — AI‑assisted visual flow builder (~1,250 lines)
- [`lib/ai/generateSql.ts`](lib/ai/generateSql.ts) — NL → SQL with allowed‑table/column whitelist, SELECT‑only enforcement, enum casting
- [`app/api/flows/generate/route.ts`](app/api/flows/generate/route.ts) — NL → flow manifest + email templates (~720 lines)
- [`lib/flows/runtime.ts`](lib/flows/runtime.ts) — Flow execution engine (consent gating, suppression) — *send step is a placeholder, see limitations*
- [`app/api/v2/webhooks/razorpay/route.ts`](app/api/v2/webhooks/razorpay/route.ts) — Idempotent webhook handling with signature verification
- [`lib/ai/embeddings.ts`](lib/ai/embeddings.ts) — RAG pipeline with pgvector (cosine similarity)
- [`emails/design-system-v1.tsx`](emails/design-system-v1.tsx) + [`lib/emails/compileMjml.ts`](lib/emails/compileMjml.ts) — MJML → HTML email design system

---

## 🌟 Overview

NexusCommerce is an **end‑to‑end e‑commerce admin platform** built around a sample luxury‑fragrance brand (**"Alyra"**). It combines:

1. **Traditional commerce operations** — Orders, inventory, discounts, customers, subscribers, payments
2. **AI‑powered marketing tools** — Natural‑language → SQL analytics, natural‑language → GA4 reporting, brand‑grounded email generation, and visual automation flows
3. **Production‑oriented infrastructure** — Auth, webhooks, idempotency, CORS, migrations, seeds

It serves as both a functional admin for a storefront and a showcase for **agentic AI patterns** (structured outputs, RAG, schema validation, human‑in‑the‑loop). Some of the marketing/email pieces are still in progress — see [Project Status](#-project-status--known-limitations).

---

## ✨ Key Features

### Commerce Admin

| Feature                 | Description                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Order Management**    | Full lifecycle — create, fulfill, update payment/fulfillment/delivery status, notes, CSV import |
| **Product & Inventory** | CRUD, product type (`Refill` / `Set`), inventory tracking, active/inactive status         |
| **Discount Engine**     | Product‑ or order‑scoped, percent/fixed, usage limits, per‑customer cap, date ranges, min subtotal |
| **Customer Management**  | Profiles, addresses, marketing consent, bounce/complaint flags, order history            |
| **Subscribers**         | Newsletter signup with deduplication and source tracking                                  |
| **Analytics Dashboard** | Revenue, orders, AOV, bar/line charts (Recharts); saved reports, chart conversion, CSV export |

### AI Marketing Assistant

| Capability                 | How It Works                                                                                                        | Status |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------ |
| **Natural language → SQL** | "revenue by day last 7 days" → constrained SELECT over a whitelist of tables/columns → safe read‑only execution     | ✅ |
| **Natural language → GA4** | "top 5 countries by sessions" → rule‑based NL planner → GA4 Reporting API (service‑account auth)                     | ✅ |
| **Flow graph generation**  | "abandoned cart flow with 2h wait and 10% discount" → AI proposes flow manifest (nodes + edges) → React Flow canvas  | ⚠️ Graph only |
| **Brand‑grounded email generation** | RAG over brand documents (pgvector) → MJML template manifest → visual editor                                | ❌ Not working |
| **Flow email delivery**    | Runtime gates on consent/suppression, renders templates with Mustache, then dispatches                              | ❌ Send is a stub |
| **Schema validation**      | All AI outputs validated with Zod (via `zod-to-json-schema` structured outputs) before use; retries on invalid JSON | ✅ |

### Integrations

- **Razorpay** — Order creation (REST), checkout, webhooks, HMAC SHA256 verification, idempotent processing
- **Google Analytics 4** — Reporting API via service‑account JWT (RS256) for NL queries; Measurement Protocol helper for purchase events (*not yet provisioned*)
- **Resend** — Transactional/marketing email provider (wired for sending; *flow runtime does not yet call it*)
- **Supabase** — PostgreSQL database + authentication (email/password, magic link) + `admin_allowlist` gating
- **pgvector** — Vector embeddings for RAG (brand documents)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client (Browser)                                │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌──────────────────┐  │
│  │  Admin Dashboard    │    │  Flow Builder       │    │  Metrics         │  │
│  │  (Orders, Products, │    │  (React Flow +      │    │  Assistant       │  │
│  │   Discounts, etc.)  │    │   chat panel)       │    │  (NL → SQL/GA4)  │  │
│  └──────────┬──────────┘    └──────────┬──────────┘    └────────┬─────────┘  │
└─────────────┼──────────────────────────┼────────────────────────┼───────────┘
              │                          │                        │
              ▼                          ▼                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Next.js 15 (App Router)                              │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  middleware.ts — Supabase session + admin_allowlist gate on /admin/*  │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  API Routes                                                           │    │
│  │  • /api/v2/*        products, cart, orders, discounts, subscribers     │    │
│  │  • /api/v2/admin/*  protected CRUD (orders, products, discounts, …)    │    │
│  │  • /api/v2/webhooks/razorpay                                          │    │
│  │  • /api/ai/assistant            (email gen / metrics)                  │    │
│  │  • /api/flows/* generate|validate|activate                            │    │
│  │  • /api/templates/[id]          email templates                       │    │
│  │  • /api/admin/analytics/*       reports, charts, ga4/report           │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │  AI Layer (lib/ai, lib/ga4, lib/flows, lib/db)                        │    │
│  │  • OpenAI structured outputs (JSON Schema via zod-to-json-schema)      │    │
│  │  • RAG: embed query → pgvector cosine search → inject brand context    │    │
│  │  • Safe SQL: SELECT-only, table/column whitelist, enum casts, LIMIT    │    │
│  │  • Zod validation + self-correction retries                           │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Supabase     │    │  Razorpay        │    │  GA4 / Resend    │
│  Postgres +   │    │  Payments +      │    │  Analytics +     │
│  pgvector +   │    │  Webhooks        │    │  Email           │
│  Auth         │    │                  │    │                  │
└───────────────┘    └──────────────────┘    └──────────────────┘
```

### Design Patterns

| Pattern                     | Implementation                                                                  |
| --------------------------- | ------------------------------------------------------------------------------- |
| **Idempotency**             | `ProcessedEvent` table for webhook event IDs; duplicate events short‑circuit     |
| **Transactional integrity** | `prisma.$transaction` for checkout (order + items + monotonic order number)      |
| **Monotonic counters**      | `order_counter` singleton row via `lib/order-counter.ts`                         |
| **CQRS‑lite**               | Separate read paths (analytics, reports) from write paths (orders, inventory)    |
| **Schema‑first validation** | Zod schemas on API inputs and on every AI output                                 |
| **Edge protection**         | Auth + allowlist in `middleware.ts` before app logic                             |
| **Safe SQL**                | Whitelisted tables/columns; SELECT‑only; banned keywords; auto `LIMIT 500`       |

---

## 🧠 AI Layer Deep Dive

### 1. Retrieval‑Augmented Generation (RAG) — `lib/ai/embeddings.ts`

- Query embedded via `text-embedding-3-small` (1536 dims; dimension asserted at runtime)
- Vector search over `BrandDocument` using pgvector **cosine distance** (`<=>`), `threshold 0.7`, top‑N per category
- Categories seeded by `scripts/seedBrandDocs.ts`: `brand_voice`, `brand_story`, `philosophy`, `ritual`, `product`
- Retrieved context is injected into the email‑generation system prompt
- **Note:** the RAG pipeline is implemented, but the end‑to‑end **email‑generation chatbot is currently not working** (see [limitations](#-project-status--known-limitations))

### 2. Safe SQL Generation — `lib/ai/generateSql.ts` + `lib/db/runSql.ts`

- **Input:** Natural language (e.g., "revenue by day last 7 days")
- **Output:** `SqlPlanSchema` — `{ metric, sql, params[], visualization, usedTables[], usedColumns[] }`
- **Guardrails:**
  - SELECT‑only; no semicolons, no CTEs, no `INSERT/UPDATE/DELETE/DROP/ALTER/CREATE/TRUNCATE/GRANT/REVOKE/EXECUTE/VACUUM`
  - Allowed tables only: `Order`, `OrderItem`, `AlyraProduct`, `Customer` (with alias resolution)
  - Allowed‑column whitelist with canonical identifier normalization
  - Enum literals auto‑cast (e.g. `'paid'::"PaymentStatus"`)
  - Auto‑appends `LIMIT 500` unless it is an explicit COUNT‑only metric
  - Executed read‑only via `prisma.$queryRawUnsafe(sql, ...params)` with parameterized values
- **PII guard:** `customer_id`‑style columns are stripped from assistant results before returning

### 3. Dual Analytics Sources — `app/api/ai/assistant/route.ts`

- **Store DB:** NL → SQL (revenue, orders, products, customers)
- **GA4:** NL → rule‑based planner (`lib/ga4/nlToGa4.ts`) → GA4 Reporting API (`lib/ga4/client.ts`)
- **Intent routing:** keywords like `sessions`, `traffic`, `country`, `source/medium`, `pageviews`, `ga4` route to GA4; everything else defaults to SQL
- GA4 auth uses a **service account**: a signed JWT (RS256) is exchanged for a short‑lived access token, cached in‑process

### 4. Flow Generation & Validation — `app/api/flows/generate/route.ts`, `lib/flows/validate.ts`, `lib/flows/runtime.ts`

- **Input:** Natural language (e.g., "order confirmation + winback after 30 days")
- **Output:** Flow manifest (`nodes[]` + `edges[]`) with `trigger`, `condition`, `delay`, `action(send_email)` node types, plus MJML email templates
- **Rules:** Marketing emails require a `marketingSubscribed` consent condition (auto‑inserted); transactional emails follow a fixed MJML layout (Alyra logo top/bottom)
- **Validation:** `/api/flows/[id]/validate` checks structure before activation
- **Runtime:** `evaluateFlow` suppresses sends for `bounced`/`complained` customers, gates marketing emails on consent, and renders templates with **Mustache** — but the actual dispatch is a **placeholder/queue stub today** (no email is sent)

---

## 🛠️ Tech Stack

| Layer         | Technologies                                                                 |
| ------------- | ---------------------------------------------------------------------------- |
| **Framework** | Next.js 15.5 (App Router), React 19                                           |
| **Language**  | TypeScript 5.7                                                               |
| **Database**  | PostgreSQL (Supabase) + pgvector, Prisma 6.17                                 |
| **Auth**      | Supabase Auth (email/password, magic link) + `admin_allowlist` table          |
| **UI**        | Tailwind CSS 3.4, shadcn/ui (Radix), lucide‑react, Recharts, cmdk             |
| **AI**        | OpenAI SDK 6 (`gpt-4o-mini`, `text-embedding-3-small`), `zod-to-json-schema`  |
| **Email**     | MJML, GrapeJS + `grapesjs-mjml` (visual editor), `@react-email/*`, Mustache, Resend |
| **Payments**  | Razorpay (Orders REST API, webhooks)                                          |
| **Analytics** | GA4 Reporting API (service‑account JWT), GA4 Measurement Protocol (helper)    |
| **Workflows** | React Flow (`@xyflow/react`), custom flow runtime                            |
| **Data/CSV**  | PapaParse (order CSV import)                                                  |
| **Validation**| Zod 3                                                                        |

---

## 🗃️ Data Model

Prisma schema ([`prisma/schema.prisma`](prisma/schema.prisma)) — **20 models** + 9 enums:

**Commerce:** `AlyraProduct`, `Customer`, `Address`, `Discount`, `DiscountProduct`, `Order`, `OrderItem`, `Cart`, `CartItem`, `Subscriber`

**Ops / infra:** `ProcessedEvent` (webhook idempotency), `OrderCounter` (monotonic order numbers)

**Marketing / AI:** `Flow`, `FlowNode`, `FlowEdge`, `EmailTemplate`, `BrandDocument` (pgvector `vector(1536)`)

**Analytics:** `AnalyticsReport`, `AnalyticsReportDownload`, `AnalyticsChart`

**Enums:** `OrderStatus`, `PaymentStatus`, `FulfillmentStatus`, `DeliveryStatus`, `DiscountType`, `DiscountScope`, `AlyraProductType` (`Refill`/`Set`), `AlyraProductStatus`, `FlowStatus`

> Monetary values are stored as integer **minor units** (e.g. `totalMinor`, `priceMinor`) — divide by 100 for display.

---

## 📁 Project Structure

```
nexus-commerce/
├── app/
│   ├── page.tsx                  # Public landing page
│   ├── layout.tsx
│   ├── admin/                    # Protected admin pages (gated by middleware)
│   │   ├── overview/             # Dashboard (KPIs, charts)
│   │   ├── orders/[id]/          # Order list + detail
│   │   ├── product/              # Product management
│   │   ├── inventory/            # Inventory view
│   │   ├── discounts/            # Discount CRUD
│   │   ├── customers/[id]/       # Customer management
│   │   ├── subscribers/          # Newsletter subscribers
│   │   ├── analytics/            # Reports, charts (AnalyticsClient)
│   │   ├── flows/                # Flow list
│   │   ├── marketing/
│   │   │   └── assistant/
│   │   │       ├── flows/        # Flow builder (React Flow) + EmailEditor + chat panel
│   │   │       └── metrics/      # NL metrics assistant
│   │   └── settings/
│   └── api/
│       ├── v2/                   # Versioned REST API (storefront-facing + admin CRUD)
│       │   ├── products/         # list, by-slug
│       │   ├── cart/             # add-item, update-item, apply-discount
│       │   ├── orders/           # checkout, get
│       │   ├── discounts/        # validate
│       │   ├── subscribers/      # newsletter signup
│       │   ├── webhooks/razorpay # payment webhook
│       │   └── admin/            # customers, discounts, orders (+ import-csv), products
│       ├── ai/assistant/         # AI marketing assistant (email gen / metrics)
│       ├── flows/                # generate, [id], [id]/validate, [id]/activate
│       ├── templates/[id]/       # email template CRUD
│       ├── admin/analytics/      # reports, charts, ga4/report
│       ├── admin/alyra-products/ # product API
│       ├── auth/signout/
│       └── session/establish/
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── charts/                   # orders-bar-chart, revenue-line-chart
│   ├── analytics/                # ChartCard
│   └── landing/                  # HeroVisuals
├── lib/
│   ├── ai/                       # client, embeddings, generateSql, generateEmail, json
│   ├── db/                       # runSql (read-only) ; lib/db.ts = Prisma client
│   ├── flows/                    # runtime, validate
│   ├── ga4/                      # client (service-account JWT), nlToGa4, schema
│   ├── analytics/                # charting, types
│   ├── emails/                   # compileMjml
│   ├── schemas/                  # marketing (template manifest)
│   ├── auth.ts                   # Supabase server client
│   ├── cors.ts                   # CORS headers
│   ├── ga.ts                     # GA4 Measurement Protocol purchase events
│   ├── resend.ts                 # Email sending
│   ├── order-counter.ts          # Monotonic order numbers
│   └── zod-schemas.ts
├── prisma/
│   ├── schema.prisma             # 20 models + 9 enums
│   ├── seed.ts                   # Seed script
│   └── migrations/               # 18 migrations
├── emails/design-system-v1.tsx   # React Email design system
├── scripts/seedBrandDocs.ts      # Seed BrandDocument embeddings for RAG
├── types/flow.ts                 # Flow manifest types
├── public/brand/                 # Brand assets (logo)
└── middleware.ts                 # Auth + admin allowlist
```

---

## ⚡ Getting Started

### Prerequisites

- **Node.js** 18.18+ (20 LTS recommended)
- **PostgreSQL** with the **pgvector** extension (Supabase recommended)
- **API keys:** OpenAI, Razorpay (test mode); optional: Resend, GA4 service account

### 1. Clone & Install

```bash
git clone https://github.com/your-username/nexus-commerce.git
cd nexus-commerce
npm install
```

### 2. Configure environment

Create a `.env` file in the project root (see [Environment Variables](#-environment-variables) for the full list).

### 3. Database setup

Enable pgvector once on your database, then run migrations and seed:

```sql
-- run on your Postgres/Supabase instance
CREATE EXTENSION IF NOT EXISTS vector;
```

```bash
npm run prisma:generate
npm run prisma:migrate          # dev migrations
npm run seed                    # seed products/customers/etc.
npx tsx scripts/seedBrandDocs.ts  # seed RAG brand documents (requires OPENAI_API_KEY)
```

### 4. Add yourself to the admin allowlist

Create an `admin_allowlist` table in Supabase and insert your email with `is_active = true`. The middleware blocks any `/admin/*` route for emails not present and active in this table.

```sql
create table if not exists admin_allowlist (
  email text primary key,
  is_active boolean not null default true
);
insert into admin_allowlist (email, is_active) values ('you@example.com', true);
```

### 5. Run the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) for the landing page, or [http://localhost:3000/admin](http://localhost:3000/admin) to sign in (Supabase magic link / email‑password for an allowlisted account).

### 6. Razorpay webhook (payments)

- **URL:** `POST https://your-domain.com/api/v2/webhooks/razorpay`
- **Event:** `payment.captured`
- **Verification:** HMAC SHA256 with `RAZORPAY_WEBHOOK_SECRET`

---

## 🔑 Environment Variables

Create a `.env` file in the project root:

```env
# ── Database (Supabase / Postgres) ──────────────────────────────
DATABASE_URL=postgresql://...            # pooled connection
DIRECT_URL=postgresql://...              # direct connection (migrations)

# ── Supabase Auth ───────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# Add your email to the admin_allowlist table (see step 4)

# ── OpenAI ──────────────────────────────────────────────────────
OPENAI_API_KEY=sk-...
OPENAI_GENERATION_MODEL=gpt-4o-mini            # optional (default shown)
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # optional (default shown)
# OPENAI_SQL_MODEL=gpt-4o-mini                  # optional override for SQL generation

# ── Payments (Razorpay) ─────────────────────────────────────────
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# ── Email (Resend) ──────────────────────────────────────────────
RESEND_API_KEY=re_...

# ── Google Analytics 4 (Reporting API — service account) ────────
GA4_PROPERTY_ID=123456789
GOOGLE_CLIENT_EMAIL=...@...iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GA4_DEFAULT_DATE_RANGE_DAYS=30            # optional (default 30)

# ── App config ──────────────────────────────────────────────────
ALLOWED_ORIGIN=https://your-storefront.com   # CORS for /api/v2 public routes
COOKIE_CART_NAME=nx_cart
NODE_ENV=development
```

> **GA4 note:** the natural‑language GA4 reporting path authenticates with a **service account** (`GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY` + `GA4_PROPERTY_ID`). The Measurement‑Protocol purchase‑event helper in `lib/ga.ts` takes its `measurementId`/`apiSecret` as arguments and is not yet wired to env — server‑side purchase tracking is therefore inactive by default.

---

## 📡 API Reference

### Public (CORS‑enabled, `/api/v2`)

| Method | Endpoint                          | Description              |
| ------ | --------------------------------- | ----------------------- |
| GET    | `/api/v2/products/list`           | List active products     |
| GET    | `/api/v2/products/by-slug?slug=`  | Product by slug          |
| POST   | `/api/v2/cart/add-item`           | Add to cart              |
| PATCH  | `/api/v2/cart/update-item`        | Update quantity          |
| POST   | `/api/v2/cart/apply-discount`     | Apply discount code      |
| POST   | `/api/v2/orders/checkout`         | Create order + Razorpay order |
| GET    | `/api/v2/orders/get?id=`          | Get order details        |
| POST   | `/api/v2/discounts/validate`      | Validate discount        |
| POST   | `/api/v2/subscribers`             | Newsletter signup        |

### Admin (protected via middleware, `/api/v2/admin`)

| Resource   | Endpoints |
| ---------- | --------- |
| Orders     | `create`, `delete`, `fulfill`, `import-csv`, `list`, `update-payment-status`, `update-fulfillment-status`, `update-delivery-status`, `update-notes` |
| Products   | `list`, `update` (also `/api/admin/alyra-products`, `/api/admin/alyra-products/[id]`) |
| Discounts  | `create`, `list`, `update/[id]`, `delete/[id]` |
| Customers  | `create`, `get`, `list`, `delete`, `update-email-subscription` |

### AI / Marketing

| Method | Endpoint                          | Description |
| ------ | --------------------------------- | ----------- |
| POST   | `/api/ai/assistant`               | `intent: generate_email` *(currently broken)*, `query_metrics` (SQL/GA4); `create_flow` → `501` (deprecated) |
| POST   | `/api/flows/generate`             | NL → flow manifest + email templates |
| GET/POST | `/api/flows`                    | List / create flows |
| GET/PATCH/DELETE | `/api/flows/[id]`       | Read / update / delete a flow |
| POST   | `/api/flows/[id]/validate`        | Validate flow structure |
| POST   | `/api/flows/[id]/activate`        | Activate a flow |
| GET/PATCH | `/api/templates/[id]`          | Email template read/update (MJML + HTML) |

### Admin Analytics

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET/POST | `/api/admin/analytics/reports` | List / save reports |
| GET/PATCH/DELETE | `/api/admin/analytics/reports/[id]` | Report detail |
| POST | `/api/admin/analytics/reports/[id]/convert` | Convert report → chart |
| GET | `/api/admin/analytics/reports/[id]/export` | CSV export (records a download) |
| GET/POST | `/api/admin/analytics/charts` (+ `/[id]`) | Saved charts |
| POST | `/api/admin/analytics/ga4/report` | Run a GA4 report |

### Webhooks

| Endpoint                          | Service  | Verification |
| --------------------------------- | -------- | ------------ |
| POST `/api/v2/webhooks/razorpay`  | Razorpay | HMAC SHA256 (`x-razorpay-signature`) + idempotency |

---

## 🔒 Security & Reliability

- **Auth:** Supabase session + `admin_allowlist` table — only allowlisted, active emails reach `/admin/*` (enforced in `middleware.ts`)
- **CORS:** Public `/api/v2` routes scoped to `ALLOWED_ORIGIN`
- **Webhooks:** HMAC SHA256 signature verification + idempotency via `ProcessedEvent`
- **Input validation:** Zod on API requests and on every AI output
- **SQL safety:** Prisma ORM; AI‑generated analytics are SELECT‑only over a table/column whitelist with banned‑keyword checks and parameterized values
- **PII:** `customer_id`‑style columns redacted from assistant metric responses
- **Consent & suppression:** Flow runtime suppresses sends for bounced/complained customers and gates marketing emails on `marketingSubscribed`

---

## 📦 Scripts

```bash
npm run dev               # Start dev server
npm run build             # prisma generate && next build
npm run start             # Production server
npm run lint              # ESLint (next lint)
npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate    # Dev migrations (prisma migrate dev)
npm run prisma:deploy     # Prod migrations (prisma migrate deploy)
npm run seed              # Seed database (tsx prisma/seed.ts)

# Not in package.json, run directly:
npx tsx scripts/seedBrandDocs.ts   # Seed RAG brand documents (embeddings)
node test-delivery-status.js       # Ad-hoc delivery-status test script
```

---

## 🗺️ Roadmap

**Fix in progress (see [Project Status](#-project-status--known-limitations)):**
- 🔧 Repair the brand‑design **email‑generation chatbot** (end‑to‑end RAG → MJML → editor)
- 🔧 Wire **flow email delivery** to Resend (replace the runtime placeholder/queue stub)
- 🔧 Provision GA4 Measurement‑Protocol credentials for server‑side purchase events

**Planned:**
- Role‑based access control (RBAC) beyond the allowlist
- Rate limiting & audit logging
- Scheduled reports and richer exports
- Multi‑channel flow actions (SMS, push)
- Real‑time order updates (WebSockets)

---

## 📚 Documentation

| Document          | Description                                       |
| ----------------- | ------------------------------------------------- |
| `README.md`       | This file                                         |
| `ARCHITECTURE.md` | Detailed architecture, API reference, data flow   |
| `QUICKSTART.md`   | Quick setup and testing checklist                 |

---

## 📬 Contact

Built by **Amaan Barmare** to demonstrate full‑stack and AI engineering.

- **Email:** [amaan.barmare03@gmail.com](mailto:amaan.barmare03@gmail.com)
- **LinkedIn:** _add your profile_
- **Portfolio:** _add your portfolio_

---

## 📄 License

This repository is private and not licensed for commercial use. Code may be viewed for evaluation purposes only.

© 2026 Amaan Barmare
