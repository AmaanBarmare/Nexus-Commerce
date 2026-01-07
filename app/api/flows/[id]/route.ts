import { NextRequest, NextResponse } from 'next/server';
import { Prisma, FlowStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { FlowManifest } from '@/types/flow';
import { isAdminUser } from '@/lib/auth';

const FlowManifestSchema = z.object({
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
});

const UpdateSchema = z.object({
  manifest: FlowManifestSchema,
  status: z.nativeEnum(FlowStatus).optional(),
});

type Params = {
  params: { id: string };
};

export async function GET(_request: NextRequest, { params }: Params) {
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const flow = await prisma.flow.findUnique({
    where: { id: params.id },
    include: {
      nodes: true,
      edges: true,
    },
  });

  if (!flow) {
    return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
  }

  return NextResponse.json({
    flow: {
      id: flow.id,
      name: flow.name,
      status: flow.status,
      manifest: flow.manifest,
      nodes: flow.nodes,
      edges: flow.edges,
      createdAt: flow.createdAt,
      updatedAt: flow.updatedAt,
    },
  });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const json = await request.json();
    const { manifest, status } = UpdateSchema.parse(json);

    await prisma.$transaction(async (tx) => {
      await tx.flowNode.deleteMany({ where: { flowId: params.id } });
      await tx.flowEdge.deleteMany({ where: { flowId: params.id } });

      await tx.flow.update({
        where: { id: params.id },
        data: {
          name: manifest.name,
          manifest: manifest as unknown as Prisma.JsonObject,
          ...(status ? { status } : {}),
        },
      });

      if (manifest.nodes.length > 0) {
        await tx.flowNode.createMany({
          data: manifest.nodes.map((node) => ({
            id: node.id,
            flowId: params.id,
            type: node.type,
            label: node.label,
            data: (node.data ?? {}) as Prisma.JsonObject,
            position: node.position as unknown as Prisma.JsonObject,
          })),
        });
      }

      if (manifest.edges.length > 0) {
        await tx.flowEdge.createMany({
          data: manifest.edges.map((edge) => ({
            id: edge.id,
            flowId: params.id,
            sourceId: edge.sourceId,
            targetId: edge.targetId,
            label: edge.label,
          })),
        });
      }
    });

    const updated = await prisma.flow.findUniqueOrThrow({
      where: { id: params.id },
      include: {
        nodes: true,
        edges: true,
      },
    });

    return NextResponse.json({
      flow: {
        id: updated.id,
        name: updated.name,
        status: updated.status,
        manifest: updated.manifest as FlowManifest,
        nodes: updated.nodes,
        edges: updated.edges,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('[flows.update] failed', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update flow',
      },
      { status: 400 }
    );
  }
}

