'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { AnalyticsChart } from '@/lib/analytics/types';
import { Loader2, Trash2 } from 'lucide-react';

const CHART_COLORS = ['#2563eb', '#9333ea', '#f97316', '#16a34a', '#0ea5e9'];

export type ChartCardProps = {
  chart: AnalyticsChart;
  onDelete?: () => void;
  deleting?: boolean;
};

function prepareChartData(chart: AnalyticsChart) {
  const report = chart.report;
  if (!report) {
    return { data: [] as Array<Record<string, unknown>>, xKey: chart.config.xKey ?? '__index' };
  }

  const xKey = chart.config.xKey ?? '__index';

  const data = report.rows.map((row, index) => {
    const record: Record<string, unknown> = { ...row };
    if (!chart.config.xKey) {
      record.__index = `Row ${index + 1}`;
    } else if (record[xKey] === undefined) {
      record[xKey] = `Row ${index + 1}`;
    }

    chart.config.series.forEach((series) => {
      const value = record[series.key];
      if (typeof value === 'string') {
        const numeric = Number(value);
        if (!Number.isNaN(numeric)) {
          record[series.key] = numeric;
        }
      }
    });

    return record;
  });

  return { data, xKey };
}

function createPieData(data: Array<Record<string, unknown>>, chart: AnalyticsChart) {
  const series = chart.config.series[0];
  if (!series) {
    return [] as Array<{ label: string; value: number }>;
  }
  const xKey = chart.config.xKey ?? '__index';

  return data.map((row, index) => {
    const label = row[xKey] ?? `Row ${index + 1}`;
    const valueRaw = row[series.key];
    let value = 0;
    if (typeof valueRaw === 'number') {
      value = valueRaw;
    } else if (typeof valueRaw === 'string') {
      const numeric = Number(valueRaw);
      value = Number.isNaN(numeric) ? 0 : numeric;
    }

    return {
      label: String(label),
      value,
    };
  });
}

export default function ChartCard({ chart, onDelete, deleting }: ChartCardProps) {
  const report = chart.report;

  if (!report || !report.rows.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{chart.name}</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-sm text-slate-500">
          No data available for this chart.
        </CardContent>
      </Card>
    );
  }

  const { data, xKey } = prepareChartData(chart);
  const pieData = chart.chartType === 'pie' ? createPieData(data, chart) : [];

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{chart.name}</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-sm text-slate-500">
          Unable to render this chart.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{chart.name}</CardTitle>
          <p className="text-xs text-slate-500">
            Created {new Date(chart.createdAt).toLocaleString()}
          </p>
        </div>
        {onDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-red-600"
            onClick={onDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span className="sr-only">Remove chart</span>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="h-[360px]">
        {chart.chartType === 'bar' && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {chart.config.series.map((series, index) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  name={series.label}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}

        {chart.chartType === 'line' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {chart.config.series.map((series, index) => (
                <Line
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  name={series.label}
                  stroke={CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}

        {chart.chartType === 'pie' && chart.config.series.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`pie-segment-${entry.label}-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
