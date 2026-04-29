import { getRuntimeConfig } from '@/src/config/runtime';
import { supabase } from '@/src/data/supabaseClient';
import { getNetworkStateOnce, isOnlineFromState } from '@/src/system/network';

export type CoachMessage = { role: 'user' | 'assistant'; content: string };

type CoachResponse = {
  content?: { text?: string }[];
};

export type CoachErrorCode =
  | 'offline'
  | 'unauthenticated'
  | 'rate_limited'
  | 'server'
  | 'bad_request'
  | 'unknown';

export class CoachError extends Error {
  code: CoachErrorCode;
  status?: number;
  retryAfterSeconds?: number;

  constructor(params: { code: CoachErrorCode; message: string; status?: number; retryAfterSeconds?: number }) {
    super(params.message);
    this.name = 'CoachError';
    this.code = params.code;
    this.status = params.status;
    this.retryAfterSeconds = params.retryAfterSeconds;
  }
}

function parseRetryAfterSeconds(retryAfter: string | null): number | undefined {
  if (!retryAfter) return undefined;
  const asInt = parseInt(retryAfter, 10);
  if (Number.isFinite(asInt) && asInt >= 0) return asInt;
  const asDate = Date.parse(retryAfter);
  if (Number.isFinite(asDate)) {
    const secs = Math.ceil((asDate - Date.now()) / 1000);
    return secs > 0 ? secs : 0;
  }
  return undefined;
}

export async function callCoach(params: {
  systemPrompt: string;
  messages: CoachMessage[];
  signal?: AbortSignal;
}): Promise<string> {
  const { supabaseFunctionsUrl } = getRuntimeConfig();

  const net = await getNetworkStateOnce().catch(() => null);
  if (net && !isOnlineFromState(net)) {
    throw new CoachError({ code: 'offline', message: 'Offline' });
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new CoachError({ code: 'unknown', message: sessionError.message });
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new CoachError({ code: 'unauthenticated', message: 'Not authenticated' });

  let res: Response;
  try {
    res = await fetch(`${supabaseFunctionsUrl.replace(/\/+$/, '')}/coach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        systemPrompt: params.systemPrompt,
        messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
      }),
      signal: params.signal,
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    throw new CoachError({ code: 'unknown', message: e?.message || 'Request failed' });
  }

  if (!res.ok) {
    const status = res.status;
    const retryAfterSeconds = parseRetryAfterSeconds(res.headers.get('Retry-After'));

    if (status === 401 || status === 403) {
      throw new CoachError({ code: 'unauthenticated', message: 'Unauthorized', status });
    }
    if (status === 429) {
      throw new CoachError({ code: 'rate_limited', message: 'Rate limited', status, retryAfterSeconds });
    }
    if (status === 400) {
      const body = await res.text().catch(() => '');
      throw new CoachError({ code: 'bad_request', message: body || 'Bad request', status });
    }
    if (status >= 500) {
      throw new CoachError({ code: 'server', message: 'Server error', status });
    }

    const body = await res.text().catch(() => '');
    throw new CoachError({ code: 'unknown', message: body || res.statusText, status });
  }

  const data = (await res.json()) as CoachResponse;
  return data.content?.[0]?.text || 'The forge is silent. Try again.';
}

