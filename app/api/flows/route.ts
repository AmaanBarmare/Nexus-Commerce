import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { FlowStatus, PrismaClient } from '@prisma/client';
import { isAdminUser } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Admin-only: flows API is used by the admin UI
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const statusParam = request.nextUrl.searchParams.get('status');
  const includeParam = request.nextUrl.searchParams.get('include');
  const includeEmails = includeParam?.split(',').includes('emails');

  let statusFilter: FlowStatus | undefined;

  if (statusParam) {
    if (statusParam === 'ACTIVE' || statusParam === 'DRAFT' || statusParam === 'DISABLED') {
      statusFilter = statusParam;
    } else {
      return NextResponse.json(
        { error: 'Invalid status filter provided.' },
        { status: 400 }
      );
    }
  }

  const db =
    prisma && (prisma as any).flow
      ? prisma
      : new PrismaClient();

  const flows = await db.flow.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      manifest: includeEmails ? true : false,
    },
  });

  let emailSummaries: Array<{
    flowId: string;
    flowName: string;
    nodeId: string;
    nodeLabel: string;
    templateId?: string;
    templateName?: string;
    emailType?: string;
    updatedAt?: string;
  }> | undefined;

  if (includeEmails) {
    const templateIds = new Set<string>();
    const emails: typeof emailSummaries = [];

    for (const flow of flows) {
      const manifest = (flow as any).manifest as any;
      if (!manifest?.nodes) continue;

      const emailNodes = manifest.nodes.filter(
        (node: any) => node?.type === 'action' && node?.data?.action === 'send_email'
      );

      for (const node of emailNodes) {
        const templateId =
          typeof node?.data?.templateId === 'string' ? node.data.templateId : undefined;
        if (templateId) {
          templateIds.add(templateId);
        }
        emails.push({
          flowId: flow.id,
          flowName: flow.name,
          nodeId: node.id,
          nodeLabel: node.label ?? 'Email',
          templateId,
          emailType: typeof node?.data?.emailType === 'string' ? node.data.emailType : undefined,
        });
      }
    }

    if (emails.length > 0) {
      const templates = await db.emailTemplate.findMany({
        where: templateIds.size
          ? { id: { in: Array.from(templateIds) } }
          : undefined,
        select: {
          id: true,
          name: true,
          updatedAt: true,
        },
      });
      const templateMap = new Map(templates.map((tpl) => [tpl.id, tpl]));

      emailSummaries = emails.map((email) => {
        const template = email.templateId ? templateMap.get(email.templateId) : undefined;
        return {
          ...email,
          templateName: template?.name,
          updatedAt: template?.updatedAt ? template.updatedAt.toISOString() : undefined,
        };
      });
    } else {
      emailSummaries = [];
    }
  }

  return NextResponse.json({
    flows: flows.map(({ manifest, ...flow }) => ({
      ...flow,
      createdAt: flow.createdAt.toISOString(),
      updatedAt: flow.updatedAt.toISOString(),
    })),
    emails: emailSummaries,
  });
}

