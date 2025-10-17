import { PrismaClient } from '@prisma/client';

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
      type: 'Refill',
      status: 'Active',
      inventory: 100,
    },
    {
      name: 'Riva Azul Refill',
      sku: 'ALY-RAZ-REF',
      type: 'Refill',
      status: 'Active',
      inventory: 100,
    },
    {
      name: 'Fruit d\'Amour Refill',
      sku: 'ALY-FDA-REF',
      type: 'Refill',
      status: 'Active',
      inventory: 93,
    },
    // Sets - Black Cases
    {
      name: 'Ecos de Lisboa Set (Black Case)',
      sku: 'ALY-EDL-CASE-BLK',
      type: 'Set',
      status: 'Active',
      inventory: 400,
    },
    {
      name: 'Riva Azul Set (Black Case)',
      sku: 'ALY-RAZ-CASE-BLK',
      type: 'Set',
      status: 'Active',
      inventory: 400,
    },
    {
      name: 'Fruit d\'Amour Set (Black Case)',
      sku: 'ALY-FDA-CASE-BLK',
      type: 'Set',
      status: 'Active',
      inventory: 399,
    },
    // Sets - White Cases
    {
      name: 'Ecos de Lisboa Set (White Case)',
      sku: 'ALY-EDL-CASE-WHT',
      type: 'Set',
      status: 'Active',
      inventory: 399,
    },
    {
      name: 'Riva Azul Set (White Case)',
      sku: 'ALY-RAZ-CASE-WHT',
      type: 'Set',
      status: 'Active',
      inventory: 399,
    },
    {
      name: 'Fruit d\'Amour Set (White Case)',
      sku: 'ALY-FDA-CASE-WHT',
      type: 'Set',
      status: 'Active',
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

  // Create sample discounts
  await prisma.discount.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      type: 'percent',
      value: 10,
      active: true,
      minSubtotalMinor: 50000, // ₹500 minimum
    },
  });

  await prisma.discount.upsert({
    where: { code: 'SAVE500' },
    update: {},
    create: {
      code: 'SAVE500',
      type: 'fixed',
      value: 50000, // ₹500 off
      active: true,
      minSubtotalMinor: 200000, // ₹2000 minimum
    },
  });

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

