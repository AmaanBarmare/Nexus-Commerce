-- CreateTable
CREATE TABLE "order_counter" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "counter" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_counter_pkey" PRIMARY KEY ("id")
);
