-- CreateTable
CREATE TABLE "AnalyticsChart" (
    "id" TEXT NOT NULL,
    "reportId" TEXT,
    "name" TEXT NOT NULL,
    "chartType" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsChart_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AnalyticsChart_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "AnalyticsReport"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AnalyticsChart_createdAt_idx" ON "AnalyticsChart"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsChart_reportId_idx" ON "AnalyticsChart"("reportId");
