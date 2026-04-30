// Supabase Edge Function: POST /coach
// Env: OPENAI_API_KEY (required for structured replies with proposals)
//
// Request JSON:
//   { systemPrompt, messages: [{role, content}], context?: { userId, workoutTemplates?, nutritionToday? } }
//
// Response JSON (v2):
//   { reply: string, proposals: Proposal[] }
//
// Backward compatible: may also return { content: [{ text }] } — clients should normalize.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

type Msg = { role: string; content: string };

type Proposal =
  | {
      type: 'workout_template_upsert';
      templateId?: string;
      name: string;
      notes?: string;
      items: {
        exerciseName: string;
        sets: { reps?: number; weight?: number; rpe?: number; note?: string }[];
      }[];
    }
  | { type: 'workout_template_delete'; templateId: string }
  | {
      type: 'food_log_append';
      meal?: string;
      items: {
        name: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        qty?: number;
        serving?: string;
      }[];
    };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', Connection: 'keep-alive' },
  });
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function clampProposal(p: unknown): Proposal | null {
  if (!p || typeof p !== 'object') return null;
  const t = (p as any).type;
  if (t === 'workout_template_delete') {
    const id = String((p as any).templateId || '');
    if (!isUuid(id)) return null;
    return { type: 'workout_template_delete', templateId: id };
  }
  if (t === 'workout_template_upsert') {
    const name = String((p as any).name || '').trim().slice(0, 120);
    if (!name) return null;
    const templateIdRaw = (p as any).templateId;
    const templateId =
      templateIdRaw != null && String(templateIdRaw) && isUuid(String(templateIdRaw))
        ? String(templateIdRaw)
        : undefined;
    const notes =
      typeof (p as any).notes === 'string' ? String((p as any).notes).trim().slice(0, 2000) : undefined;
    const rawItems = Array.isArray((p as any).items) ? (p as any).items : [];
    if (rawItems.length > 40) return null;
    const items: {
      exerciseName: string;
      sets: { reps?: number; weight?: number; rpe?: number; note?: string }[];
    }[] = [];
    for (const it of rawItems) {
      const exerciseName = String(it?.exerciseName || '').trim().slice(0, 120);
      if (!exerciseName) continue;
      const rawSets = Array.isArray(it?.sets) ? it.sets : [];
      const sets: { reps?: number; weight?: number; rpe?: number; note?: string }[] = [];
      for (const s of rawSets.slice(0, 50)) {
        const set: { reps?: number; weight?: number; rpe?: number; note?: string } = {};
        if (s?.reps != null && Number.isFinite(Number(s.reps))) set.reps = Math.max(0, Math.min(999, Math.round(Number(s.reps))));
        if (s?.weight != null && Number.isFinite(Number(s.weight))) set.weight = Math.max(0, Math.min(2000, Number(s.weight)));
        if (s?.rpe != null && Number.isFinite(Number(s.rpe))) set.rpe = Math.max(0, Math.min(10, Number(s.rpe)));
        if (typeof s?.note === 'string') set.note = String(s.note).slice(0, 200);
        sets.push(set);
      }
      if (sets.length === 0) sets.push({ reps: 8 });
      items.push({ exerciseName, sets });
    }
    if (items.length === 0) return null;
    return { type: 'workout_template_upsert', templateId, name, notes, items };
  }
  if (t === 'food_log_append') {
    const meal =
      typeof (p as any).meal === 'string' ? String((p as any).meal).trim().slice(0, 40) : undefined;
    const rawItems = Array.isArray((p as any).items) ? (p as any).items : [];
    if (rawItems.length === 0 || rawItems.length > 30) return null;
    const items: {
      name: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      qty?: number;
      serving?: string;
    }[] = [];
    for (const it of rawItems) {
      const name = String(it?.name || '').trim().slice(0, 200);
      if (!name) continue;
      const calories = Math.max(0, Math.min(20000, Math.round(Number(it?.calories) || 0)));
      const protein = Math.max(0, Math.min(2000, Math.round(Number(it?.protein) || 0)));
      const carbs = Math.max(0, Math.min(2000, Math.round(Number(it?.carbs) || 0)));
      const fat = Math.max(0, Math.min(2000, Math.round(Number(it?.fat) || 0)));
      let qty = 1;
      if (it?.qty != null && Number.isFinite(Number(it.qty))) qty = Math.max(0.25, Math.min(99, Number(it.qty)));
      const serving = typeof it?.serving === 'string' ? String(it.serving).slice(0, 80) : undefined;
      items.push({ name, calories, protein, carbs, fat, qty, serving });
    }
    if (items.length === 0) return null;
    return { type: 'food_log_append', meal, items };
  }
  return null;
}

function validateProposals(raw: unknown): Proposal[] {
  if (!Array.isArray(raw)) return [];
  const out: Proposal[] = [];
  for (const p of raw.slice(0, 10)) {
    const c = clampProposal(p);
    if (c) out.push(c);
  }
  return out;
}

const STRUCTURED_SUFFIX = `

IMPORTANT — App actions (IronLore):
When the user asks you to create, change, or delete a workout template/routine, OR to log food / estimate macros, you must ALSO output machine-readable proposals.

Respond with a single JSON object ONLY (no markdown, no code fences) with this exact shape:
{
  "reply": "string — what you say to the user in character (2-5 sentences unless they asked for detail).",
  "proposals": []
}

Add zero or more objects to "proposals". Each object must have "type" as one of:
1) workout_template_upsert — fields: optional "templateId" (uuid string only if editing an existing template from context), required "name", optional "notes", required "items" array of { "exerciseName", "sets": [ { "reps", "weight", "rpe", "note" } ] }.
2) workout_template_delete — fields: "templateId" (uuid).
3) food_log_append — fields: optional "meal" (e.g. Breakfast/Lunch/Dinner/Snacks), "items" array of { "name", "calories", "protein", "carbs", "fat", optional "qty", optional "serving" }.

If the user did NOT ask for workout or food logging changes, return "proposals": [].
Never invent templateIds — only use ids provided in context when editing. For new templates omit templateId.
For food, give reasonable macro estimates per typical serving; quantities in qty multiply the macros you list (macros are per one qty unless you state otherwise in serving).`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    return jsonResponse({ error: 'OPENAI_API_KEY not configured' }, 500);
  }

  let body: {
    systemPrompt?: string;
    messages?: Msg[];
    context?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const systemPrompt = typeof body.systemPrompt === 'string' ? body.systemPrompt : '';
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!systemPrompt || messages.length === 0) {
    return jsonResponse({ error: 'systemPrompt and messages required' }, 400);
  }

  const ctxStr =
    body.context && typeof body.context === 'object'
      ? `\n\nClient context (JSON): ${JSON.stringify(body.context).slice(0, 8000)}`
      : '';

  const fullSystem = `${systemPrompt}${STRUCTURED_SUFFIX}${ctxStr}`;

  const openaiMessages = [
    { role: 'system', content: fullSystem },
    ...messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: m.content.slice(0, 12000) })),
  ];

  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini',
        messages: openaiMessages,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });
  } catch (e) {
    return jsonResponse({ error: (e as Error).message || 'Upstream error' }, 502);
  }

  if (!res.ok) {
    const t = await res.text();
    return jsonResponse({ error: t || 'OpenAI error', status: res.status }, 502);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const rawContent = data.choices?.[0]?.message?.content || '{}';

  let parsed: { reply?: string; proposals?: unknown };
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return jsonResponse({
      reply: rawContent.slice(0, 2000) || 'The forge is silent. Try again.',
      proposals: [],
      content: [{ text: rawContent.slice(0, 2000) }],
    });
  }

  const reply =
    typeof parsed.reply === 'string' && parsed.reply.trim()
      ? parsed.reply.trim().slice(0, 8000)
      : 'Done.';

  const proposals = validateProposals(parsed.proposals);

  return jsonResponse({
    reply,
    proposals,
    content: [{ text: reply }],
  });
});
