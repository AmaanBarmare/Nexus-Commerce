<div align="center">

# 🚀 NexusCommerce — AI-Native Commerce Admin with Agentic Workflows

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2d3748)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3fb883)](https://supabase.com/)
[![OpenAI](https://img.shields.io/badge/LLM-OpenAI-412991)](https://platform.openai.com/)
[![Resend](https://img.shields.io/badge/Email-Resend-000000)](https://resend.com/)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay-0f6fff)](https://razorpay.com/)
[![License](https://img.shields.io/badge/License-Evaluation_Only-red)](#)

<strong>A modern, AI‑powered alternative to legacy commerce admin tools.</strong><br/>
NexusCommerce is a full-stack, AI-native commerce admin built to demonstrate agentic LLM patterns, end-to-end workflow orchestration, and production-grade system design for modern e-commerce operations.

</div>

## 👀 For Hiring Managers (Quick Summary)

NexusCommerce demonstrates:
- **Full-stack architecture** (Next.js App Router + Prisma + Postgres)
- **Distributed systems thinking** (webhooks, idempotency, workflows)
- **Agentic AI** (OpenAI function-calling, tool execution, validation loops)
- **Retrieval-Augmented Generation** (embeddings + vector search)
- **Production readiness** (auth, migrations, seeds, CORS, emails, payments)

**Best places to see key engineering patterns:**
- `/app/admin/marketing/assistant` — AI-assisted workflow builder & canvas
- `/lib/ai` — Agent tool registry, schemas, and RAG implementation
- `/app/api/v2/*` — Domain-driven API design & route handlers
- `/emails/*` — MJML-based email design system & compilation pipeline

## 🌟 Overview

NexusCommerce is an end‑to‑end, production‑grade admin for e‑commerce. It combines a robust full‑stack foundation (Next.js + Prisma + PostgreSQL) with an agentic AI layer that:

- Translates intent into executable workflow graphs (triggers → filters → waits → sends)
- Generates safe SQL for analytics against a constrained schema
- Writes production‑ready, on‑brand emails with your product/brand context
- Validates outputs with strict schemas and guardrails before anything goes live

### ⚙️ Tech Highlights
- **Agentic AI** using OpenAI function-calling + schema validation
- **RAG** for grounding emails + analytics in product data
- **Workflow engine** with triggers/filters/waits/sends
- **Next.js App Router** + server actions + route handlers
- **Prisma + Supabase PostgreSQL** with migrations + seeds
- **MJML email system** with previews + provider integration
- **Payments** via Razorpay (webhooks, HMAC verification, idempotency)

## 🧠 Why this is different

## 🧠 Why this is different

- **Agentic AI, not just prompts**: Tool‑calling with JSON schemas, validation loops, and fallbacks.
- **Clear boundaries**: UI ↔ API ↔ data/services are cleanly separated and testable.
- **Real commerce**: Orders, payments, inventory, discounts, analytics, subscribers, emails.
- **Operations‑ready**: Webhooks, idempotency, CORS, environment isolation, migrations, seeds.

## 🔥 Core Capabilities

- **Agentic AI**
  - Natural language → flow graph proposals with validation and corrections
  - Natural language → safe SQL mapped to known tables/columns only
  - Natural language → on‑brand emails (subject, body, CTAs, variants)
  - Retrieval‑augmented grounding on product/brand knowledge

- **Commerce Admin**
  - Orders (statuses, fulfillment, delivery, notes)
  - Products & inventory (price, variants, stock updates)
  - Discounts (scoped, scheduled, usage‑limited)
  - Customers & subscribers (profiles, preferences)

- **Analytics & Reports**
  - Charts and KPIs for revenue/orders
  - AI‑assisted query generation
  - Exportable data

- **Email & Automation**
  - MJML design system → responsive HTML
  - Flow engine (triggers/filters/waits/sends)
  - Sending via provider with tracking and error handling

- **Payments & Webhooks**
  - Checkout orchestration
  - Payment webhooks with signature verification
  - Idempotent processing and state reconciliation

## 🧩 System Architecture

The system follows a **Domain-Driven Design (DDD)** approach with a clear separation between the control plane (Admin UI), data plane (Prisma/Postgres), and intelligence plane (AI/Agents).

```mermaid
graph TD
    User((Admin User)) --> Client
    
    subgraph "Client Layer (Next.js)"
        Client[React Admin UI]
        Chat[AI Assistant UX]
        Canvas[Flow Builder Canvas]
    end
    
    subgraph "Edge Layer"
        Auth[Auth Middleware]
        CORS[CORS Policy]
    end
    
    subgraph "Application Layer (Server Actions/API)"
        API[v2 Domain APIs]
        Flows[Flow Engine]
        Intel[Intelligence Service]
        Payment[Payment Gateway]
    end
    
    subgraph "Agentic AI Layer"
        LLM[LLM Orchestrator]
        RAG[RAG / Embeddings]
        Tools[Tool Registry]
        Validator[Schema Validators]
    end
    
    subgraph "Data Persistence"
        DB[(PostgreSQL + Supabase)]
        Vector[(Vector Store)]
    end
    
    Client --> Auth --> API
    Chat --> Auth --> Intel
    Intel --> LLM
    LLM --> Tools
    Tools --> RAG
    Tools --> Validator
    Validator --> DB
    API --> DB
    Payment --> API
```

### Key Design Patterns

1.  **Agentic Loop**: The AI doesn't just "complete text." It iteratively plans, calls tools (e.g., `generate_sql`, `validate_flow`), validates the output against Zod schemas, and self-corrects errors before returning a response to the UI.
2.  **CQRS-Lite**: We separate "Reads" (Analytics/Dashboards) from "Writes" (Order processing, Inventory updates) to ensure that heavy reporting queries don't lock transactional tables.
3.  **Idempotency**: Critical paths (Payments, Inventory Deductions) use idempotency keys and database transactions to ensure exactly-once processing, even during network failures.
4.  **Edge Protection**: Authentication and rate-limiting logic sits at the Middleware level, protecting the core application logic from unauthorized access and abuse.

## 🧠 The AI Layer: Deep Dive

This isn't a wrapper around `chat.completions`. It's an engineered system designed for reliability.

### 1. Retrieval-Augmented Generation (RAG)
Before generating content, the system:
- Embeds the user query (e.g., "Create an email for our new Summer Set").
- Searches the `brand_docs` and `products` vector store for relevant context.
- Injects price, inventory, and brand voice guidelines into the system prompt.
- **Result**: Emails that reference *actual* products and prices, not hallucinations.

### 2. Strict Schema Validation
LLMs are probabilistic; Systems must be deterministic.
- Every AI tool output (SQL, JSON Flow, Email HTML) is parsed by **Zod schemas**.
- If validation fails (e.g., missing flow trigger, invalid SQL column), the error is fed *back* to the LLM to self-correct.
- **Result**: The system never executes invalid code or corrupts data.

### 3. Tool Use & Function Calling
The Assistant has access to a "Tool Registry":
- `query_analytics`: Maps natural language to safe, read-only SQL.
- `draft_email`: Generates MJML emails with variable injection.
- `build_flow`: Constructs valid marketing automation graphs.
- `check_inventory`: Real-time stock lookups.

### 4. Safety Guardrails
- **SQL Sandbox**: The AI can only query specific `read_only` views, preventing `DROP TABLE` or data leakage.
- **PII Redaction**: Customer PII is masked before being sent to the LLM context.
- **Human-in-the-Loop**: Critical actions (Activating a Flow, Sending a Campaign) always require explicit UI confirmation.

## 🛠️ Tech Stack

- Frontend: Next.js (App Router), React, TypeScript, Tailwind, shadcn/ui, Recharts
- Backend: Next.js Route Handlers, Prisma ORM, Zod validation
- Database: PostgreSQL (Supabase)
- AI: OpenAI (function‑calling, structured outputs), embeddings/RAG
- Email: MJML → HTML → Resend
- Payments: Razorpay (webhooks, signature verification)
- Analytics: GA4 Measurement Protocol + in‑app charts

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (Supabase recommended)
- API keys: OpenAI, Resend, Razorpay (test), GA4 (optional)

### 1) Install
```bash
npm install
```

### 2) Configure environment
Create `.env.local`:
```env
# Database (Supabase Postgres)
DATABASE_URL=postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[pass]@aws-0-[region].supabase.com:5432/postgres

# Supabase Auth (Authentication)
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ADMIN_EMAILS=you@example.com,another@example.com

# AI & LLM (Agentic Layer)
OPENAI_API_KEY=sk-...
OPENAI_GENERATION_MODEL=gpt-4-1106-preview
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Payments (Razorpay)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Analytics (GA4)
VITE_GA4_ID=G-XXXXXXXXXX
GA4_API_SECRET=...

# Email (Resend)
RESEND_API_KEY=re_...

# Security & Configuration
ALLOWED_ORIGIN=https://your-storefront.com
COOKIE_CART_NAME=nexus_cart
NODE_ENV=development
```

### 3) Initialize DB
```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

### 4) Develop
```bash
npm run dev
```
Visit http://localhost:3000 and log in via magic link (allowed emails via ADMIN_EMAILS).

### 5) Webhooks (payments)
- Configure Razorpay webhook: POST /api/v2/webhooks/razorpay
- Event: payment.captured
- Uses HMAC signature verification and idempotency

## 🧪 What to Try First

- Ask the assistant to “build an abandoned cart flow with a 2‑hour wait and a 10% discount email.”  
- Ask, “why did revenue dip last week?” and let AI propose a safe SQL query and chart.  
- Generate an on‑brand product launch email; request variants (short, playful, formal).  
- Create a discount, validate it via the public API, and apply it during checkout.

## 🧠 The AI Layer (at a glance)

- Function‑calling with strict JSON schemas for flows, emails, and SQL.
- Retrieval‑augmented grounding on product/brand metadata for personalization.
- Output validation and auto‑correction; human approval gates for risky actions.
- Timeouts, retries, and fallbacks to keep UX resilient.

## 🔒 Security & Reliability

- Protected admin routes and session checks at the edge.
- CORS‑scoped public APIs for storefront integration.
- Idempotent webhooks with signature verification.
- Input validation via Zod; Prisma ORM to minimize SQL injection risk.

## 🗺️ Roadmap (selected)

- Role‑based access control (RBAC)
- Advanced exports (CSV/Excel) and scheduled reports
- Rate limiting & audit logging
- Additional flow actions (multi‑channel)

## 📦 Scripts

```bash
npm run dev               # start development
npm run build             # prisma generate + next build
npm run start             # start production server
npm run prisma:generate   # generate Prisma client
npm run prisma:migrate    # dev migrations
npm run prisma:deploy     # prod migrations
npm run seed              # seed data
```

## 🧩 Key Engineering Learnings

Building NexusCommerce helped me deepen experience in:
- **Designing agentic AI systems** with tool-use and self-correction loops.
- **Building a workflow orchestration engine** from scratch.
- **Architecting scalable, domain-driven APIs** separated from UI logic.
- **Implementing safe SQL generation** via constrained schema access and validators.
- **Managing transactional integrity** (payments, idempotency, inventory locks).
- **Designing a shared UI component system** for complex admin dashboards.
- **Deploying full-stack systems** with environment-configurable runtimes.

## 🤝 Why this project

Commerce back‑offices have remained largely unchanged. NexusCommerce shows what a modern, AI‑native admin can do: faster workflows, safer operations, and tooling that meets non‑technical users where they are — natural language.

## 📬 Contact / Portfolio

If you're a recruiter, engineer, or founder interested in the system:

- Email: your-email-here  
- LinkedIn: your-linkedin-here  
- Portfolio: your-portfolio-here

---

## 🔒 License

This repository is private and not licensed for commercial use.  
You may view the code for evaluation purposes only.

Private — © 2025

