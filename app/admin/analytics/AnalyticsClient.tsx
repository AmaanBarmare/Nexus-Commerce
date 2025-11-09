'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ChartCardProps } from '@/components/analytics/ChartCard';
import type { AnalyticsChart, AnalyticsReport, VisualizationType } from '@/lib/analytics/types';

const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'files', label: 'All Files' },
] as const;

type ChartStatus = { type: 'success' | 'error'; message: string; reportId?: string };

type MetricsResult = {
  id: string;
  metric: string;
  visualization: VisualizationType;
  sql: string;
  params: Array<string | number | boolean | null>;
  columns: Array<{ name: string; type?: string }>;
  rows: Array<Record<string, unknown>>;
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
  data?: MetricsResult;
};

const ChartCard = dynamic<ChartCardProps>(() => import('@/components/analytics/ChartCard'), {
  ssr: false,
});

function normalizeReport(raw: any): AnalyticsReport {
  const columns = Array.isArray(raw?.columns) ? raw.columns : [];
  const rows = Array.isArray(raw?.rows) ? raw.rows : [];
  return {
    id: raw.id,
    name: raw.name,
    metric: raw.metric,
    visualization: raw.visualization ?? 'table',
    columns,
    rows,
    sql: raw.sql ?? null,
    params: raw.params ?? [],
    createdAt: raw.createdAt,
  };
}

function normalizeChart(raw: any): AnalyticsChart {
  const config = raw.config ?? { series: [] };
  const series = Array.isArray(config.series) ? config.series : [];
  return {
    id: raw.id,
    name: raw.name,
    chartType: raw.chartType,
    config: {
      ...config,
      series,
    },
    createdAt: raw.createdAt,
    report: raw.report ? normalizeReport(raw.report) : undefined,
  };
}

export default function AnalyticsClientPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('dashboard');
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [convertingReportId, setConvertingReportId] = useState<string | null>(null);
  const [chartStatus, setChartStatus] = useState<ChartStatus | null>(null);
  const [charts, setCharts] = useState<AnalyticsChart[]>([]);
  const [chartsLoading, setChartsLoading] = useState(false);
  const [chartsError, setChartsError] = useState<string | null>(null);
  const [deletingChartId, setDeletingChartId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError(null);
    try {
      const response = await fetch('/api/admin/analytics/reports');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch saved reports');
      }

      const data = Array.isArray(result.data)
        ? (result.data as any[]).map(normalizeReport)
        : [];
      setReports(data);
    } catch (error) {
      setReportsError(error instanceof Error ? error.message : 'Failed to fetch saved reports');
    } finally {
      setReportsLoading(false);
    }
  }, []);

  const handleDeleteChart = useCallback(async (chartId: string) => {
    setChartsError(null);
    setDeletingChartId(chartId);
    try {
      const response = await fetch(`/api/admin/analytics/charts/${chartId}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete chart');
      }

      setCharts((previous) => previous.filter((chart) => chart.id !== chartId));
    } catch (error) {
      setChartsError(error instanceof Error ? error.message : 'Failed to delete chart');
    } finally {
      setDeletingChartId(null);
    }
  }, []);

  const fetchCharts = useCallback(async () => {
    setChartsLoading(true);
    setChartsError(null);
    try {
      const response = await fetch('/api/admin/analytics/charts');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch charts');
      }

      const data = Array.isArray(result.data)
        ? (result.data as any[]).map(normalizeChart)
        : [];
      setCharts(data);
    } catch (error) {
      setChartsError(error instanceof Error ? error.message : 'Failed to fetch charts');
    } finally {
      setChartsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'files') {
      void fetchReports();
    }
  }, [activeTab, fetchReports]);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      void fetchCharts();
    }
  }, [activeTab, fetchCharts]);

  useEffect(() => {
    void fetchCharts();
  }, [fetchCharts]);

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
            <div className="space-y-6">
              {chartsLoading && charts.length === 0 && (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-slate-500">
                    Loading charts…
                  </CardContent>
                </Card>
              )}

              {chartsError && (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-red-600">
                    Failed to load charts: {chartsError}
                  </CardContent>
                </Card>
              )}

              {!chartsLoading && !chartsError && charts.length === 0 && (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-slate-500">
                    No charts yet. Convert a saved table into a chart from the All Files tab.
                  </CardContent>
                </Card>
              )}

              {charts.map((chart) => (
                <ChartCard
                  key={chart.id}
                  chart={chart}
                  onDelete={() => handleDeleteChart(chart.id)}
                  deleting={deletingChartId === chart.id}
                />
              ))}
            </div>
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
                    setChartStatus(null);
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
                                  setChartStatus(null);
                                }}
                              >
                                {isSelected ? 'Stop Preview' : 'Preview'}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    setChartStatus(null);
                                    setConvertingReportId(report.id);
                                    const response = await fetch(
                                      `/api/admin/analytics/reports/${report.id}/convert`,
                                      { method: 'POST' }
                                    );
                                    const result = await response.json();
                                    if (!response.ok || !result.success) {
                                      throw new Error(result.error || 'Failed to generate chart');
                                    }
                                    setChartStatus({
                                      type: 'success',
                                      message: 'Chart created and added to dashboard.',
                                      reportId: report.id,
                                    });
                                    await fetchCharts();
                                  } catch (error) {
                                    setChartStatus({
                                      type: 'error',
                                      message: error instanceof Error ? error.message : 'Chart conversion failed',
                                      reportId: report.id,
                                    });
                                  } finally {
                                    setConvertingReportId(null);
                                  }
                                }}
                                disabled={convertingReportId === report.id}
                              >
                                {convertingReportId === report.id ? 'Converting…' : 'Convert to Chart'}
                              </Button>
                            </div>
                            {chartStatus && chartStatus.reportId === report.id && (
                              <p
                                className={`mt-2 text-xs ${
                                  chartStatus.type === 'success' ? 'text-emerald-600' : 'text-red-600'
                                }`}
                              >
                                {chartStatus.message}
                              </p>
                            )}
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
                  {data.columns.map((column) => (
                    <td key={column.name} className="px-3 py-2">
                      {formatCellValue(row[column.name], column.name)}
                    </td>
                  ))}
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


