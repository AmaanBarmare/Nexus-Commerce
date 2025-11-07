import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateEmail, type GenerateEmailOptions } from '@/lib/ai/generateEmail';
import { FlowSpecSchema } from '@/lib/schemas/marketing';
import { prisma } from '@/lib/db';
import { validateJsonResponse } from '@/lib/ai/json';

/**
 * API endpoint for AI marketing assistant
 * Handles chat requests and routes to appropriate handlers
 */

const AssistantRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  intent: z
    .enum(['generate_email', 'create_flow', 'query_metrics', 'general'])
    .optional(),
  context: z
    .object({
      email_type: z.string().optional(),
      event: z.string().optional(),
      customer_segment: z.string().optional(),
      product_info: z.string().optional(),
    })
    .optional(),
});

/**
 * Compute simple metrics from database
 */
async function queryMetrics(query: string): Promise<any> {
  const queryLower = query.toLowerCase();

  // Average Order Value
  if (queryLower.includes('average order value') || queryLower.includes('aov')) {
    const result = await prisma.order.aggregate({
      where: {
        paymentStatus: 'paid',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      _avg: {
        totalMinor: true,
      },
      _count: true,
    });

    return {
      metric: 'average_order_value',
      value: result._avg.totalMinor ? result._avg.totalMinor / 100 : 0,
      currency: 'INR',
      period: 'last_30_days',
      orderCount: result._count,
    };
  }

  // Top buyers
  if (queryLower.includes('top buyer') || queryLower.includes('top customer')) {
    const topCustomers = await prisma.order.groupBy({
      by: ['customerId', 'email'],
      where: {
        paymentStatus: 'paid',
        customerId: { not: null },
      },
      _sum: {
        totalMinor: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          totalMinor: 'desc',
        },
      },
      take: 10,
    });

    return {
      metric: 'top_buyers',
      customers: topCustomers.map((c) => ({
        email: c.email,
        totalSpent: c._sum.totalMinor ? c._sum.totalMinor / 100 : 0,
        orderCount: c._count.id,
      })),
    };
  }

  // Total revenue
  if (queryLower.includes('revenue') || queryLower.includes('total sales')) {
    const result = await prisma.order.aggregate({
      where: {
        paymentStatus: 'paid',
      },
      _sum: {
        totalMinor: true,
      },
      _count: true,
    });

    return {
      metric: 'total_revenue',
      value: result._sum.totalMinor ? result._sum.totalMinor / 100 : 0,
      currency: 'INR',
      orderCount: result._count,
    };
  }

  return {
    error: 'Unknown metric query',
    availableMetrics: ['average_order_value', 'top_buyers', 'total_revenue'],
  };
}

/**
 * Create a marketing flow from user request
 */
async function createFlow(message: string, context?: any): Promise<any> {
  // For now, return a basic flow structure
  // In a full implementation, this would use AI to parse the flow requirements
  return {
    name: 'Auto-generated Flow',
    description: message,
    trigger: {
      event: context?.event || 'order_placed',
      conditions: {},
    },
    steps: [
      {
        type: 'send_email',
        config: {},
      },
    ],
    active: false, // Require manual activation
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, intent, context } = validateJsonResponse(
      body,
      AssistantRequestSchema
    );

    // Determine intent from message if not provided
    let detectedIntent = intent;
    if (!detectedIntent) {
      const messageLower = message.toLowerCase();
      if (
        messageLower.includes('email') ||
        messageLower.includes('send') ||
        messageLower.includes('template')
      ) {
        detectedIntent = 'generate_email';
      } else if (
        messageLower.includes('flow') ||
        messageLower.includes('automation') ||
        messageLower.includes('when')
      ) {
        detectedIntent = 'create_flow';
      } else if (
        messageLower.includes('average') ||
        messageLower.includes('metric') ||
        messageLower.includes('revenue') ||
        messageLower.includes('buyer')
      ) {
        detectedIntent = 'query_metrics';
      } else {
        detectedIntent = 'general';
      }
    }

    // Route to appropriate handler
    switch (detectedIntent) {
      case 'generate_email': {
        const options: GenerateEmailOptions = {
          intent: 'generate_email',
          context: context || {},
          userMessage: message,
        };

        const result = await generateEmail(options);

        // Optionally save template to database
        const template = await prisma.emailTemplate.create({
          data: {
            name: `Generated: ${result.subject}`,
            subject: result.subject,
            manifest: result.manifest as any,
          },
        });

        return NextResponse.json({
          intent: 'generate_email',
          success: true,
          data: {
            templateId: template.id,
            subject: result.subject,
            manifest: result.manifest,
          },
        });
      }

      case 'create_flow': {
        const flowData = await createFlow(message, context);

        // Validate flow spec
        const flowSpec = validateJsonResponse(flowData, FlowSpecSchema);

        // Save to database
        const flow = await prisma.marketingFlow.create({
          data: {
            name: flowData.name,
            description: flowData.description,
            trigger: flowSpec.trigger as any,
            steps: flowSpec.steps as any,
            active: flowData.active,
          },
        });

        return NextResponse.json({
          intent: 'create_flow',
          success: true,
          data: {
            flowId: flow.id,
            flow: {
              id: flow.id,
              name: flow.name,
              description: flow.description,
              trigger: flow.trigger,
              steps: flow.steps,
              active: flow.active,
            },
          },
        });
      }

      case 'query_metrics': {
        const metrics = await queryMetrics(message);

        return NextResponse.json({
          intent: 'query_metrics',
          success: true,
          data: metrics,
        });
      }

      default:
        return NextResponse.json(
          {
            intent: 'general',
            success: false,
            error: 'Intent not recognized. Please specify: generate_email, create_flow, or query_metrics',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('AI Assistant error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

