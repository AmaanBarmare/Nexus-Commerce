/*
  Warnings:

  - You are about to drop the column `acceptsEmail` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `EmailTemplate` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "acceptsEmail",
ADD COLUMN     "bounced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "complained" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "marketing_subscribed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketing_subscribed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EmailTemplate" DROP COLUMN "createdAt";
