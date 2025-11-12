'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type FlowListItem = {
  id: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'DISABLED';
  updatedAt: string;
  createdAt: string;
};

export default function FlowsIndexPage() {
  const [flows, setFlows] = useState<FlowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFlows() {
      try {
        const response = await fetch('/api/flows?status=ACTIVE');
        if (!response.ok) {
          throw new Error('Failed to load flows');
        }
        const data = await response.json();
        setFlows(data.flows ?? []);
      } catch (err) {
        console.error('Error loading flows', err);
        setError('Unable to load activated flows right now.');
      } finally {
        setLoading(false);
      }
    }

    loadFlows();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Flows & Emails</h1>
        <p className="mt-2 text-slate-500">
          Review all activated automations. New flows appear here after activation.
        </p>
      </div>

      {loading ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Loading activated flows…</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-500">
            <p>Please wait while we fetch your latest flows.</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Something went wrong</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-red-600">
            <p>{error}</p>
          </CardContent>
        </Card>
      ) : flows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">No activated flows yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <p>
              Once you activate a flow in the assistant, it will be listed here so you can revisit it
              quickly.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activated flows ({flows.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-200">
              {flows.map((flow) => (
                <li key={flow.id} className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium text-slate-900">{flow.name}</p>
                    <p className="text-xs text-slate-500">
                      Updated {new Date(flow.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-700">
                    Active
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

