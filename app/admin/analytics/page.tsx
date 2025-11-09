'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'files', label: 'All Files' },
] as const;

type VisualizationType = 'table' | 'timeseries' | 'bar';

type AnalyticsReport = {
  id: string;
  name: string;
  metric: string;
  visualization: VisualizationType;
  columns: Array<{ name: string; type?: string }>;
  rows: Array<Record<string, unknown>>;
  sql?: string | null;
  params?: unknown[];
  createdAt: string;
};

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('dashboard');
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError(null);
    try {
      const response = await fetch('/api/admin/analytics/reports');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch saved reports');
      }

      setReports(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      setReportsError(error instanceof Error ? error.message : 'Failed to fetch saved reports');
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'files') {
      void fetchReports();
    }
  }, [activeTab, fetchReports]);

  useEffect(() => {
    if (reports.length === 0) {
      setSelectedReportId(null);
      return;
    }

    if (selectedReportId && reports.some((report) => report.id === selectedReportId)) {
      return;
    }
  }, [reports, selectedReportId]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) ?? null,
    [reports, selectedReportId]
  );

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
            <Card>
              <CardHeader className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <div>
                  <CardTitle>All Files</CardTitle>
                  <p className="text-sm text-slate-500">
                    Saved analytics tables from the Quick Metrics assistant.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedReportId(null);
                    setExportStatus(null);
                    void fetchReports();
                  }}
                  disabled={reportsLoading}
                >
                  {reportsLoading ? 'Refreshing…' : 'Refresh'}
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                {reportsLoading && reports.length === 0 && (
                  <p className="text-sm text-slate-500">Loading saved reports…</p>
                )}

                {reportsError && (
                  <p className="text-sm text-red-600">
                    Failed to load saved reports: {reportsError}
                  </p>
                )}

                {!reportsLoading && !reportsError && reports.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No analytics files yet. Save a table from the Quick Metrics assistant to see it
                    here.
                  </p>
                )}

                {reports.length > 0 && (
                  <div className="flex flex-col gap-6 lg:flex-row">
                    <div className="grid w-full grid-cols-1 gap-3 lg:w-[320px]">
                      {reports.map((report) => {
                        const isSelected = selectedReportId === report.id;
                        const savedAt = new Date(report.createdAt).toLocaleString();
                        return (
                          <div
                            key={report.id}
                            className={`rounded-lg border px-4 py-3 transition ${
                              isSelected
                                ? 'border-slate-900 bg-slate-900/5 text-slate-900'
                                : 'border-slate-200 text-slate-700'
                            }`}
                          >
                            <p className="text-sm font-semibold text-slate-900">{report.name}</p>
                            <p className="text-xs text-slate-500">Saved {savedAt}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    setExportStatus(null);
                                    setExporting(true);
                                    const response = await fetch(
                                      `/api/admin/analytics/reports/${report.id}/export`
                                    );
                                    if (!response.ok) {
                                      throw new Error('Failed to export report');
                                    }
                                    const blob = await response.blob();
                                    const url = URL.createObjectURL(blob);
                                    const anchor = document.createElement('a');
                                    anchor.href = url;
                                    anchor.download = `${report.name.replace(/[^a-z0-9]+/gi, '-') || 'analytics-report'}.csv`;
                                    document.body.appendChild(anchor);
                                    anchor.click();
                                    document.body.removeChild(anchor);
                                    URL.revokeObjectURL(url);
                                    setExportStatus({ type: 'success', message: 'CSV downloaded' });
                                  } catch (error) {
                                    setExportStatus({
                                      type: 'error',
                                      message: error instanceof Error ? error.message : 'Export failed',
                                    });
                                  } finally {
                                    setExporting(false);
                                  }
                                }}
                                disabled={exporting}
                              >
                                {exporting ? 'Export…' : 'Export CSV'}
                              </Button>
                              <Button
                                type="button"
                                variant={isSelected ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedReportId(null);
                                  } else {
                                    setSelectedReportId(report.id);
                                  }
                                  setExportStatus(null);
                                }}
                              >
                                {isSelected ? 'Stop Preview' : 'Preview'}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex-1 space-y-4">
                      {selectedReport ? (
                        <>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h3 className="text-lg font-semibold text-slate-900">{selectedReport.name}</h3>
                              <p className="text-xs text-slate-500">
                                Saved {new Date(selectedReport.createdAt).toLocaleString()}
                              </p>
                            </div>
                            {exportStatus && (
                              <span
                                className={`text-xs ${
                                  exportStatus.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                                }`}
                              >
                                {exportStatus.message}
                              </span>
                            )}
                          </div>

                          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                              <thead className="bg-slate-50">
                                <tr>
                                  {selectedReport.columns.map((column) => (
                                    <th
                                      key={column.name}
                                      className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600"
                                    >
                                      {column.name}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {selectedReport.rows.map((row, rowIdx) => (
                                  <tr key={rowIdx}>
                                    {selectedReport.columns.map((column) => (
                                      <td key={column.name} className="px-4 py-2 text-slate-700">
                                        {formatCellValue(row[column.name as keyof typeof row], column.name)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </section>
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
    if (/^\d+$/.test(value) && lowerColumn.includes('revenue')) {
      return formatCurrency(Number(value));
    }
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatCellValue(item)).join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

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
