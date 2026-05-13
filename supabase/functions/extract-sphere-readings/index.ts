import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const PROMPT = `Tu reçois une photo d'un écran de supervision SCADA (ou d'un instrument de mesure) d'une sphère de stockage de butane.

Extrais les 5 valeurs ci-dessous et renvoie UNIQUEMENT un JSON strict, sans texte avant/après, sans bloc markdown :

{
  "jauge_mm": number | null,
  "densite_15c": number | null,
  "temperature_liquide_c": number | null,
  "temperature_gaz_c": number | null,
  "pression_relative_bar": number | null,
  "_confidence": {
    "jauge_mm": "high" | "medium" | "low",
    "densite_15c": "high" | "medium" | "low",
    "temperature_liquide_c": "high" | "medium" | "low",
    "temperature_gaz_c": "high" | "medium" | "low",
    "pression_relative_bar": "high" | "medium" | "low"
  },
  "_notes": "string"
}

Règles :
- Décimales : la virgule française (ex. 0,5841) doit être convertie en point (0.5841) dans le JSON.
- Unités : jauge en millimètres, densité (sans unité, ~0,5–0,6), températures en °C, pression relative en bar.
- Si une valeur est illisible, absente, masquée par un reflet ou douteuse → mets null et confidence "low".
- "_notes" décrit en une phrase ce que tu vois (ex. "Écran SCADA Siemens, valeurs nettes").`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GROQ_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GROQ_API_KEY non configurée' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(
        JSON.stringify({ error: 'imageBase64 manquant' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = {
      model: GROQ_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}` },
            },
          ],
        },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    };

    const resp = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      let message = `Groq ${resp.status}: ${txt.slice(0, 200)}`;
      if (resp.status === 429) {
        message = 'Quota Groq dépassé. Réessaie dans quelques minutes.';
      } else if (resp.status === 401 || resp.status === 403) {
        message = 'Clé Groq refusée côté serveur.';
      }
      return new Response(
        JSON.stringify({ error: message }),
        { status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const json = await resp.json();
    const raw = json?.choices?.[0]?.message?.content as string | undefined;
    if (!raw) {
      return new Response(
        JSON.stringify({ error: 'Réponse Groq vide' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const stripped = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripped);
    } catch {
      return new Response(
        JSON.stringify({ error: `Réponse non-JSON : ${raw.slice(0, 120)}…` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('extract-sphere-readings error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
