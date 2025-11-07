'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
} from 'recharts';

const gradientId = 'revenueGradient';

function RevenueTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
        <p className="text-xs font-medium text-slate-500">{item.payload.date}</p>
        <p className="text-sm font-semibold text-slate-900">₹{(item.value as number).toLocaleString()}</p>
      </div>
    );
  }
  return null;
}

interface RevenueLineChartProps {
  data: Array<{ date: string; revenue: number }>;
}

export function RevenueLineChart({ data }: RevenueLineChartProps) {
  const hasData = data.some((item) => item.revenue > 0);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.05} />
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
          tickFormatter={(value) => `₹${Number(value).toLocaleString()}`}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#64748b', fontSize: 12 }}
        />
        <Tooltip content={<RevenueTooltip />} cursor={{ stroke: '#94a3b8', strokeDasharray: '4 4' }} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="none"
          fill={`url(#${gradientId})`}
          fillOpacity={1}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#0ea5e9"
          strokeWidth={3}
          dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }}
          activeDot={{ r: 6, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }}
        />
        {!hasData && (
          <text x="50%" y="50%" textAnchor="middle" fill="#94a3b8" fontSize={14}>
            No revenue recorded in this period
          </text>
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

