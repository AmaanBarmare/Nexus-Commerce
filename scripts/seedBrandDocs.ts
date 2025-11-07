import 'dotenv/config';
import { prisma } from '@/lib/db';
import { storeBrandDocument } from '@/lib/ai/embeddings';

type SeedDocument = {
  title: string;
  content: string;
  category: string;
};

const documents: SeedDocument[] = [
  {
    title: 'Alyra Brand Story',
    category: 'brand_story',
    content: `
Alyra was created to redefine parfum. Where traditional fragrances fade, we imagined a solid parfum in refillable cases, designed to be kept, not discarded.

From the hidden gardens of Paris to the blue horizons of the Mediterranean, each Alyra parfum captures moments that live beyond time.

Fruit d’Amour carries the sweetness of first encounters.
Riva Azul holds the calm of ocean air after the storm has passed.
Ecos de Lisboa is the echo of silence in a city of light, a memory that lingers long after the night ends.
    `.trim(),
  },
  {
    title: 'Alyra Philosophy & Mission',
    category: 'philosophy',
    content: `
True luxury whispers. It is timeless, sustainable, and crafted to endure.

Alyra solid parfum are made to keep, built on three pillars:

1. Permanence through refillable design.
2. Sustainable parfum luxury without waste.
3. Artisanal craftsmanship shaped by hand.

"Our mission is to create fragrances that honor the past while embracing the future — where every scent tells a story worth remembering, and every case becomes an heirloom worth treasuring."

— The Alyra Promise
    `.trim(),
  },
  {
    title: 'The Alyra Ritual',
    category: 'ritual',
    content: `
Slide open. Warm with fingertips. Press to pulse points — wrists, neck, collarbone.

When it's gone, replace only the refill. Keep the case. Keep the ritual.

Made to Keep — Weighted metal cases, designed for life.
Refill Forever — Swap scents in seconds.
By Hand — Small-batch, poured by hand.
Close to Skin — Solid parfum melts in, wears longer.
    `.trim(),
  },
  {
    title: 'Fruit d’Amour — Notes & Story',
    category: 'product',
    content: `
A fragrance born of passion and memory. Ripe berries melt into the air with a delicate brightness of mandarin, while saffron warms the heart and rose blooms with quiet intensity.

Jasmine and ylang-ylang bring light to the shadows, softened by vanilla sweetness.

In the depths, oud and sandalwood entwine with amber and musk, leaving a trail that clings to skin like a secret never spoken.

Top Notes: Red Berries, Mandarin, Saffron
Heart Notes: Rose, Ylang-Ylang, Vanilla
Base Notes: Oud, Amber, Musk
    `.trim(),
  },
  {
    title: 'Riva Azul — Notes & Story',
    category: 'product',
    content: `
The calm after the storm, the horizon stretching endlessly blue.

Citrus bursts open with bergamot and mandarin, a spark of pink pepper catching the salt air.

Jasmine sambac unfurls with sensual depth, lavender whispers serenity, and a marine accord drifts like waves against the shore.

Anchored in cedarwood and sandalwood, with ambergris and musk leaving a lingering embrace — it is both refreshing and profound.

Top Notes: Pepper, Mandarin, Bergamot
Heart Notes: Jasmine, Lavender
Base Notes: Cedarwood, Sandalwood
    `.trim(),
  },
  {
    title: 'Ecos de Lisboa — Notes & Story',
    category: 'product',
    content: `
An echo of stone streets kissed by twilight.

Citrus and herbs awaken the senses with bergamot, grapefruit, sage, and lavender — carrying the freshness of a city alive with history.

In its heart, rosemary and cypress breathe green vitality, warmed by nutmeg spice.

The foundation is deep and grounding: oakmoss, sandalwood, and vetiver woven together, with tonka bean leaving a soft, lasting sweetness.

Top Notes: Grapefruit, Sage, Bergamot
Heart Notes: Nutmeg, Cypress, Rosemary
Base Notes: Sandalwood, Tonka Bean, Oakmoss
    `.trim(),
  },
  {
    title: 'Alyra Brand Voice',
    category: 'brand_voice',
    content: `
Alyra speaks in poetic minimalism — elegant, sensory, and emotionally resonant.

Every line is tactile and visual, evoking scent through imagery.

Avoid exclamation marks, excess adjectives, or marketing clichés.

Use language that feels human, intimate, and cinematic — as if written in candlelight.
    `.trim(),
  },
];

async function seed() {
  console.log('Seeding Alyra brand documents...');

  for (const doc of documents) {
    const existing = await prisma.brandDocument.findFirst({
      where: { title: doc.title },
      select: { id: true },
    });

    if (existing) {
      console.log(`Skipping "${doc.title}" (already exists)`);
      continue;
    }

    console.log(`Creating "${doc.title}"...`);
    await storeBrandDocument({
      title: doc.title,
      content: doc.content,
      category: doc.category,
    });
  }

  console.log('Seeding complete.');
}

seed()
  .catch((error) => {
    console.error('Failed to seed brand documents:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

