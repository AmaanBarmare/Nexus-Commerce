'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

type VisualizationType = 'table' | 'timeseries' | 'bar';

interface MetricsResult {
  id: string;
  metric: string;
  visualization: VisualizationType;
  sql: string;
  params: Array<string | number | boolean | null>;
  columns: Array<{ name: string; type: string }>;
  rows: Array<Record<string, unknown>>;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  data?: MetricsResult;
}

export default function MetricsAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingReportId, setSavingReportId] = useState<string | null>(null);
  const [saveDialog, setSaveDialog] = useState<{
    open: boolean;
    report?: MetricsResult;
    name: string;
    error: string | null;
    submitting: boolean;
  }>({
    open: false,
    name: '',
    error: null,
    submitting: false,
  });

  const router = useRouter();

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          intent: 'query_metrics',
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const assistantMessage = formatMetricsResponse(result.data);
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content: assistantMessage,
            data: transformMetricsResponse(result.data),
          },
        ]);
      } else {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: `❌ Error: ${result.error || 'Unknown error'}` },
        ]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `❌ Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReport = (data: MetricsResult) => {
    const defaultName = humaniseMetricName(data.metric);
    setSaveDialog({
      open: true,
      report: data,
      name: defaultName,
      error: null,
      submitting: false,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-10 pt-8 sm:px-6 lg:px-10">
        <header className="flex flex-col gap-6 border-b border-white/10 pb-6 lg:flex-row lg:items-center lg:justify-between lg:border-none">
          <button
            onClick={() => router.push('/admin/marketing')}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to marketing
          </button>

          <div className="flex items-center gap-3 lg:ml-auto">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tracking-[0.35em] text-white/60">ALYRA</p>
              <h2 className="text-xl font-semibold">Quick Metrics Assistant</h2>
            </div>
          </div>
        </header>

        <main className="flex-1 pt-8">
          <Card className="flex flex-1 flex-col bg-white/10 text-white shadow-lg">
            <CardHeader className="border-b border-white/10 pb-4">
              <CardTitle className="text-white">Conversation</CardTitle>
              <p className="text-sm text-white/70">
                Ask for on-demand metrics—average order value, top customers, recent revenue, and more.
              </p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col space-y-4 pt-6">
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {messages.length === 0 && (
                  <div className="rounded-xl border border-white/15 bg-white/5 p-6 text-center text-white/70">
                    <p className="text-base font-medium">Start with a metric question</p>
                    <p className="mt-2 text-sm">Try prompts like:</p>
                    <ul className="mt-3 space-y-1 text-sm">
                      <li>• “What’s the average order value in the last 30 days?”</li>
                      <li>• “List the top 5 customers by revenue.”</li>
                      <li>• “How much revenue did we generate this week?”</li>
                    </ul>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                        msg.role === 'user'
                          ? 'bg-white text-slate-900'
                          : 'bg-white/10 text-white backdrop-blur'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {msg.data && (
                        <div className="mt-3 rounded-xl border border-white/15 bg-black/20 p-3 text-xs text-white/80">
                          <MetricsResultView
                            data={msg.data}
                            onSave={() => handleSaveReport(msg.data!)}
                            saving={savingReportId === msg.data.id}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/70">Crunching numbers...</div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask for a metric... (Press Enter to send, Shift+Enter for a new line)"
                  rows={3}
                  disabled={loading}
                  className="border-white/20 bg-white/5 text-white placeholder:text-white/40 focus-visible:ring-white/40"
                />
                <Button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="w-full bg-white text-slate-900 hover:bg-slate-200"
                >
                  {loading ? 'Fetching metrics...' : 'Send'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
      <SaveReportDialog
        state={saveDialog}
        onClose={() =>
          setSaveDialog({
            open: false,
            name: '',
            error: null,
            submitting: false,
          })
        }
        onSubmit={async (name) => {
          if (!saveDialog.report) return;
          setSavingReportId(saveDialog.report.id);
          setSaveDialog((prev) => ({ ...prev, submitting: true, error: null }));
          try {
            const response = await fetch('/api/admin/analytics/reports', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name,
                metric: saveDialog.report.metric,
                visualization: saveDialog.report.visualization,
                columns: saveDialog.report.columns,
                rows: saveDialog.report.rows,
                sql: saveDialog.report.sql,
                params: saveDialog.report.params,
              }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
              throw new Error(result.error || 'Failed to save report');
            }

            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: `📁 Saved report "${result.data.name}" to Analytics → All Files.`,
              },
            ]);
            setSaveDialog({
              open: false,
              name: '',
              error: null,
              submitting: false,
            });
          } catch (error) {
            setSaveDialog((prev) => ({
              ...prev,
              error: error instanceof Error ? error.message : 'Unexpected error occurred',
              submitting: false,
            }));
          } finally {
            setSavingReportId(null);
          }
        }}
      />
    </div>
  );
}

function formatMetricsResponse(data: any): string {
  if (!data || typeof data !== 'object') return 'No data returned.';

  if (data.metric && typeof data.metric === 'string') {
    return `📊 ${humaniseMetricName(data.metric)}`;
  }

  return '📊 Metrics ready';
}

function transformMetricsResponse(data: any): MetricsResult | undefined {
  if (!data || typeof data !== 'object') return undefined;
  if (!Array.isArray(data.columns) || !Array.isArray(data.rows)) return undefined;

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    metric: typeof data.metric === 'string' ? data.metric : 'metric_result',
    visualization: (['table', 'timeseries', 'bar'] as VisualizationType[]).includes(data.visualization)
      ? data.visualization
      : 'table',
    sql: typeof data.sql === 'string' ? data.sql : '',
    params: Array.isArray(data.params) ? data.params : [],
    columns: data.columns
      .filter((col: any) => col && typeof col.name === 'string')
      .map((col: any) => ({
        name: col.name,
        type: typeof col.type === 'string' ? col.type : typeof data.rows[0]?.[col.name],
      })),
    rows: (data.rows as Array<Record<string, unknown>>).map((row) => ({ ...row })),
  };
}

function MetricsResultView({
  data,
  onSave,
  saving,
}: {
  data: MetricsResult;
  onSave?: () => void;
  saving?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
          {humaniseMetricName(data.metric)}
        </p>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/25 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/60">
            {data.visualization}
          </span>
          {onSave && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onSave}
              disabled={saving}
              className="text-[10px] uppercase tracking-[0.2em]"
            >
              {saving ? 'Saving…' : 'Save to All Files'}
            </Button>
          )}
        </div>
      </div>

      {data.rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/30">
          <table className="min-w-full text-left text-[11px] text-white/90">
            <thead className="bg-white/10 text-white">
              <tr>
                {data.columns.map((column) => (
                  <th key={column.name} className="px-3 py-2 font-semibold">
                    {column.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.slice(0, 20).map((row, rowIdx) => (
                <tr key={rowIdx} className="border-t border-white/10">
                  {data.columns.map((column) => {
                    const cellValue = row[column.name];
                    return (
                      <td key={column.name} className="px-3 py-2">
                        {formatCellValue(cellValue, column.name)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {data.rows.length > 20 && (
            <p className="px-3 pb-2 pt-1 text-[10px] text-white/50">Showing first 20 rows</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-white/60">No rows returned for this query.</p>
      )}

      <details className="rounded-lg border border-white/15 bg-black/10 p-2">
        <summary className="cursor-pointer text-[10px] uppercase tracking-[0.2em] text-white/60">
          SQL Plan (debug)
        </summary>
        <pre className="mt-2 whitespace-pre-wrap break-words text-[11px] text-white/70">{data.sql || 'N/A'}</pre>
        {data.params.length > 0 && (
          <p className="mt-1 text-[11px] text-white/60">Params: {JSON.stringify(data.params)}</p>
        )}
      </details>
    </div>
  );
}

function formatCellValue(value: unknown, columnName?: string): string {
  if (value === null || value === undefined) return '—';

  const lowerColumn = columnName?.toLowerCase() ?? '';

  if (typeof value === 'number') {
    if (lowerColumn.includes('revenue') || lowerColumn.includes('amount') || lowerColumn.includes('value')) {
      return formatCurrency(value);
    }

    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  }

  if (typeof value === 'string') {
    // Attempt to parse serialised BigInt values
    if (/^\d+$/.test(value) && lowerColumn.includes('revenue')) {
      return formatCurrency(Number(value));
    }
    return value;
  }

  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map((item) => formatCellValue(item)).join(', ');
  }

  if (typeof value === 'object') return JSON.stringify(value, null, 2);

  return String(value);
}

function formatCurrency(value: number | string): string {
  const numericValue = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(numericValue)) {
    return String(value);
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

function humaniseMetricName(metric: string): string {
  return metric
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function SaveReportDialog({
  state,
  onClose,
  onSubmit,
}: {
  state: {
    open: boolean;
    report?: MetricsResult;
    name: string;
    error: string | null;
    submitting: boolean;
  };
  onClose: () => void;
  onSubmit: (name: string) => void;
}) {
  const { open, name, error, submitting } = state;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save report</DialogTitle>
          <DialogDescription>
            Store this table in Analytics → All Files for future reference.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const reportName = (formData.get('reportName') as string)?.trim();
            if (!reportName) {
              return;
            }
            onSubmit(reportName);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="reportName">Report name</Label>
            <Input
              id="reportName"
              name="reportName"
              defaultValue={name}
              placeholder="e.g. Top Customers by Revenue"
              disabled={submitting}
              required
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
          <DialogFooter className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
