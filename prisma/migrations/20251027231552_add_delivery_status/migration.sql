/*
  Warnings:

  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductVariant` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'shipped', 'in_transit', 'delivered', 'failed');

-- DropForeignKey
ALTER TABLE "public"."ProductVariant" DROP CONSTRAINT "ProductVariant_productId_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'pending';

-- DropTable
DROP TABLE "public"."Product";

-- DropTable
DROP TABLE "public"."ProductVariant";

-- DropEnum
DROP TYPE "public"."ProductStatus";
