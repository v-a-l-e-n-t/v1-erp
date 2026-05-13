/**
 * Extraction de valeurs SCADA depuis une photo.
 *
 * Le client compresse l'image puis appelle l'Edge Function Supabase
 * `extract-sphere-readings`, qui détient la clé Groq en secret côté serveur.
 * L'image n'est jamais stockée (ni en local, ni en DB, ni dans Supabase
 * Storage). Après lecture, le Blob est libéré et l'URL d'aperçu révoquée
 * par l'appelant.
 */

import { supabase } from '@/integrations/supabase/client';

export type Confidence = 'high' | 'medium' | 'low';

export interface SphereReadingExtraction {
  jauge_mm: number | null;
  densite_15c: number | null;
  temperature_liquide_c: number | null;
  temperature_gaz_c: number | null;
  pression_relative_bar: number | null;
  _confidence?: Partial<
    Record<keyof Omit<SphereReadingExtraction, '_confidence' | '_notes'>, Confidence>
  >;
  _notes?: string;
}

async function fileToBase64(file: Blob): Promise<{ data: string; mimeType: string }> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return { data: btoa(binary), mimeType: file.type || 'image/jpeg' };
}

/**
 * Compresse l'image (max 1600 px de côté, JPEG q=0.85). Réduit latence + tokens.
 */
async function compressImage(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const MAX = 1600;
    const ratio = Math.min(1, MAX / Math.max(img.width, img.height));
    const w = Math.round(img.width * ratio);
    const h = Math.round(img.height * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d unavailable');
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.85),
    );
    if (!blob) throw new Error('canvas toBlob failed');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function extractSphereReadings(
  file: File,
): Promise<SphereReadingExtraction> {
  const compressed = await compressImage(file);
  const { data, mimeType } = await fileToBase64(compressed);

  const { data: result, error } = await supabase.functions.invoke<
    SphereReadingExtraction | { error: string }
  >('extract-sphere-readings', {
    body: { imageBase64: data, mimeType },
  });

  if (error) {
    // L'Edge Function renvoie { error: "..." } avec un status non-2xx ; supabase-js
    // remplit alors `error` mais expose aussi le body via FunctionsHttpError.
    const ctx = (error as any).context;
    let serverMsg: string | undefined;
    try {
      const txt = typeof ctx?.body === 'string' ? ctx.body : await ctx?.text?.();
      if (txt) serverMsg = JSON.parse(txt)?.error;
    } catch {
      /* noop */
    }
    throw new Error(serverMsg || error.message || 'Échec de l\'extraction');
  }

  if (!result || (result as any).error) {
    throw new Error((result as any)?.error || 'Réponse vide');
  }

  return result as SphereReadingExtraction;
}
