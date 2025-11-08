'use client';

import { Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function MarketingPage() {
  const router = useRouter();

  return (
    <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white px-10 py-20 shadow-sm">
      <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-gradient-to-br from-amber-200 to-rose-200 opacity-60" />
      <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-slate-200 to-emerald-200 opacity-50" />
      <div className="relative mx-auto max-w-3xl text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="mt-8 text-4xl font-semibold text-slate-900">AI Marketing Assistant</h1>
        <p className="mt-4 text-lg text-slate-600">
          Craft hyper-personalised flows, generate ready-to-send templates, and pull quick metrics, all in Alyra’s brand voice.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 text-sm text-slate-500">
          <span>What you can ask:</span>
          <ul className="space-y-1">
            <li>• “When a customer places an order, send a confirmation email.”</li>
            <li>• “Draft a launch announcement for Fruit d’Amour.”</li>
            <li>• “What’s the average order value this month?”</li>
          </ul>
        </div>
        <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button
            size="lg"
            className="inline-flex items-center gap-2 px-8 text-base"
            onClick={() => router.push('/admin/marketing/assistant/flows')}
          >
            Flows & Emails
            <Sparkles className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="inline-flex items-center gap-2 px-8 text-base"
            onClick={() => router.push('/admin/marketing/assistant/metrics')}
          >
            Quick Metrics
          </Button>
        </div>
      </div>
    </div>
  );
}
