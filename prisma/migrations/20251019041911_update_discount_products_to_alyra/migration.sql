-- DropForeignKey
ALTER TABLE "public"."DiscountProduct" DROP CONSTRAINT "DiscountProduct_productId_fkey";

-- AddForeignKey
ALTER TABLE "DiscountProduct" ADD CONSTRAINT "DiscountProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AlyraProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
