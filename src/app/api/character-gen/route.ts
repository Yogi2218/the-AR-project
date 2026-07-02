import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { runFullPipeline } from '@/lib/ai/tripo';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';

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
    // reset window
    rateLimitMap.set(ip, { count: 1, timestamp: now });
    return true;
  }
  if (record.count >= LIMIT_COUNT) return false;
  record.count += 1;
  return true;
}

// 30-day cleanup check (runs at most once per hour in the background)
let lastCleanupTime = 0;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

function runCleanupIfNeeded() {
  const now = Date.now();
  if (now - lastCleanupTime < CLEANUP_INTERVAL_MS) return;
  lastCleanupTime = now;

  Promise.resolve().then(() => {
    try {
      const baseDir = path.resolve(process.cwd(), 'public', 'models', 'ai-generated');
      if (!fs.existsSync(baseDir)) return;

      const uuids = fs.readdirSync(baseDir);
      const limitDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

      for (const uuid of uuids) {
        const dirPath = path.join(baseDir, uuid);
        if (fs.existsSync(dirPath)) {
          const stats = fs.statSync(dirPath);
          if (stats.isDirectory() && stats.mtime < limitDate) {
            const savedFile = path.join(dirPath, '.saved');
            if (!fs.existsSync(savedFile)) {
              console.log(`[Cleanup] Deleting unsaved asset directory: ${uuid}`);
              fs.rmSync(dirPath, { recursive: true, force: true });
            }
          }
        }
      }
    } catch (err) {
      console.error('[Cleanup] Error in background cleanup job:', err);
    }
  });
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 });
  }

  // Trigger background cleanup
  runCleanupIfNeeded();

  // Parse multipart form data
  const formData = await request.formData();
  const imageFile = formData.get('image') as File | null;
  const prompt = formData.get('prompt') as string | null;

  if (!imageFile && (!prompt || prompt.trim() === '')) {
    return NextResponse.json({ error: 'Either image or prompt must be provided.' }, { status: 400 });
  }

  const uuid = randomUUID();
  const outputDir = path.resolve(process.cwd(), 'public', 'models', 'ai-generated', uuid);
  fs.mkdirSync(outputDir, { recursive: true });

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

        sendEvent('status', { stage: 'downloading', message: 'Downloading final GLB...' });
        const glbResp = await fetch(finalModelUrl);
        if (!glbResp.ok) throw new Error('Failed to download GLB');
        const arrayBuffer = await glbResp.arrayBuffer();
        const glbPath = path.join(outputDir, 'model.glb');
        fs.writeFileSync(glbPath, Buffer.from(arrayBuffer));

        // Write placeholder metadata files
        const meta = {
          source: 'tripo',
          prompt: prompt || null,
          imageUploaded: !!imageFile,
          generatedAt: new Date().toISOString(),
          animationPresets: ['idle', 'walk', 'talk', 'gesture'],
        };
        fs.writeFileSync(path.join(outputDir, '.meta.json'), JSON.stringify(meta, null, 2));
        fs.writeFileSync(path.join(outputDir, '.expressions.json'), JSON.stringify({}), 'utf-8');
        fs.writeFileSync(path.join(outputDir, '.visemes.json'), JSON.stringify({}), 'utf-8');

        const publicBase = `/models/ai-generated/${uuid}`;
        sendEvent('complete', {
          uuid,
          modelUrl: `${publicBase}/model.glb`,
          metaUrl: `${publicBase}/.meta.json`,
          expressionsUrl: `${publicBase}/.expressions.json`,
          visemesUrl: `${publicBase}/.visemes.json`,
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
