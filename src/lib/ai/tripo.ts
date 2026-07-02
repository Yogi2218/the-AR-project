// Tripo3D API wrapper (v2 OpenAPI) – uses the built-in fetch (Node 18+ / Next.js runtime)

export interface TripoGenerationParams {
  image?: File; // optional image file
  prompt?: string; // optional textual description
}

export type TripoTaskStatus =
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'unknown';

interface TripoTaskResponse {
  code: number;
  data: {
    task_id: string;
    status: TripoTaskStatus;
    result?: {
      model?: { url: string };
      base_model?: { url: string };
      pbr_model?: { url: string };
      model_url?: string; // Sometimes flattened
    };
    progress?: number;
  };
}

const TRIPO_BASE_URL = 'https://api.tripo3d.ai/v2/openapi';

function getApiKey(): string {
  const key = process.env.TRIPO_API_KEY;
  if (!key) {
    throw new Error('TRIPO_API_KEY is not set in environment');
  }
  return key;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
  };
}

/** Helper for exponential back‑off retries */
async function withRetry(fn: () => Promise<Response>, attempts = 3, delay = 500): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      await new Promise((r) => setTimeout(r, delay * Math.pow(2, i)));
    }
  }
  throw lastError;
}

// ─── Step 1: Upload Image (if needed) ────────────────────────────────────────

async function uploadImage(image: File): Promise<string> {
  // 1. Get upload URL
  const uploadTokenRes = await withRetry(() =>
    fetch(`${TRIPO_BASE_URL}/upload/image/token`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        filename: image.name || 'image.png',
        type: image.type || 'image/png',
      }),
    })
  );

  if (!uploadTokenRes.ok) {
    throw new Error(`Upload token failed: ${uploadTokenRes.status}`);
  }

  const { data: tokenData } = await uploadTokenRes.json();
  const { upload_url, image_token } = tokenData;

  // 2. PUT the image
  const uploadRes = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': image.type || 'image/png' },
    body: image,
  });

  if (!uploadRes.ok) {
    throw new Error(`Image upload failed: ${uploadRes.status}`);
  }

  return image_token;
}

// ─── Step 2: Generate base model ─────────────────────────────────────────────

export async function generateBaseModel(params: TripoGenerationParams): Promise<string> {
  let requestBody: any = {};

  if (params.image) {
    const imageToken = await uploadImage(params.image);
    requestBody = {
      type: 'image_to_model',
      file: {
        type: 'png',
        file_token: imageToken,
      },
    };
  } else if (params.prompt) {
    requestBody = {
      type: 'text_to_model',
      prompt: params.prompt,
    };
  } else {
    throw new Error('Must provide either image or prompt');
  }

  const response: Response = await withRetry(() =>
    fetch(`${TRIPO_BASE_URL}/task`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(requestBody),
    })
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tripo generate task failed: ${response.status} ${text}`);
  }

  const result = await response.json();
  if (result.code !== 0) throw new Error(`Tripo Error: ${JSON.stringify(result)}`);
  
  return result.data.task_id;
}

// ─── Step 3: Poll a task ─────────────────────────────────────────────────────

export async function pollTask(
  taskId: string,
  intervalMs = 2000,
  timeoutMs = 300_000
): Promise<TripoTaskResponse['data']> {
  const url = `${TRIPO_BASE_URL}/task/${taskId}`;
  const start = Date.now();

  while (true) {
    const resp: Response = await withRetry(() =>
      fetch(url, {
        method: 'GET',
        headers: authHeaders(),
      })
    );

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Polling task failed: ${resp.status} ${txt}`);
    }

    const json = (await resp.json()) as TripoTaskResponse;

    if (json.data.status === 'success' || json.data.status === 'failed') {
      return json.data;
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error('Tripo task polling timeout');
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

// ─── Step 4: Rig the model ───────────────────────────────────────────────────

export async function rigModel(originalModelTaskId: string): Promise<string> {
  const response: Response = await withRetry(() =>
    fetch(`${TRIPO_BASE_URL}/task`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        type: 'convert_model',
        format: 'GLTF',
        original_model_task_id: originalModelTaskId,
        rig: true,
        // Optional: you can specify retargeting here in the new v2 API,
        // but let's stick to standard rigging first to get the bone structure
      }),
    })
  );

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Rig model task failed: ${response.status} ${txt}`);
  }

  const result = await response.json();
  if (result.code !== 0) throw new Error(`Tripo Rig Error: ${JSON.stringify(result)}`);

  return result.data.task_id;
}

// ─── Step 5: Retarget Animations ─────────────────────────────────────────────

export async function retargetAnimations(riggedModelTaskId: string): Promise<string> {
  const response: Response = await withRetry(() =>
    fetch(`${TRIPO_BASE_URL}/task`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        type: 'retargeting',
        original_model_task_id: riggedModelTaskId,
        // Applying some basic animations. Note: Tripo v2 uses specific format
        format: 'GLTF',
      }),
    })
  );

  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Retarget failed: ${response.status} ${txt}`);
  }

  const result = await response.json();
  if (result.code !== 0) throw new Error(`Tripo Retarget Error: ${JSON.stringify(result)}`);

  return result.data.task_id;
}

// ─── Full Pipeline Orchestrator ──────────────────────────────────────────────

export async function runFullPipeline(params: TripoGenerationParams): Promise<string> {
  // 1. Generate base model
  const genTaskId = await generateBaseModel(params);
  const genResult = await pollTask(genTaskId);
  
  if (genResult.status !== 'success') {
    throw new Error('Base model generation failed');
  }

  // 2. Rig the model
  // In v2, we trigger a conversion task and request `rig: true`
  const rigTaskId = await rigModel(genTaskId);
  const rigResult = await pollTask(rigTaskId);
  
  if (rigResult.status !== 'success') {
    throw new Error('Rigging failed');
  }

  // Final animated GLB is in the model property
  const finalModelUrl = rigResult.result?.model?.url;
  
  if (!finalModelUrl) {
    throw new Error('Failed to retrieve final model URL');
  }

  return finalModelUrl;
}
