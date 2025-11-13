import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { compileMjml } from '@/lib/emails/compileMjml';

const UpdateSchema = z.object({
  mjml: z.string().min(1, 'MJML content is required'),
  meta: z.record(z.any()).optional(),
});

type ParamsPromise = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: ParamsPromise) {
  const { id } = await context.params;
  const template = await prisma.emailTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: template.id,
    name: template.name,
    mjml: template.mjml,
    html: template.html,
    meta: template.meta,
    updatedAt: template.updatedAt,
  });
}

export async function PUT(request: NextRequest, context: ParamsPromise) {
  const { id } = await context.params;
  try {
    const json = await request.json();
    const { mjml, meta } = UpdateSchema.parse(json);

    const html = await compileMjml(mjml);

    const updated = await prisma.emailTemplate.update({
      where: { id },
      data: {
        mjml,
        html,
        meta: meta ?? {},
      },
    });

    return NextResponse.json({
      id: updated.id,
      mjml: updated.mjml,
      html: updated.html,
      meta: updated.meta,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('[templates.update] failed', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update template',
      },
      { status: 400 }
    );
  }
}

