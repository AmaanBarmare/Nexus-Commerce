import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { compileMjml } from '@/lib/emails/compileMjml';
import { isAdminUser } from '@/lib/auth';

const UpdateSchema = z.object({
  mjml: z.string().min(1, 'MJML content is required'),
  meta: z.record(z.any()).optional(),
});

type ParamsPromise = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: ParamsPromise) {
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const template = await prisma.emailTemplate.findUnique({
    where: { id },
  });

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  let { html } = template;
  const meta = template.meta as Record<string, unknown> | null;

  if ((!html || meta?.needsCompilation) && template.mjml) {
    try {
      html = await compileMjml(template.mjml);
      const updatedMeta = { ...(meta ?? {}), needsCompilation: undefined };
      delete updatedMeta.needsCompilation;
      await prisma.emailTemplate.update({
        where: { id },
        data: { html, meta: updatedMeta },
      });
    } catch (err) {
      console.warn(`[templates.get] Lazy MJML compilation failed for ${id}`, err);
    }
  }

  return NextResponse.json({
    id: template.id,
    name: template.name,
    mjml: template.mjml,
    html,
    meta: template.meta,
    updatedAt: template.updatedAt,
  });
}

export async function PUT(request: NextRequest, context: ParamsPromise) {
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

