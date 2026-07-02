import { NextResponse } from 'next/server';
import { runFullPipeline } from '@/lib/ai/tripo';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

// Simple in‑memory rate limiter (per IP)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const LIMIT_COUNT = 5; // max concurrent generations per IP
const WINDOW_MS = 60 * 1000; // 1 minute window

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return true;
  }
  if (now - record.timestamp > WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return true;
  }
  if (record.count >= LIMIT_COUNT) return false;
  record.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
  }

  // Parse multipart form data
  const formData = await request.formData();
  const imageFile = formData.get('image') as File | null;
  const prompt = formData.get('prompt') as string | null;

  if (!imageFile && (!prompt || prompt.trim() === '')) {
    return NextResponse.json({ error: 'Either image or prompt must be provided.' }, { status: 400 });
  }

  const uuid = crypto.randomUUID();

  // Stream SSE events to the client for live progress reporting
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const sendEvent = (event: string, data: any) => {
        const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      try {
        sendEvent('status', { stage: 'generating', message: 'Generating base model...' });
        const finalModelUrl = await runFullPipeline({
          image: imageFile ?? undefined,
          prompt: prompt ?? undefined,
        });

        sendEvent('complete', {
          uuid,
          modelUrl: finalModelUrl,
          metaUrl: '',
          expressionsUrl: '',
          visemesUrl: '',
        });
        controller.close();
      } catch (err: any) {
        sendEvent('error', { message: err.message || 'Unknown error' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
