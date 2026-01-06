'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmailEditor } from '@/app/admin/marketing/assistant/flows/EmailEditor';

type FlowListItem = {
  id: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'DISABLED';
  updatedAt: string;
  createdAt: string;
};

type EmailListItem = {
  flowId: string;
  flowName: string;
  nodeId: string;
  nodeLabel: string;
  templateId?: string;
  templateName?: string;
  emailType?: string;
  updatedAt?: string;
};

export default function FlowsIndexPage() {
  const [flows, setFlows] = useState<FlowListItem[]>([]);
  const [emails, setEmails] = useState<EmailListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'flows' | 'emails'>('flows');
  const [previewEmail, setPreviewEmail] = useState<EmailListItem | null>(null);

  useEffect(() => {
    async function loadFlows() {
      try {
        const response = await fetch('/api/flows?status=ACTIVE&include=emails');
        if (!response.ok) {
          throw new Error('Failed to load flows');
        }
        const data = await response.json();
        setFlows(data.flows ?? []);
        setEmails(data.emails ?? []);
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

      <section>
        <div className="flex items-center gap-6 border-b border-slate-200">
          {[
            { id: 'flows', label: 'Flows' },
            { id: 'emails', label: 'Emails' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`relative px-1 pb-3 text-sm font-semibold transition ${
                  isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
                onClick={() => setActiveTab(tab.id as 'flows' | 'emails')}
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
          {loading ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Loading automations…</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-500">
                <p>Please wait while we fetch your latest flows and emails.</p>
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
          ) : activeTab === 'flows' ? (
            flows.length === 0 ? (
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
                      <FlowRow key={flow.id} flow={flow} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          ) : (
            emails.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">No emails generated yet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-600">
                  <p>
                    As you activate flows with email steps, each template will appear here with a link to its flow.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Emails from flows ({emails.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="divide-y divide-slate-200">
                      {emails.map((email) => (
                        <li
                          key={`${email.flowId}-${email.nodeId}`}
                          className="flex items-start justify-between gap-4 py-4"
                        >
                          <div>
                            <p className="font-medium text-slate-900">
                              {email.templateName ?? email.nodeLabel}
                            </p>
                            <p className="text-xs text-slate-500">{email.flowName}</p>
                            {email.nodeLabel && email.templateName && (
                              <p className="text-xs text-slate-400">Step: {email.nodeLabel}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="outline" className="uppercase text-xs">
                              {email.emailType ?? 'email'}
                            </Badge>
                            {email.updatedAt && (
                              <p className="text-[11px] text-slate-400">
                                Template updated {new Date(email.updatedAt).toLocaleString()}
                              </p>
                            )}
                            {email.templateId && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => setPreviewEmail(email)}
                              >
                                Preview
                              </Button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {previewEmail && previewEmail.templateId && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-6">
                    <div className="w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div>
                          <h2 className="text-base font-semibold text-slate-900">
                            {previewEmail.templateName ?? previewEmail.nodeLabel}
                          </h2>
                          <p className="text-xs text-slate-500">{previewEmail.flowName}</p>
                          {previewEmail.nodeLabel && previewEmail.templateName && (
                            <p className="text-xs text-slate-400">Step: {previewEmail.nodeLabel}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewEmail(null)}
                        >
                          Close
                        </Button>
                      </div>
                      <div className="mt-2">
                        <EmailEditor templateId={previewEmail.templateId} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )
          )}
        </div>
      </section>
    </div>
  );
}

type FlowRowProps = {
  flow: { id: string; name: string; updatedAt: string };
};

function FlowRow({ flow }: FlowRowProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleProceed = async () => {
    try {
      setBusy(true);
      // Fetch current manifest so the update API passes validation
      const getResp = await fetch(`/api/flows/${flow.id}`);
      const getJson = await getResp.json();
      if (!getResp.ok) {
        throw new Error(getJson.error || 'Failed to load flow');
      }
      const manifest = getJson.flow?.manifest;
      if (!manifest) {
        throw new Error('Flow manifest missing');
      }
      // Set to DRAFT before editing
      const putResp = await fetch(`/api/flows/${flow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifest, status: 'DRAFT' }),
      });
      const putJson = await putResp.json();
      if (!putResp.ok) {
        throw new Error(putJson.error || 'Failed to prepare flow for editing');
      }
      // Navigate to assistant with this flowId
      window.location.href = `/admin/marketing/assistant/flows?flowId=${encodeURIComponent(flow.id)}`;
    } catch (error) {
      console.error('Edit flow failed', error);
      alert(error instanceof Error ? error.message : 'Failed to open editor');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex items-center justify-between py-4">
      <div>
        <p className="font-medium text-slate-900">{flow.name}</p>
        <p className="text-xs text-slate-500">Updated {new Date(flow.updatedAt).toLocaleString()}</p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-700">
          Active
        </Badge>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          onClick={() => setConfirmOpen(true)}
        >
          Edit flow
        </button>
      </div>
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Edit “{flow.name}”?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will stop the current flow and set its status to draft. You can edit the nodes and edges, then re-activate.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setConfirmOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                onClick={handleProceed}
                disabled={busy}
              >
                {busy ? 'Preparing…' : 'Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

