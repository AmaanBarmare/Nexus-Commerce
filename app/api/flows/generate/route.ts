import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { openai, GENERATION_MODEL } from '@/lib/ai/client';
import { compileMjml } from '@/lib/emails/compileMjml';
import { prisma } from '@/lib/db';
import {
  EmailType,
  FlowManifest,
  FlowManifestEdge,
  FlowManifestNode,
} from '@/types/flow';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  context: z.any().optional(),
});

type AssistantResponse = {
  manifest: FlowManifest;
  templates: Array<{
    name: string;
    emailType: EmailType;
    mjml: string;
  }>;
};

const ASSISTANT_SYSTEM_PROMPT = `You are a flow designer for Alyra’s marketing automation.

Input: a natural-language prompt.

Output:

A Flow Manifest JSON with nodes[] and edges[]. Valid node types: trigger, action, condition, delay.

For each action where data.action === "send_email", classify it as either:

transactional (order confirmation, password reset, shipping updates), or

marketing (promotions, newsletters, winbacks, launches).

If an email is marketing, insert a condition node immediately before it that filters recipients to marketingSubscribed === true.

Provide starter MJML templates for each email node with the field emailType. Use Alyra’s dark theme (#0E0E0E background), elegant serif headings, and legally compliant footer with unsubscribe for marketing. Transactional templates must be non-promotional and must not contain unsubscribe text.

Return strict JSON only:

{ "manifest": { ... }, "templates": [ { "name": "...", "emailType":"marketing|transactional", "mjml": "<mjml>...</mjml>" } ] }

Do not include any commentary.

Examples it should learn:

“When a customer places an order, send a confirmation email.” → trigger: order_created → action: send_email (transactional) and no subscription condition.

“If no order in 30 days, send a winback discount.” → add condition: days_since_last_order >= 30, and auto condition: marketingSubscribed === true before the email.`.trim();

const FLOW_RESPONSE_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'flow_generation_response',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['manifest', 'templates'],
      properties: {
        manifest: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'nodes', 'edges'],
          properties: {
            name: { type: 'string' },
            nodes: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'type', 'label', 'position'],
                additionalProperties: true,
                properties: {
                  id: { type: 'string' },
                  type: {
                    type: 'string',
                    enum: ['trigger', 'action', 'condition', 'delay'],
                  },
                  label: { type: 'string' },
                  position: {
                    type: 'object',
                    required: ['x', 'y'],
                    additionalProperties: false,
                    properties: {
                      x: { type: 'number' },
                      y: { type: 'number' },
                    },
                  },
                  config: { type: ['object', 'null'] },
                  data: { type: ['object', 'null'] },
                },
              },
            },
            edges: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'sourceId', 'targetId'],
                additionalProperties: false,
                properties: {
                  id: { type: 'string' },
                  sourceId: { type: 'string' },
                  targetId: { type: 'string' },
                  label: { type: ['string', 'null'] },
                },
              },
            },
          },
        },
        templates: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'emailType', 'mjml'],
            additionalProperties: false,
            properties: {
              name: { type: 'string' },
              emailType: { type: 'string', enum: ['marketing', 'transactional'] },
              mjml: { type: 'string' },
            },
          },
        },
      },
    },
  },
} as const;

function ensureDefaultPositions(manifest: FlowManifest) {
  for (const node of manifest.nodes) {
    if (!node.position) {
      node.position = { x: 0, y: 0 };
    }
  }
}

function findDirectParents(manifest: FlowManifest, nodeId: string) {
  return manifest.edges.filter((edge) => edge.targetId === nodeId);
}

function isConsentCondition(node: FlowManifestNode | undefined) {
  if (!node) return false;
  if (node.type !== 'condition') return false;
  const label = node.label.toLowerCase();
  const dataString = JSON.stringify(node.data ?? {}).toLowerCase();
  return (
    label.includes('marketing') ||
    label.includes('consent') ||
    dataString.includes('marketing_subscribed') ||
    dataString.includes('marketingsubscribed') ||
    dataString.includes('email subscribers') ||
    (node.data && node.data['system'] === 'marketing_consent') ||
    (node.data && node.data['locked'] === true)
  );
}

function createConsentNode(emailNode: FlowManifestNode): FlowManifestNode {
  return {
    id: `${emailNode.id}-consent`,
    type: 'condition',
    label: 'Requires consent',
    position: {
      x: (emailNode.position?.x ?? 0) - 200,
      y: emailNode.position?.y ?? 0,
    },
    data: {
      locked: true,
      field: 'marketingSubscribed',
      operator: 'equals',
      value: true,
    },
    config: {
      field: 'marketingSubscribed',
      operator: 'equals',
      value: true,
    },
  };
}

function ensureMarketingConsent(manifest: FlowManifest) {
  const nodesById = new Map(manifest.nodes.map((node) => [node.id, node]));

  for (const node of manifest.nodes) {
    if (node.type !== 'action' || node.data?.action !== 'send_email') {
      continue;
    }

    if (node.data?.emailType !== 'marketing') {
      continue;
    }

    const parents = findDirectParents(manifest, node.id);
    const hasConsentParent = parents.some((edge) => isConsentCondition(nodesById.get(edge.sourceId)));

    if (hasConsentParent) {
      continue;
    }

    const consentNode = createConsentNode(node);
    manifest.nodes.push(consentNode);
    nodesById.set(consentNode.id, consentNode);

    // Rewire incoming edges to pass through consent node
    for (const edge of manifest.edges) {
      if (edge.targetId === node.id) {
        edge.targetId = consentNode.id;
      }
    }

    const consentEdge: FlowManifestEdge = {
      id: randomUUID(),
      sourceId: consentNode.id,
      targetId: node.id,
      label: 'Requires consent',
    };

    manifest.edges.push(consentEdge);
  }
}

const LAYOUT_COLUMNS: Array<FlowManifestNode['type'] | 'other'> = [
  'trigger',
  'condition',
  'delay',
  'action',
  'other',
];

function requiresFallbackLayout(manifest: FlowManifest) {
  const seen = new Map<string, number>();
  let hasDuplicate = false;

  for (const node of manifest.nodes) {
    const key = `${Math.round(node.position?.x ?? 0)}:${Math.round(node.position?.y ?? 0)}`;
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count > 1) {
      hasDuplicate = true;
      break;
    }
  }

  const hasMissing = manifest.nodes.some(
    (node) => !node.position || Number.isNaN(node.position.x) || Number.isNaN(node.position.y)
  );

  return hasDuplicate || hasMissing;
}

function applyFallbackLayout(manifest: FlowManifest) {
  if (!requiresFallbackLayout(manifest)) {
    return;
  }

  const columns = new Map<string, FlowManifestNode[]>();
  for (const key of LAYOUT_COLUMNS) {
    columns.set(key, []);
  }

  for (const node of manifest.nodes) {
    const columnKey = LAYOUT_COLUMNS.includes(node.type) ? node.type : 'other';
    const bucket = columns.get(columnKey) ?? columns.get('other')!;
    bucket.push(node);
  }

  const X_GAP = 280;
  const Y_GAP = 180;

  LAYOUT_COLUMNS.forEach((columnKey, columnIndex) => {
    const bucket = columns.get(columnKey);
    if (!bucket || bucket.length === 0) {
      return;
    }
    bucket.forEach((node, rowIndex) => {
      node.position = {
        x: columnIndex * X_GAP,
        y: rowIndex * Y_GAP,
      };
    });
  });
}

function remapManifestIdentifiers(manifest: FlowManifest): FlowManifest {
  const nodeIdMap = new Map<string, string>();
  const nodes = manifest.nodes.map((node) => {
    const newId = randomUUID();
    nodeIdMap.set(node.id, newId);
    return {
      ...node,
      id: newId,
    };
  });

  const edges = manifest.edges.map((edge) => ({
    ...edge,
    id: randomUUID(),
    sourceId: nodeIdMap.get(edge.sourceId) ?? edge.sourceId,
    targetId: nodeIdMap.get(edge.targetId) ?? edge.targetId,
  }));

  return {
    ...manifest,
    nodes,
    edges,
  };
}

function assignTemplateIds(
  manifest: FlowManifest,
  templateIds: string[],
  emailTypes: EmailType[]
) {
  const emailNodes = manifest.nodes.filter(
    (node) => node.type === 'action' && node.data?.action === 'send_email'
  );

  if (emailNodes.length !== templateIds.length) {
    const mappedCount = Math.min(emailNodes.length, templateIds.length);
    console.warn(
      `[flows.generate] Template/email mismatch. Mapping ${mappedCount} templates across ${emailNodes.length} email nodes.`
    );

    emailNodes.slice(mappedCount).forEach((node) => {
      node.data = {
        ...(node.data ?? {}),
        templateId: node.data?.templateId,
      };
    });

    emailNodes.splice(mappedCount);
    templateIds.splice(mappedCount);
    emailTypes.splice(mappedCount);
  }

  emailNodes.forEach((node, index) => {
    node.data = {
      ...node.data,
      templateId: templateIds[index],
      emailType: node.data?.emailType ?? emailTypes[index],
    };
  });
}

function pruneInvalidEdges(manifest: FlowManifest) {
  const originalCount = manifest.edges.length;
  manifest.edges = manifest.edges.filter(
    (edge) => edge.sourceId && edge.targetId
  );

  if (manifest.edges.length !== originalCount) {
    console.warn(
      `[flows.generate] Removed ${originalCount - manifest.edges.length} edge(s) missing endpoints from manifest.`
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { prompt } = RequestSchema.parse(json);

    const completion = await openai.chat.completions.create({
      model: GENERATION_MODEL,
      messages: [
        { role: 'system', content: ASSISTANT_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 1,
      response_format: FLOW_RESPONSE_SCHEMA,
    });

    const content = completion.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new Error('Assistant did not return any content');
    }

    let parsed: AssistantResponse;
    try {
      parsed = JSON.parse(content) as AssistantResponse;
    } catch (error) {
      throw new Error(`Failed to parse assistant response JSON: ${(error as Error).message}`);
    }

    ensureDefaultPositions(parsed.manifest);
    ensureMarketingConsent(parsed.manifest);
    applyFallbackLayout(parsed.manifest);
    pruneInvalidEdges(parsed.manifest);

    const emailNodesInManifest = parsed.manifest.nodes.filter(
      (node) => node.type === 'action' && node.data?.action === 'send_email'
    );

    if (parsed.templates.length > emailNodesInManifest.length) {
      console.warn(
        `[flows.generate] Trimming ${parsed.templates.length - emailNodesInManifest.length} extra template(s) from assistant response.`
      );
      parsed.templates = parsed.templates.slice(0, emailNodesInManifest.length);
    }

    if (emailNodesInManifest.length > parsed.templates.length) {
      console.warn(
        `[flows.generate] Assistant returned ${parsed.templates.length} template(s) for ${emailNodesInManifest.length} email node(s). Some nodes will remain without templates.`
      );
    }

    const templatesForCreation = parsed.templates.slice(0, emailNodesInManifest.length);

    const templateRecords = await Promise.all(
      templatesForCreation.map(async (template) => {
        const html = await compileMjml(template.mjml);
        return prisma.emailTemplate.create({
          data: {
            name: template.name,
            mjml: template.mjml,
            html,
            meta: {
              emailType: template.emailType,
              theme: {
                background: '#0E0E0E',
              },
            } as Prisma.JsonObject,
          },
        });
      })
    );

    const templateIds = templateRecords.map((record) => record.id);
    const templateTypes = templatesForCreation.map((template) => template.emailType);
    assignTemplateIds(parsed.manifest, templateIds, templateTypes);

    const remappedManifest = remapManifestIdentifiers(parsed.manifest);

    const flow = await prisma.flow.create({
      data: {
        name: parsed.manifest.name,
        manifest: remappedManifest as unknown as Prisma.JsonObject,
        nodes: {
          create: remappedManifest.nodes.map((node) => ({
            id: node.id,
            type: node.type,
            label: node.label,
            data: (node.data ?? {}) as Prisma.JsonObject,
            position: node.position as unknown as Prisma.JsonObject,
          })),
        },
        edges: {
          create: remappedManifest.edges.map((edge) => ({
            id: edge.id,
            sourceId: edge.sourceId,
            targetId: edge.targetId,
            label: edge.label,
          })),
        },
      },
      include: {
        nodes: true,
        edges: true,
      },
    });

    const templatesResponse = templateRecords.map((template, index) => {
      const emailType =
        templateTypes[index] ??
        (typeof template.meta === 'object' && template.meta && 'emailType' in template.meta
          ? (template.meta as { emailType?: EmailType }).emailType ?? 'transactional'
          : 'transactional');

      return {
        id: template.id,
        name: template.name,
        emailType,
        mjml: template.mjml,
        html: template.html,
        meta: template.meta,
      };
    });

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
      templates: templatesResponse,
    });
  } catch (error) {
    console.error('[flows.generate] failed', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate flow',
      },
      { status: 500 }
    );
  }
}

