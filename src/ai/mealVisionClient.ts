import { getRuntimeConfig } from '@/src/config/runtime';
import { supabase } from '@/src/data/supabaseClient';
import { getNetworkStateOnce, isOnlineFromState } from '@/src/system/network';

export type MealVisionItem = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving?: string;
  qty?: number;
};

export type MealVisionErrorCode =
  | 'offline'
  | 'unauthenticated'
  | 'rate_limited'
  | 'server'
  | 'bad_request'
  | 'config'
  | 'unknown';

export class MealVisionError extends Error {
  code: MealVisionErrorCode;
  status?: number;

  constructor(params: { code: MealVisionErrorCode; message: string; status?: number }) {
    super(params.message);
    this.name = 'MealVisionError';
    this.code = params.code;
    this.status = params.status;
  }
}

export type AnalyzeMealPhotoParams = {
  imageBase64: string;
  mimeType?: string;
  signal?: AbortSignal;
};

export async function analyzeMealPhoto(
  params: AnalyzeMealPhotoParams,
): Promise<{ assumptions: string; items: MealVisionItem[] }> {
  let supabaseFunctionsUrl: string;
  try {
    ({ supabaseFunctionsUrl } = getRuntimeConfig());
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Missing Supabase configuration in app.';
    throw new MealVisionError({ code: 'config', message: msg });
  }

  const net = await getNetworkStateOnce().catch(() => null);
  if (net && !isOnlineFromState(net)) {
    throw new MealVisionError({ code: 'offline', message: 'Offline' });
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new MealVisionError({ code: 'unknown', message: sessionError.message });
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new MealVisionError({ code: 'unauthenticated', message: 'Not authenticated' });

  const raw = params.imageBase64.replace(/^data:image\/\w+;base64,/, '').trim();
  if (!raw) throw new MealVisionError({ code: 'bad_request', message: 'Missing image data' });

  let res: Response;
  try {
    res = await fetch(`${supabaseFunctionsUrl.replace(/\/+$/, '')}/meal-vision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        imageBase64: raw,
        mimeType: params.mimeType ?? 'image/jpeg',
      }),
      signal: params.signal,
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') throw e;
    throw new MealVisionError({ code: 'unknown', message: e instanceof Error ? e.message : 'Request failed' });
  }

  if (!res.ok) {
    const status = res.status;
    let message = await res.text().catch(() => '');
    try {
      const j = JSON.parse(message) as { error?: string };
      if (typeof j.error === 'string') message = j.error;
    } catch {
      // keep body text
    }
    if (status === 401 || status === 403) {
      throw new MealVisionError({ code: 'unauthenticated', message: message || 'Unauthorized', status });
    }
    if (status === 429) {
      throw new MealVisionError({ code: 'rate_limited', message: message || 'Rate limited', status });
    }
    if (status === 400 || status === 413 || status === 422) {
      throw new MealVisionError({ code: 'bad_request', message: message || 'Bad request', status });
    }
    if (status >= 500) {
      throw new MealVisionError({ code: 'server', message: message || 'Server error', status });
    }
    throw new MealVisionError({ code: 'unknown', message: message || res.statusText, status });
  }

  const data = (await res.json()) as { assumptions?: string; items?: MealVisionItem[] };
  const assumptions = typeof data.assumptions === 'string' ? data.assumptions : '';
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) {
    throw new MealVisionError({ code: 'bad_request', message: 'No items returned' });
  }
  return { assumptions, items };
}
