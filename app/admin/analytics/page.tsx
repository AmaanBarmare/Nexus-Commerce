'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'files', label: 'All Files' },
] as const;

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('dashboard');

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-slate-900">Analytics</h1>
        <p className="mt-2 text-sm text-slate-500">
          Explore insights and manage performance data across dashboards and file views.
        </p>
      </header>

      <section>
        <div className="flex items-center gap-4 border-b border-slate-200">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-1 pb-3 text-sm font-semibold transition ${
                  isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute inset-x-0 -bottom-[1px] h-0.5 rounded-full bg-slate-900" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          {activeTab === 'dashboard' && (
            <Card className="h-64">
              <CardHeader>
                <CardTitle>Dashboard</CardTitle>
              </CardHeader>
              <CardContent className="flex h-full items-center justify-center text-sm text-slate-400">
                <span>Dashboard visualisations coming soon.</span>
              </CardContent>
            </Card>
          )}

          {activeTab === 'files' && (
            <Card className="h-64">
              <CardHeader>
                <CardTitle>All Files</CardTitle>
              </CardHeader>
              <CardContent className="flex h-full items-center justify-center text-sm text-slate-400">
                <span>File management tools will appear here.</span>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}


