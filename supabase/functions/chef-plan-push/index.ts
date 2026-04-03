// Supabase Edge Function: chef-plan-push
// Required envs:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const dayLabels: Record<string, string> = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
  sun: 'Domingo',
};

function formatDays(days: unknown): string {
  if (!Array.isArray(days) || days.length === 0) return 'su semana';
  const labels = days.map((d) => dayLabels[String(d)] ?? String(d)).filter(Boolean);
  if (!labels.length) return 'su semana';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} y ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRole) {
      return new Response(
        JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = await req.json();
    const eventType = String(payload?.eventType ?? '').toUpperCase();
    const row = payload?.new ?? payload?.old ?? null;
    const planId = Number(row?.plan_id ?? 0);
    const recipeId = Number(row?.recipe_id ?? 0);
    if (!planId || !recipeId || !eventType) {
      return new Response(JSON.stringify({ ok: true, skipped: 'Missing plan or recipe or event type' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeaders = {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      'Content-Type': 'application/json',
    };

    const [planResp, recipeResp] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/weekly_plans?id=eq.${planId}&select=id,chef_id,consumer_id`, {
        headers: authHeaders,
      }),
      fetch(`${supabaseUrl}/rest/v1/recipes?id=eq.${recipeId}&select=name,title`, { headers: authHeaders }),
    ]);

    const planRows = (await planResp.json()) as Array<{ id: number; chef_id: string; consumer_id: string }>;
    const recipeRows = (await recipeResp.json()) as Array<{ name?: string; title?: string }>;
    const plan = planRows?.[0];
    const recipeName = String(recipeRows?.[0]?.name ?? recipeRows?.[0]?.title ?? 'una receta').trim() || 'una receta';
    if (!plan?.chef_id || !plan?.consumer_id) {
      return new Response(JSON.stringify({ ok: true, skipped: 'Plan not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [profileResp, tokenResp] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/consumer_profiles?user_id=eq.${plan.consumer_id}&select=display_name`, {
        headers: authHeaders,
      }),
      fetch(`${supabaseUrl}/rest/v1/user_push_tokens?user_id=eq.${plan.chef_id}&select=token`, {
        headers: authHeaders,
      }),
    ]);

    const profileRows = (await profileResp.json()) as Array<{ display_name?: string }>;
    const tokenRows = (await tokenResp.json()) as Array<{ token: string }>;
    const tokens = tokenRows.map((row) => row.token).filter(Boolean);
    if (!tokens.length) {
      return new Response(JSON.stringify({ ok: true, skipped: 'No push tokens for chef' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const consumerName = String(profileRows?.[0]?.display_name ?? 'Un consumidor').trim() || 'Un consumidor';
    const servings = Math.max(1, Number(row?.servings ?? 1));
    const daysLabel = formatDays(row?.days);

    let title = 'Pedido actualizado';
    let body = `${consumerName} modificó su pedido`;
    if (eventType === 'INSERT') {
      title = 'Nuevo pedido';
      body = `${consumerName} agregó ${recipeName} (${servings} porciones) para ${daysLabel}`;
    } else if (eventType === 'DELETE') {
      title = 'Pedido eliminado';
      body = `${consumerName} eliminó su pedido`;
    }

    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: {
        eventType,
        planId,
        recipeId,
      },
    }));

    const expoResp = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    const expoData = await expoResp.json();
    return new Response(JSON.stringify({ ok: true, expo: expoData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
