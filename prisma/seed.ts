import { PrismaClient, AlyraProductType, AlyraProductStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create order sequence if it doesn't exist
  await prisma.$executeRawUnsafe(`
    CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;
  `);
  console.log('✅ Order sequence created');

  // Create Alyra products
  const alyraProducts = [
    // Refills
    {
      name: 'Ecos de Lisboa Refill',
      sku: 'ALY-EDL-REF',
      type: AlyraProductType.Refill,
      status: AlyraProductStatus.Active,
      inventory: 100,
    },
    {
      name: 'Riva Azul Refill',
      sku: 'ALY-RAZ-REF',
      type: AlyraProductType.Refill,
      status: AlyraProductStatus.Active,
      inventory: 100,
    },
    {
      name: 'Fruit d\'Amour Refill',
      sku: 'ALY-FDA-REF',
      type: AlyraProductType.Refill,
      status: AlyraProductStatus.Active,
      inventory: 93,
    },
    // Sets - Black Cases
    {
      name: 'Ecos de Lisboa Set (Black Case)',
      sku: 'ALY-EDL-CASE-BLK',
      type: AlyraProductType.Set,
      status: AlyraProductStatus.Active,
      inventory: 400,
    },
    {
      name: 'Riva Azul Set (Black Case)',
      sku: 'ALY-RAZ-CASE-BLK',
      type: AlyraProductType.Set,
      status: AlyraProductStatus.Active,
      inventory: 400,
    },
    {
      name: 'Fruit d\'Amour Set (Black Case)',
      sku: 'ALY-FDA-CASE-BLK',
      type: AlyraProductType.Set,
      status: AlyraProductStatus.Active,
      inventory: 399,
    },
    // Sets - White Cases
    {
      name: 'Ecos de Lisboa Set (White Case)',
      sku: 'ALY-EDL-CASE-WHT',
      type: AlyraProductType.Set,
      status: AlyraProductStatus.Active,
      inventory: 399,
    },
    {
      name: 'Riva Azul Set (White Case)',
      sku: 'ALY-RAZ-CASE-WHT',
      type: AlyraProductType.Set,
      status: AlyraProductStatus.Active,
      inventory: 399,
    },
    {
      name: 'Fruit d\'Amour Set (White Case)',
      sku: 'ALY-FDA-CASE-WHT',
      type: AlyraProductType.Set,
      status: AlyraProductStatus.Active,
      inventory: 399,
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

