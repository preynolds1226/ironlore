// Supabase Edge Function: POST /meal-vision
// Env: OPENAI_API_KEY (required)
//
// Request JSON:
//   { imageBase64: string, mimeType?: string }  // raw base64, no data: prefix; mimeType default image/jpeg
//
// Response JSON:
//   { assumptions: string, items: { name, calories, protein, carbs, fat, serving?, qty? }[] }

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const MAX_BASE64_CHARS = 6_500_000; // ~4.9MB binary upper bound

type FoodItem = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving?: string;
  qty?: number;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    },
  });
}

function clampFood(raw: unknown): FoodItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const name = String(o.name || '').trim().slice(0, 200);
  if (!name) return null;
  const calories = Math.max(0, Math.min(20000, Math.round(Number(o.calories) || 0)));
  const protein = Math.max(0, Math.min(2000, Math.round(Number(o.protein) || 0)));
  const carbs = Math.max(0, Math.min(2000, Math.round(Number(o.carbs) || 0)));
  const fat = Math.max(0, Math.min(2000, Math.round(Number(o.fat) || 0)));
  const serving =
    typeof o.serving === 'string' ? String(o.serving).trim().slice(0, 120) : undefined;
  let qty = 1;
  if (o.qty != null && Number.isFinite(Number(o.qty))) qty = Math.max(0.25, Math.min(99, Number(o.qty)));
  return { name, calories, protein, carbs, fat, serving, qty };
}

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

  let body: { imageBase64?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const imageBase64 =
    typeof body.imageBase64 === 'string' ? body.imageBase64.trim() : '';
  if (!imageBase64) {
    return jsonResponse({ error: 'imageBase64 required' }, 400);
  }
  if (imageBase64.length > MAX_BASE64_CHARS) {
    return jsonResponse({ error: 'Image too large; use a smaller photo' }, 413);
  }

  let mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim() : 'image/jpeg';
  if (!/^image\/(jpeg|jpg|png|webp)$/i.test(mimeType)) {
    mimeType = 'image/jpeg';
  }
  const mime = mimeType.toLowerCase().replace('jpg', 'jpeg');
  const dataUrl = `data:${mime};base64,${imageBase64}`;

  const systemPrompt = `You are a nutrition assistant. The user sends a photo of food. Identify visible foods and estimate total macros for what is shown (reasonable portions). If multiple distinct foods appear, return separate items. If unsure, state assumptions briefly.

Respond with a single JSON object ONLY (no markdown) with this exact shape:
{
  "assumptions": "string — one short sentence on portion/visual guesses",
  "items": [
    {
      "name": "string",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "serving": "optional string, e.g. 1 plate, 1 medium apple",
      "qty": optional number default 1
    }
  ]
}

Rules: calories 0-20000 per item, protein/carbs/fat 0-2000 grams per item, max 12 items, every item must have a non-empty name. Numbers must be integers.`;

  let res: Response;
  try {
    res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_MEAL_VISION_MODEL') || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this food photo and return the JSON object as specified.',
              },
              {
                type: 'image_url',
                image_url: { url: dataUrl, detail: 'low' },
              },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 1200,
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

  let parsed: { assumptions?: string; items?: unknown[] };
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return jsonResponse({ error: 'Model returned non-JSON' }, 502);
  }

  const assumptions =
    typeof parsed.assumptions === 'string'
      ? parsed.assumptions.trim().slice(0, 500)
      : 'Estimate from photo.';
  const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
  const items: FoodItem[] = [];
  for (const r of rawItems.slice(0, 12)) {
    const c = clampFood(r);
    if (c) items.push(c);
  }

  if (items.length === 0) {
    return jsonResponse({ error: 'No food items could be parsed from the model response' }, 422);
  }

  return jsonResponse({ assumptions, items });
});
