import { PrismaClient, AlyraProductType, AlyraProductStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Order counter will be initialized automatically when first order is created
  console.log('✅ Order counter system ready');

  // Update existing products with default prices
  const allProducts = await prisma.alyraProduct.findMany();
  
  for (const product of allProducts) {
    if ((product as any).priceMinor === 0) {
      const defaultPrice = product.type === AlyraProductType.Refill ? 124900 : 184900;
      await prisma.alyraProduct.update({
        where: { id: product.id },
        data: { priceMinor: defaultPrice } as any,
      });
    }
  }
  console.log('✅ Updated existing products with default prices');

  // Create Alyra products
  const alyraProducts = [
    // Refills
    {
      name: 'Ecos de Lisboa Refill',
      sku: 'ALY-EDL-REF',
      type: AlyraProductType.Refill,
      status: AlyraProductStatus.Active,
      inventory: 100,
      priceMinor: 124900, // ₹1,249.00
    },
    {
      name: 'Riva Azul Refill',
      sku: 'ALY-RAZ-REF',
      type: AlyraProductType.Refill,
      status: AlyraProductStatus.Active,
      inventory: 100,
      priceMinor: 124900, // ₹1,249.00
    },
    {
      name: 'Fruit d\'Amour Refill',
      sku: 'ALY-FDA-REF',
      type: AlyraProductType.Refill,
      status: AlyraProductStatus.Active,
      inventory: 93,
      priceMinor: 124900, // ₹1,249.00
    },
    // Sets - Black Cases
    {
      name: 'Ecos de Lisboa Set (Black Case)',
      sku: 'ALY-EDL-CASE-BLK',
      type: AlyraProductType.Set,
      status: AlyraProductStatus.Active,
      inventory: 400,
      priceMinor: 184900, // ₹1,849.00
    },
    {
      name: 'Riva Azul Set (Black Case)',
      sku: 'ALY-RAZ-CASE-BLK',
      type: AlyraProductType.Set,
      status: AlyraProductStatus.Active,
      inventory: 400,
      priceMinor: 184900, // ₹1,849.00
    },
    {
      name: 'Fruit d\'Amour Set (Black Case)',
      sku: 'ALY-FDA-CASE-BLK',
      type: AlyraProductType.Set,
      status: AlyraProductStatus.Active,
      inventory: 399,
      priceMinor: 184900, // ₹1,849.00
    },
    // Sets - White Cases
    {
      name: 'Ecos de Lisboa Set (White Case)',
      sku: 'ALY-EDL-CASE-WHT',
      type: AlyraProductType.Set,
      status: AlyraProductStatus.Active,
      inventory: 399,
      priceMinor: 184900, // ₹1,849.00
    },
    {
      name: 'Riva Azul Set (White Case)',
      sku: 'ALY-RAZ-CASE-WHT',
      type: AlyraProductType.Set,
      status: AlyraProductStatus.Active,
      inventory: 399,
      priceMinor: 184900, // ₹1,849.00
    },
    {
      name: 'Fruit d\'Amour Set (White Case)',
      sku: 'ALY-FDA-CASE-WHT',
      type: AlyraProductType.Set,
      status: AlyraProductStatus.Active,
      inventory: 399,
      priceMinor: 184900, // ₹1,849.00
    },
  ];

  for (const product of alyraProducts) {
    await prisma.alyraProduct.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
  }
  console.log('✅ Alyra products created');

  // Discounts will be created through the admin interface

  console.log('✅ Seed completed successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

