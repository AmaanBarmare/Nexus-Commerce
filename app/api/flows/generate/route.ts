import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { openai, GENERATION_MODEL } from '@/lib/ai/client';
import { compileMjml } from '@/lib/emails/compileMjml';
import { prisma } from '@/lib/db';
import { isAdminUser } from '@/lib/auth';
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

Provide starter MJML templates for each email node with the field emailType.
- For transactional emails, closely follow the “Order confirmation” MJML layout example below: keep the same structure, spacing, hierarchy, and typographic scale, and always include the Alyra logo image from "/brand/ALYRABLACK.png" at both the top and bottom of the email.
- For marketing emails, you may vary the layout, but you must include a legally compliant footer with an unsubscribe link, and they must be clearly non-transactional.
Transactional templates must be non-promotional and must not contain unsubscribe text.

Return strict JSON only:

{ "manifest": { ... }, "templates": [ { "name": "...", "emailType":"marketing|transactional", "mjml": "<mjml>...</mjml>" } ] }

Do not include any commentary.

Examples it should learn:

“When a customer places an order, send a confirmation email.” → trigger: order_created → action: send_email (transactional) and no subscription condition.

“If no order in 30 days, send a winback discount.” → add condition: days_since_last_order >= 30, and auto condition: marketingSubscribed === true before the email.

Order confirmation MJML layout example for transactional emails (follow this structure and styling for transactional emails, adapting only the copy and variable placeholders to the specific use case; always use the Alyra logo at top and bottom via src="/brand/ALYRABLACK.png"):

<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Helvetica, Arial, sans-serif" color="#111111" />
      <mj-text font-size="14px" line-height="1.45" />
    </mj-attributes>

    <mj-style inline="inline">
      .card { max-width: 560px; margin: 0 auto; }
      .h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.2px; }
      .sectionTitle { font-size: 15px; font-weight: 700; margin-top: 6px; }
      .muted { color: #666666; }
      .divider { border-top: 1px solid #e6e6e6; }
      .btn-outline a {
        border: 1px solid #111111 !important;
        border-radius: 6px !important;
        background: transparent !important;
        color: #111111 !important;
        font-weight: 700;
      }
      .small { font-size: 12px; }
      .price { text-align: right; white-space: nowrap; }
      .itemTitle { font-weight: 700; }
      .itemMeta { color: #666666; font-size: 12px; }
      .totalsLabel { color: #666666; }
      .totalPaid { font-size: 18px; font-weight: 800; }
      .footerLinks a { color: #111111 !important; text-decoration: underline; }
    </mj-style>
  </mj-head>

  <mj-body background-color="#ffffff">
    <mj-section padding="0">
      <mj-column css-class="card" padding="24px 18px">

        <!-- TOP LOGO -->
        <mj-image
          src="/brand/ALYRABLACK.png"
          alt="ALYRA"
          width="64px"
          padding="0 0 12px"
        />

        <!-- HEADLINE -->
        <mj-text css-class="h1">We’ve got it!</mj-text>
        <mj-text>Hi {{customerName}}.</mj-text>

        <!-- CONFIRMATION COPY -->
        <mj-text padding="10px 0">
          Thanks for your order! We’ll let you know when it’s on its way to you.
        </mj-text>

        <!-- ORDER INFO -->
        <mj-text>
          <span class="muted">Order number:</span>
          <strong>{{orderNumber}}</strong><br/>
          <span class="muted">We’ll email you when your order ships.</span>
        </mj-text>

        <mj-divider css-class="divider" padding="16px 0" />

        <!-- ADDRESS -->
        <mj-text css-class="sectionTitle">Collection address</mj-text>
        <mj-text css-class="small">
          {{#each shippingAddress.lines}}
            {{this}}<br/>
          {{/each}}
        </mj-text>

        <mj-text css-class="sectionTitle" padding="12px 0 4px">Delivery type</mj-text>
        <mj-text css-class="small">Standard Delivery</mj-text>

        <mj-divider css-class="divider" padding="16px 0" />

        <!-- ITEMS -->
        <mj-text css-class="sectionTitle">Your items in this order</mj-text>

        {{#each items}}
        <mj-section padding="8px 0">
          <mj-column width="65%">
            <mj-text css-class="itemTitle">{{title}}</mj-text>
            {{#if variant}}<mj-text css-class="itemMeta">{{variant}}</mj-text>{{/if}}
            {{#if sku}}<mj-text css-class="itemMeta">SKU: {{sku}}</mj-text>{{/if}}
            <mj-text css-class="itemMeta">Qty: {{qty}}</mj-text>
          </mj-column>
          <mj-column width="35%">
            <mj-text css-class="price"><strong>{{lineTotal.text}}</strong></mj-text>
          </mj-column>
        </mj-section>
        {{/each}}

        <mj-divider css-class="divider" padding="12px 0" />

        <!-- TOTALS -->
        {{#each totals.rows}}
        <mj-section padding="2px 0">
          <mj-column width="70%">
            <mj-text class="totalsLabel">{{label}}</mj-text>
          </mj-column>
          <mj-column width="30%">
            <mj-text class="price">{{amount.text}}</mj-text>
          </mj-column>
        </mj-section>
        {{/each}}

        <mj-section padding="8px 0">
          <mj-column width="70%">
            <mj-text class="totalPaid">Total paid</mj-text>
          </mj-column>
          <mj-column width="30%">
            <mj-text class="totalPaid price">{{totals.totalPaid.text}}</mj-text>
          </mj-column>
        </mj-section>

        <mj-divider css-class="divider" padding="16px 0" />

        <!-- PAYMENT -->
        <mj-text css-class="sectionTitle">Payment methods</mj-text>
        <mj-text css-class="small">Paid online via Razorpay</mj-text>

        <mj-text css-class="sectionTitle" padding="12px 0 4px">Billing address</mj-text>
        <mj-text css-class="small">
          {{#each billingAddress.lines}}
            {{this}}<br/>
          {{/each}}
        </mj-text>

        <mj-divider css-class="divider" padding="18px 0" />

        <!-- BUTTONS -->
        <mj-text css-class="sectionTitle">Any other questions?</mj-text>
        <mj-text css-class="small muted">For everything else you may need to know</mj-text>

        <mj-button css-class="btn-outline" href="https://www.alyra.in/shipping">DELIVERY</mj-button>
        <mj-button css-class="btn-outline" href="https://www.alyra.in">ORDER</mj-button>
        <mj-button css-class="btn-outline" href="https://www.alyra.in/returns">RETURNS</mj-button>
        <mj-button css-class="btn-outline" href="https://www.alyra.in/privacy">VIEW FAQS</mj-button>

        <!-- SIGN OFF -->
        <mj-text padding="18px 0">
          Thanks for shopping with us.<br/>
          <strong>TEAM ALYRA</strong>
        </mj-text>

        <!-- BOTTOM LOGO -->
        <mj-image
          src="/brand/ALYRABLACK.png"
          alt="ALYRA"
          width="64px"
          padding="6px 0 0"
        />

        <!-- FOOTER -->
        <mj-text css-class="small footerLinks" align="center" padding="18px 0 6px">
          <a href="https://www.alyra.in">Refer a Friend</a> |
          <a href="https://www.alyra.in/terms">T&Cs</a> |
          <a href="https://www.alyra.in/privacy">Privacy policy</a>
        </mj-text>

        <mj-text css-class="small muted" align="center">
          B-609 Reena Complex, Vidyavihar, Ghatkopar West, Mumbai 400086, Maharashtra
        </mj-text>

      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`.trim();

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
  const isAdmin = await isAdminUser();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

