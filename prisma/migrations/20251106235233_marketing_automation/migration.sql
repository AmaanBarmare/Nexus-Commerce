/*
  Warnings:

  - The values [in_transit,failed] on the enum `DeliveryStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [partial] on the enum `FulfillmentStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DeliveryStatus_new" AS ENUM ('pending', 'shipped', 'delivered');
ALTER TABLE "public"."Order" ALTER COLUMN "deliveryStatus" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "deliveryStatus" TYPE "DeliveryStatus_new" USING ("deliveryStatus"::text::"DeliveryStatus_new");
ALTER TYPE "DeliveryStatus" RENAME TO "DeliveryStatus_old";
ALTER TYPE "DeliveryStatus_new" RENAME TO "DeliveryStatus";
DROP TYPE "public"."DeliveryStatus_old";
ALTER TABLE "Order" ALTER COLUMN "deliveryStatus" SET DEFAULT 'pending';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "FulfillmentStatus_new" AS ENUM ('unfulfilled', 'fulfilled', 'returned');
ALTER TABLE "public"."Order" ALTER COLUMN "fulfillmentStatus" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "fulfillmentStatus" TYPE "FulfillmentStatus_new" USING ("fulfillmentStatus"::text::"FulfillmentStatus_new");
ALTER TYPE "FulfillmentStatus" RENAME TO "FulfillmentStatus_old";
ALTER TYPE "FulfillmentStatus_new" RENAME TO "FulfillmentStatus";
DROP TYPE "public"."FulfillmentStatus_old";
ALTER TABLE "Order" ALTER COLUMN "fulfillmentStatus" SET DEFAULT 'unfulfilled';
COMMIT;

-- DropIndex
DROP INDEX "public"."BrandDocument_embedding_idx";
