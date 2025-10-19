-- CreateEnum
CREATE TYPE "DiscountScope" AS ENUM ('PRODUCT', 'ORDER');

-- AlterTable
ALTER TABLE "Discount" ADD COLUMN     "scope" "DiscountScope" NOT NULL DEFAULT 'ORDER';
