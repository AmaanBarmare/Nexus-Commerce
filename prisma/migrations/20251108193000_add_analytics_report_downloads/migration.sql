-- CreateTable
CREATE TABLE "AnalyticsReportDownload" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsReportDownload_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AnalyticsReportDownload_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "AnalyticsReport"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "AnalyticsReportDownload_reportId_createdAt_idx" ON "AnalyticsReportDownload"("reportId", "createdAt");
