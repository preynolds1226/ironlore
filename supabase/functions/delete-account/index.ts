// Supabase Edge Function: POST /delete-account
// Deletes the authenticated user (auth.users). Rows with ON DELETE CASCADE to auth.users are removed.
//
// Deploy: supabase functions deploy delete-account

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.toLowerCase().startsWith('bearer ')) {
    return jsonResponse({ error: 'Missing or invalid Authorization' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/+$/, '');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: 'Server configuration error' }, 500);
  }

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: authHeader,
      apikey: anonKey,
    },
  });

  if (!userRes.ok) {
    return jsonResponse({ error: 'Invalid or expired session' }, 401);
  }

  const userJson = (await userRes.json()) as { id?: string };
  const userId = userJson?.id;
  if (!userId || typeof userId !== 'string') {
    return jsonResponse({ error: 'Invalid or expired session' }, 401);
  }

  const deleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
  });

  if (!deleteRes.ok) {
    const errText = await deleteRes.text().catch(() => '');
    return jsonResponse({ error: errText || `Delete failed (${deleteRes.status})` }, 500);
  }

  return jsonResponse({ ok: true });
});
