import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Overview</h1>
        <p className="text-gray-500 mt-1">Welcome to your Alyra admin dashboard</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Today&apos;s Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.todayOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Today&apos;s Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatMoney(data.todayRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Avg Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatMoney(Math.floor(data.avgOrderValue))}</div>
            <p className="text-sm text-gray-500 mt-1">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Orders Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <OrdersBarChart data={data.ordersByDay} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueLineChart data={data.revenueByDay} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

