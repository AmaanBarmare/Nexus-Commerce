import Mustache from 'mustache';
import { prisma } from '@/lib/db';
import { FlowManifest } from '@/types/flow';

export type FlowRuntimeEvent = {
  type: string;
  payload: Record<string, unknown>;
  customer?: {
    id?: string;
    email?: string;
    marketingSubscribed?: boolean;
    bounced?: boolean;
    complained?: boolean;
    [key: string]: unknown;
  };
  context?: Record<string, unknown>;
};

type FlowExecutionContext = {
  marketingSubscribed: boolean;
  bounced: boolean;
  complained: boolean;
};

export async function evaluateFlow(flowId: string, event: FlowRuntimeEvent) {
  const flow = await prisma.flow.findUnique({
    where: { id: flowId },
  });

  if (!flow) {
    throw new Error(`Flow ${flowId} not found`);
  }

  const manifest = flow.manifest as FlowManifest;

  const executionContext: FlowExecutionContext = {
    marketingSubscribed:
      (event.customer?.marketingSubscribed ??
        (typeof event.context?.marketingSubscribed === 'boolean'
          ? (event.context?.marketingSubscribed as boolean)
          : false)),
    bounced: Boolean(event.customer?.bounced),
    complained: Boolean(event.customer?.complained),
  };

  if (executionContext.bounced || executionContext.complained) {
    console.info(
      `[flows] Suppressing all emails for ${event.customer?.email ?? 'unknown customer'} due to bounce/complaint flags.`
    );
    return;
  }

  for (const node of manifest.nodes) {
    if (node.type !== 'action' || node.data?.action !== 'send_email') {
      continue;
    }

    const emailType = node.data.emailType ?? 'transactional';

    if (emailType === 'marketing' && !executionContext.marketingSubscribed) {
      console.info(
        `[flows] Skipping marketing email ${node.id} because customer lacks marketing subscription.`
      );
      continue;
    }

    const templateId = node.data.templateId;
    if (!templateId) {
      console.warn(`[flows] Email node ${node.id} is missing templateId; skipping.`);
      continue;
    }

    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      console.warn(`[flows] Email template ${templateId} not found; skipping node ${node.id}.`);
      continue;
    }

    const renderedHtml = Mustache.render(template.html, {
      event: event.payload,
      customer: event.customer,
      context: event.context,
    });

    // Placeholder: queue email with provider integration
    console.info(
      `[flows] Queuing ${emailType} email for ${event.customer?.email ?? 'unknown'} using template ${
        template.id
      }.`
    );
    void renderedHtml; // avoid unused variable warning
  }
}

