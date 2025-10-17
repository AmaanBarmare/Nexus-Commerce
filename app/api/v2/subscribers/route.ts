import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withCors, preflight } from '@/lib/cors';
import { subscriberSchema } from '@/lib/zod-schemas';

export async function OPTIONS() {
  return preflight();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = subscriberSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400, headers: withCors() }
      );
    }

    const { email, name, source } = validation.data;

    // Upsert subscriber
    await prisma.subscriber.upsert({
      where: { email },
      create: {
        email,
        name,
        source,
        status: 'subscribed',
      },
      update: {
        status: 'subscribed',
        name: name || undefined,
        source: source || undefined,
      },
    });

    return NextResponse.json(
      { success: true, message: 'Successfully subscribed!' },
      { headers: withCors() }
    );
  } catch (error) {
    console.error('Error subscribing:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500, headers: withCors() }
    );
  }
}

