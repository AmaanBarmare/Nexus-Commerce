'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const gradientId = 'ordersGradient';

function OrdersTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
        <p className="text-xs font-medium text-slate-500">{item.payload.date}</p>
        <p className="text-sm font-semibold text-slate-900">{item.value} orders</p>
      </div>
    );
  }
  return null;
}

interface OrdersBarChartProps {
  data: Array<{ date: string; count: number }>;
}

export function OrdersBarChart({ data }: OrdersBarChartProps) {
  const hasData = data.some((item) => item.count > 0);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f172a" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#2563eb" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
        />
        <Tooltip cursor={{ fill: 'rgba(15, 23, 42, 0.08)' }} content={<OrdersTooltip />} />
        <Bar
          dataKey="count"
          fill={`url(#${gradientId})`}
          radius={[12, 12, 12, 12]}
          maxBarSize={48}
        />
        {!hasData && (
          <text x="50%" y="50%" textAnchor="middle" fill="#94a3b8" fontSize={14}>
            No orders recorded this week
          </text>
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

