import type { Metadata } from 'next';
import Link from 'next/link';
import { HeroVisuals } from '@/components/landing/HeroVisuals';
import { BarChart3, Check, Mail, Shield, Sparkles, Workflow, Zap } from 'lucide-react';

const CONTACT_EMAIL = 'amaan.barmare03@gmail.com';
const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Nexus Commerce — inquiry')}`;

export const metadata: Metadata = {
  title: 'Nexus Commerce — AI-native commerce & marketing ops',
  description:
    'One platform for orders, inventory, and AI assistants: ask metrics in plain English, generate emails, and ship automation flows from a visual builder.',
  openGraph: {
    title: 'Nexus Commerce — AI-native commerce & marketing ops',
    description:
      'Metrics assistant + flow builder. Run storefront operations and campaigns from one command center.',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="text-lg font-semibold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Nexus Commerce
          </span>
          <nav className="flex items-center gap-3 sm:gap-4">
            <a
              href="#assistants"
              className="hidden sm:inline text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Assistants
            </a>
            <a
              href="#contact"
              className="hidden sm:inline text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Contact
            </a>
            <Link
              href="/admin"
              className="text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <a
              href={CONTACT_MAILTO}
              className="rounded-full bg-white text-zinc-950 px-4 py-2 text-sm font-semibold hover:bg-zinc-200 transition-colors"
            >
              Contact Sales
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative pt-28 pb-20 sm:pt-32 sm:pb-28 overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(6,182,212,0.25),transparent),radial-gradient(ellipse_60%_40%_at_100%_0%,rgba(139,92,246,0.15),transparent)]"
            aria-hidden
          />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <p className="text-sm font-medium text-cyan-400 mb-4">AI-native e-commerce operations</p>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold tracking-tight text-white leading-[1.1]">
                One command center for{' '}
                <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
                  store ops &amp; growth
                </span>
              </h1>
              <p className="mt-6 text-lg text-zinc-400 leading-relaxed max-w-xl">
                Two assistants your team actually uses: chat with your metrics and GA4, and describe
                automations that become real flows—validated, visual, and ready to run.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={CONTACT_MAILTO}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-7 py-3.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-cyan-500/20 hover:opacity-95 transition-opacity"
                >
                  Contact Sales
                </a>
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  Sign in to admin
                </Link>
              </div>
              <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-500">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  Read-only, schema-safe SQL
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  GA4 reporting from natural language
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  RAG-grounded email generation
                </li>
              </ul>
            </div>
            <HeroVisuals />
          </div>
        </section>

        <section id="assistants" className="py-20 border-t border-white/5 scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                The two assistants teams ask for by name
              </h2>
              <p className="mt-4 text-zinc-400 text-lg">
                Purpose-built for operators: answer &quot;what happened?&quot; and &quot;what should we send
                next?&quot; without tab-hopping or brittle dashboards.
              </p>
            </div>
            <div className="mt-14 grid md:grid-cols-2 gap-6">
              <article className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 hover:border-cyan-500/30 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-white flex items-center gap-2">
                  Marketing Assistant
                  <Sparkles className="w-5 h-5 text-cyan-400/80" aria-hidden />
                </h3>
                <p className="mt-3 text-zinc-400 leading-relaxed">
                  Ask revenue, orders, and segments in plain English with constrained, read-only SQL.
                  Layer in GA4 for traffic and acquisition. Generate campaign-ready emails grounded in
                  your catalog and brand context.
                </p>
                <ul className="mt-6 space-y-2 text-sm text-zinc-500">
                  <li className="flex gap-2">
                    <Zap className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                    Natural language → safe analytics
                  </li>
                  <li className="flex gap-2">
                    <Zap className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                    MJML-ready outputs with validation
                  </li>
                </ul>
              </article>
              <article className="rounded-2xl border border-white/10 bg-zinc-900/40 p-8 hover:border-violet-500/30 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
                  <Workflow className="w-6 h-6" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-white flex items-center gap-2">
                  Flow Builder
                  <span className="text-xs font-normal text-violet-400/90">AI → graph</span>
                </h3>
                <p className="mt-3 text-zinc-400 leading-relaxed">
                  Describe journeys like abandoned cart sequences or win-back paths. The model returns
                  a structured flow you refine on a canvas—triggers, delays, conditions, and sends—then
                  validate before anything goes live.
                </p>
                <ul className="mt-6 space-y-2 text-sm text-zinc-500">
                  <li className="flex gap-2">
                    <Zap className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                    Chat-first authoring, visual control
                  </li>
                  <li className="flex gap-2">
                    <Zap className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                    Schema-checked automation manifests
                  </li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        <section className="py-20 border-t border-white/5 bg-zinc-900/30">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-white text-center max-w-2xl mx-auto">
              Built for teams who outgrew spreadsheets—but not rigor
            </h2>
            <div className="mt-12 grid sm:grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-200 bg-clip-text text-transparent">
                  NL
                </p>
                <p className="mt-2 text-sm text-zinc-400">to SQL &amp; GA4, whitelisted &amp; read-only</p>
              </div>
              <div>
                <p className="text-4xl font-bold bg-gradient-to-r from-violet-400 to-violet-200 bg-clip-text text-transparent">
                  RAG
                </p>
                <p className="mt-2 text-sm text-zinc-400">emails grounded in your real product story</p>
              </div>
              <div>
                <p className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent">
                  Zod
                </p>
                <p className="mt-2 text-sm text-zinc-400">every AI payload validated before execution</p>
              </div>
            </div>
            <div className="mt-14 flex flex-wrap justify-center gap-6 text-zinc-500 text-sm">
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-zinc-600" />
                Admin allowlist &amp; Supabase auth
              </span>
              <span className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-zinc-600" />
                Resend-ready email pipeline
              </span>
            </div>
          </div>
        </section>

        <section className="py-20 border-t border-white/5">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-2xl font-bold text-white text-center">Questions we hear most</h2>
            <dl className="mt-10 max-w-2xl mx-auto space-y-6">
              <div className="border-b border-white/10 pb-6">
                <dt className="font-medium text-white">Is the analytics AI safe?</dt>
                <dd className="mt-2 text-zinc-400 text-sm leading-relaxed">
                  Queries are generated against an allowed schema and executed read-only—no ad-hoc DDL or
                  destructive paths.
                </dd>
              </div>
              <div className="border-b border-white/10 pb-6">
                <dt className="font-medium text-white">What makes the flow builder different?</dt>
                <dd className="mt-2 text-zinc-400 text-sm leading-relaxed">
                  You start in conversation and land on a graph you can audit. Outputs are structured and
                  validated so automation stays maintainable.
                </dd>
              </div>
              <div>
                <dt className="font-medium text-white">Who is Nexus Commerce for?</dt>
                <dd className="mt-2 text-zinc-400 text-sm leading-relaxed">
                  E-commerce operators and technical marketers who want one admin for commerce data,
                  campaigns, and AI copilots—not three disconnected tools.
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section id="contact" className="py-24 border-t border-white/5 scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Ready to see Nexus Commerce on your stack?
            </h2>
            <p className="mt-4 text-zinc-400 max-w-xl mx-auto leading-relaxed">
              Questions, demos, or partnerships—send a note and we&apos;ll get back to you.
            </p>
            <p className="mt-8 text-lg text-zinc-300">
              Contact:{' '}
              <a
                href={CONTACT_MAILTO}
                className="font-medium text-cyan-400 hover:text-cyan-300 underline underline-offset-4 decoration-cyan-500/40 hover:decoration-cyan-400"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-500">
          <span>© {new Date().getFullYear()} Nexus Commerce</span>
          <div className="flex gap-6">
            <Link href="/admin" className="hover:text-zinc-300 transition-colors">
              Admin
            </Link>
            <a href={CONTACT_MAILTO} className="hover:text-zinc-300 transition-colors">
              Contact Sales
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
