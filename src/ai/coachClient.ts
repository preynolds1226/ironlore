import { getRuntimeConfig } from '@/src/config/runtime';
import { supabase } from '@/src/data/supabaseClient';
import { getNetworkStateOnce, isOnlineFromState } from '@/src/system/network';
import {
  type CoachContextPayload,
  type CoachProposal,
  parseCoachProposals,
} from '@/src/ai/coachProposals';

export type CoachMessage = { role: 'user' | 'assistant'; content: string };

type CoachResponse = {
  reply?: string;
  proposals?: unknown;
  content?: { text?: string }[];
};

export type CoachErrorCode =
  | 'offline'
  | 'unauthenticated'
  | 'rate_limited'
  | 'server'
  | 'bad_request'
  | 'config'
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

export type CoachCallParams = {
  systemPrompt: string;
  messages: CoachMessage[];
  context?: CoachContextPayload;
  signal?: AbortSignal;
};

function normalizeCoachResponse(data: CoachResponse): { text: string; proposals: CoachProposal[] } {
  const text =
    (typeof data.reply === 'string' && data.reply.trim()
      ? data.reply.trim()
      : data.content?.[0]?.text?.trim()) || 'The forge is silent. Try again.';
  const proposals = parseCoachProposals(data.proposals);
  return { text, proposals };
}

export async function callCoachWithProposals(params: CoachCallParams): Promise<{
  text: string;
  proposals: CoachProposal[];
}> {
  let supabaseFunctionsUrl: string;
  try {
    ({ supabaseFunctionsUrl } = getRuntimeConfig());
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : 'Missing Supabase configuration in app.';
    throw new CoachError({ code: 'config', message: msg });
  }

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
        ...(params.context ? { context: params.context } : {}),
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
      const body = await res.text().catch(() => '');
      throw new CoachError({ code: 'unauthenticated', message: body || 'Unauthorized', status });
    }
    if (status === 429) {
      const body = await res.text().catch(() => '');
      throw new CoachError({ code: 'rate_limited', message: body || 'Rate limited', status, retryAfterSeconds });
    }
    if (status === 400) {
      const body = await res.text().catch(() => '');
      throw new CoachError({ code: 'bad_request', message: body || 'Bad request', status });
    }
    if (status >= 500) {
      const body = await res.text().catch(() => '');
      throw new CoachError({ code: 'server', message: body || 'Server error', status });
    }

    const body = await res.text().catch(() => '');
    throw new CoachError({ code: 'unknown', message: body || res.statusText, status });
  }

  const data = (await res.json()) as CoachResponse;
  return normalizeCoachResponse(data);
}

/** @deprecated Prefer callCoachWithProposals for structured actions; kept for compatibility. */
export async function callCoach(params: CoachCallParams): Promise<string> {
  const { text } = await callCoachWithProposals(params);
  return text;
}

