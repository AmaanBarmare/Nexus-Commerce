import type { Prisma } from '@prisma/client';

export type ReportColumn = {
  name: string;
  type?: string | null;
};

export type ChartSeriesConfig = {
  key: string;
  label: string;
};

export type ChartConfig = {
  xKey?: string;
  series: ChartSeriesConfig[];
  valueKey?: string;
};

export type ChartSuggestion = {
  chartType: 'bar' | 'line' | 'pie';
  config: ChartConfig;
  name: string;
  description?: string;
};

const MAX_SERIES = 3;

function detectColumnType(
  column: ReportColumn,
  rows: Array<Record<string, unknown>>
): 'number' | 'date' | 'string' | 'other' {
  const declared = column.type?.toLowerCase();
  if (declared === 'number') return 'number';
  if (declared === 'date') return 'date';
  if (declared === 'string') return 'string';

  for (const row of rows) {
    const value = row[column.name];
    if (value === null || value === undefined) continue;
    if (typeof value === 'number') return 'number';
    if (value instanceof Date) return 'date';
    if (typeof value === 'string') {
      const numeric = Number(value);
      if (!Number.isNaN(numeric) && value.trim() !== '') {
        return 'number';
      }
      if (!Number.isNaN(Date.parse(value))) {
        return 'date';
      }
      return 'string';
    }
  }

  return 'other';
}

function pickColumns(
  columns: ReportColumn[],
  rows: Array<Record<string, unknown>>
) {
  const typed = columns.map((column) => ({
    column,
    kind: detectColumnType(column, rows),
  }));

  const dateColumns = typed.filter((entry) => entry.kind === 'date');
  const numericColumns = typed.filter((entry) => entry.kind === 'number');
  const stringColumns = typed.filter((entry) => entry.kind === 'string');

  return {
    dateColumns,
    numericColumns,
    stringColumns,
  };
}

function humanise(label: string): string {
  return label
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function inferChartFromReport(report: {
  name: string;
  columns: Prisma.JsonValue;
  rows: Prisma.JsonValue;
}): ChartSuggestion | null {
  const columns = Array.isArray(report.columns)
    ? (report.columns as ReportColumn[])
    : [];
  const rows = Array.isArray(report.rows)
    ? (report.rows as Array<Record<string, unknown>>)
    : [];

  if (!columns.length || !rows.length) {
    return null;
  }

  const { dateColumns, numericColumns, stringColumns } = pickColumns(columns, rows);

  if (numericColumns.length === 0) {
    return null;
  }

  if (dateColumns.length > 0) {
    const xColumn = dateColumns[0].column;
    const series = numericColumns.slice(0, MAX_SERIES).map((entry) => ({
      key: entry.column.name,
      label: humanise(entry.column.name),
    }));

    return {
      chartType: 'line',
      name: `${report.name} — Trend`,
      config: {
        xKey: xColumn.name,
        series,
      },
    };
  }

  if (stringColumns.length > 0) {
    const dimension = stringColumns[0].column;
    const series = numericColumns.slice(0, MAX_SERIES).map((entry) => ({
      key: entry.column.name,
      label: humanise(entry.column.name),
    }));

    const chartType = series.length === 1 && rows.length <= 12 ? 'pie' : 'bar';

    return {
      chartType,
      name: `${report.name} — ${chartType === 'pie' ? 'Share' : 'Breakdown'}`,
      config: {
        xKey: dimension.name,
        series,
      },
    };
  }

  // Fallback: use first numeric column and index as dimension
  const series = numericColumns.slice(0, MAX_SERIES).map((entry) => ({
    key: entry.column.name,
    label: humanise(entry.column.name),
  }));

  return {
    chartType: 'bar',
    name: `${report.name} — Distribution`,
    config: {
      xKey: undefined,
      series,
    },
  };
}
