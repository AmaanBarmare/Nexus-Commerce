import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { validateFlow } from '@/lib/flows/validate';
import { FlowManifest } from '@/types/flow';
import { isAdminUser } from '@/lib/auth';

const ManifestSchema = z
  .object({
    name: z.string(),
    nodes: z.array(
      z.object({
        id: z.string(),
        type: z.enum(['trigger', 'action', 'condition', 'delay']),
        label: z.string(),
        position: z.object({
          x: z.number(),
          y: z.number(),
        }),
        config: z.record(z.any()).nullable().optional(),
        data: z.record(z.any()).nullable().optional(),
      })
    ),
    edges: z.array(
      z.object({
        id: z.string(),
        sourceId: z.string(),
        targetId: z.string(),
        label: z.string().nullable().optional(),
      })
    ),
  })
  .optional();

type Params = {
  params: { id: string };
};

export async function POST(request: NextRequest, { params }: Params) {
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const manifestInput = ManifestSchema.parse(body.manifest);

    let manifest: FlowManifest;

    if (manifestInput) {
      manifest = manifestInput as FlowManifest;
    } else {
      const flow = await prisma.flow.findUnique({
        where: { id: params.id },
      });

      if (!flow) {
        return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
      }

      manifest = flow.manifest as FlowManifest;
    }

    const result = validateFlow(manifest);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[flows.validate] failed', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to validate flow',
      },
      { status: 400 }
    );
  }
}

