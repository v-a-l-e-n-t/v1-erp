import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Liste blanche d'origines autorisees. Ajouter ici les domaines de prod / preview.
const ALLOWED_ORIGINS = [
  'http://localhost:8080',
  'http://localhost:5173',
  'http://localhost:4173',
  'https://gazpilot.com',
  'https://www.gazpilot.com',
  // Lovable / Supabase preview environments
  'https://blnhtqundfcegmnkcvrt.supabase.co',
];

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function unauthorized(headers: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } },
  );
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const headers = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  // 1) Origin restrictif : refus si pas dans la liste blanche.
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return unauthorized(headers);
  }

  // 2) Authorization Bearer present (sanity check). Le Supabase API gateway
  //    valide deja l'apikey avant que la requete atteigne cette fonction,
  //    donc on fait juste une verif structurelle pour rejeter les requetes
  //    qui ne proviennent pas d'un client Supabase.
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  if (!token) {
    return unauthorized(headers);
  }

  try {
    const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');

    if (!mapboxToken) {
      console.error('MAPBOX_ACCESS_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Mapbox token not configured' }),
        { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ token: mapboxToken }),
      { headers: { ...headers, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error retrieving Mapbox token:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } },
    );
  }
});
