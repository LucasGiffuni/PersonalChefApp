// Supabase Edge Function: usda-search
// Env required: USDA_API_KEY

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('USDA_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'USDA_API_KEY missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { query, rawOnly } = await req.json()
    const q = String(query || '').trim()
    if (!q) {
      return new Response(JSON.stringify({ food: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}`
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: q,
        pageSize: 5,
        dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'],
      }),
    })

    if (!resp.ok) {
      const msg = await resp.text()
      return new Response(JSON.stringify({ error: msg }), {
        status: resp.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await resp.json()
    const foods = Array.isArray(data?.foods) ? data.foods : []
    const isRaw = (food: any) => /(^|[\s,;()\-])raw([\s,;()\-]|$)/i.test(String(food?.description || ''))
    const scored = foods
      .map((food: any, idx: number) => ({
        food,
        idx,
        rawScore: isRaw(food) ? 1000 : 0,
      }))
      .sort((a: any, b: any) => (b.rawScore - a.rawScore) || (a.idx - b.idx))

    const first = rawOnly
      ? (scored.find((x: any) => x.rawScore > 0)?.food || null)
      : (scored[0]?.food || null)

    return new Response(JSON.stringify({ food: first }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
