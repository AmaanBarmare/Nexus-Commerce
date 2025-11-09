export type VisualizationType = 'table' | 'timeseries' | 'bar' | 'pie';
export type ChartType = 'bar' | 'line' | 'pie';

export type ReportColumn = {
  name: string;
  type?: string;
};

export type AnalyticsReport = {
  id: string;
  name: string;
  metric: string;
  visualization: VisualizationType;
  columns: ReportColumn[];
  rows: Array<Record<string, unknown>>;
  sql?: string | null;
  params?: unknown[];
  createdAt: string;
};

export type AnalyticsChart = {
  id: string;
  name: string;
  chartType: ChartType;
  config: {
    xKey?: string;
    series: Array<{ key: string; label: string }>;
  };
  createdAt: string;
  report?: AnalyticsReport;
};
