-- CreateEnum
CREATE TYPE "AlyraProductType" AS ENUM ('Refill', 'Set');

-- CreateEnum
CREATE TYPE "AlyraProductStatus" AS ENUM ('Active', 'Inactive');

-- CreateTable
CREATE TABLE "AlyraProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "type" "AlyraProductType" NOT NULL,
    "status" "AlyraProductStatus" NOT NULL DEFAULT 'Active',
    "inventory" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlyraProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlyraProduct_sku_key" ON "AlyraProduct"("sku");
