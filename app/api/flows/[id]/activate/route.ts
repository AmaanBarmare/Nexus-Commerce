import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { validateFlow } from '@/lib/flows/validate';
import { isAdminUser } from '@/lib/auth';

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
    if (!body.confirmed) {
      return NextResponse.json(
        { error: 'Activation requires explicit confirmation.' },
        { status: 400 }
      );
    }

    const flow = await prisma.flow.findUnique({
      where: { id: params.id },
    });

    if (!flow) {
      return NextResponse.json({ error: 'Flow not found' }, { status: 404 });
    }

    const validation = validateFlow(flow.manifest as any);

    if (!validation.ok) {
      return NextResponse.json(
        {
          ok: false,
          issues: validation.issues,
        },
        { status: 400 }
      );
    }

    const updated = await prisma.flow.update({
      where: { id: params.id },
      data: {
        status: 'ACTIVE',
      },
      include: {
        nodes: true,
        edges: true,
      },
    });

    return NextResponse.json({
      ok: true,
      flow: {
        id: updated.id,
        name: updated.name,
        status: updated.status,
        manifest: updated.manifest,
        nodes: updated.nodes,
        edges: updated.edges,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('[flows.activate] failed', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to activate flow',
      },
      { status: 400 }
    );
  }
}

