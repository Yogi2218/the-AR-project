import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────
// GET /api/model-proxy — Proxy and cache external GLB models
// ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    // Generate a unique cache filename based on the URL hash
    const hash = crypto.createHash('sha256').update(targetUrl).digest('hex');
    const cacheDir = path.resolve(process.cwd(), 'public', 'models', 'ai-generated');
    const cacheFilePath = path.join(cacheDir, `cache_${hash}.glb`);

    // Ensure the cache directory exists
    try {
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }
    } catch (dirErr: any) {
      console.warn('Cache directory creation skipped (possibly read-only filesystem):', dirErr.message);
    }

    // 1. Check if cached locally
    if (fs.existsSync(cacheFilePath)) {
      console.log(`[model-proxy] Cache hit: serving cached GLB for ${targetUrl}`);
      const fileBuffer = fs.readFileSync(cacheFilePath);
      return new Response(fileBuffer, {
        headers: {
          'Content-Type': 'model/gltf-binary',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // 2. Cache miss: fetch external GLB
    console.log(`[model-proxy] Cache miss: fetching ${targetUrl}`);
    const response = await fetch(targetUrl);
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch model from source: ${response.statusText}` },
        { status: response.status }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // 3. Try to write to cache asynchronously
    try {
      fs.writeFileSync(cacheFilePath, fileBuffer);
      console.log(`[model-proxy] Cached model successfully at ${cacheFilePath}`);
    } catch (writeErr: any) {
      console.warn('[model-proxy] Failed to write model to cache:', writeErr.message);
    }

    // 4. Stream model back to client
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'model/gltf-binary',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    console.error('[model-proxy] Server error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
