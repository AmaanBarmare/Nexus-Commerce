import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IndianRupee, ShoppingBag, Sparkles } from 'lucide-react';
import { formatMoney } from '@/lib/util';
import { OrdersBarChart } from '@/components/charts/orders-bar-chart';
import { RevenueLineChart } from '@/components/charts/revenue-line-chart';


async function getDashboardData() {
  // Cache for 60 seconds to improve performance
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Today's orders
  const todayOrders = await prisma.order.count({
    where: {
      createdAt: { gte: today },
      status: { not: 'cancelled' },
    },
  });

  // Today's revenue
  const todayRevenue = await prisma.order.aggregate({
    where: {
      createdAt: { gte: today },
      paymentStatus: 'paid',
    },
    _sum: { totalMinor: true },
  });

  // Average order value (last 30 days)
  const recentOrders = await prisma.order.aggregate({
    where: {
      createdAt: { gte: thirtyDaysAgo },
      paymentStatus: 'paid',
    },
    _avg: { totalMinor: true },
    _count: true,
  });

  // Orders by day (last 7 days)
  const ordersByDay = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
    SELECT DATE("createdAt") as date, COUNT(*) as count
    FROM "Order"
    WHERE "createdAt" >= ${sevenDaysAgo}
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `;

  // Revenue by day (last 30 days)
  const revenueByDay = await prisma.$queryRaw<Array<{ date: Date; revenue: bigint }>>`
    SELECT DATE("createdAt") as date, SUM("totalMinor") as revenue
    FROM "Order"
    WHERE "createdAt" >= ${thirtyDaysAgo} AND "paymentStatus" = 'paid'
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `;

  return {
    todayOrders,
    todayRevenue: todayRevenue._sum.totalMinor || 0,
    avgOrderValue: recentOrders._avg.totalMinor || 0,
    totalOrders: recentOrders._count,
    ordersByDay: ordersByDay.map((row) => ({
      date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: Number(row.count),
    })),
    revenueByDay: revenueByDay.map((row) => ({
      date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: Number(row.revenue) / 100,
    })),
  };
}

export default async function AdminDashboard() {
  const data = await getDashboardData();

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-white px-6 py-6 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Overview</h1>
        <p className="mt-1 text-sm text-slate-500">Snapshot of orders, revenue, and customer momentum.</p>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="overflow-hidden border-none bg-gradient-to-br from-amber-100 via-white to-amber-50 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-amber-900/80">Today&apos;s Orders</CardTitle>
            <div className="rounded-full bg-amber-500/20 p-2 text-amber-600">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-amber-900">{data.todayOrders}</p>
            <p className="mt-2 text-xs uppercase tracking-wider text-amber-800/70">since midnight</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none bg-gradient-to-br from-sky-100 via-white to-sky-50 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-sky-900/80">Today&apos;s Revenue</CardTitle>
            <div className="rounded-full bg-sky-500/20 p-2 text-sky-600">
              <IndianRupee className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-sky-900">{formatMoney(data.todayRevenue)}</p>
            <p className="mt-2 text-xs uppercase tracking-wider text-sky-800/70">paid orders only</p>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-none bg-gradient-to-br from-emerald-100 via-white to-emerald-50 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-900/80">Average Order Value</CardTitle>
            <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-600">
              <IndianRupee className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold text-emerald-900">{formatMoney(Math.floor(data.avgOrderValue))}</p>
            <p className="mt-2 text-xs uppercase tracking-wider text-emerald-800/70">rolling 30 days</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-slate-800">Orders • last 7 days</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <OrdersBarChart data={data.ordersByDay} />
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold text-slate-800">Revenue • last 30 days</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <RevenueLineChart data={data.revenueByDay} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

