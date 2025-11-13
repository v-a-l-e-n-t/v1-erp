import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CalibrationRow {
  height_mm: number;
  capacity_l: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: rawData } = await req.json()
    
    if (!rawData || !Array.isArray(rawData)) {
      throw new Error('Invalid data format')
    }

    console.log(`Importing ${rawData.length} calibration points for Sphere 1`)

    // Préparer les données pour l'insertion
    const calibrationData: Array<{ sphere_number: number; height_mm: number; capacity_l: number }> = []
    
    for (const row of rawData) {
      const height = parseFloat(row.height)
      const capacity = parseFloat(row.capacity.replace(/,/g, ''))
      
      if (!isNaN(height) && !isNaN(capacity)) {
        calibrationData.push({
          sphere_number: 1,
          height_mm: Math.floor(height),
          capacity_l: capacity
        })
      }
    }

    console.log(`Parsed ${calibrationData.length} valid entries`)

    // Supprimer les anciennes données de la sphère 1
    const { error: deleteError } = await supabaseClient
      .from('sphere_calibration')
      .delete()
      .eq('sphere_number', 1)

    if (deleteError) {
      console.error('Error deleting old data:', deleteError)
    }

    // Insérer par lots de 500
    const batchSize = 500
    let inserted = 0

    for (let i = 0; i < calibrationData.length; i += batchSize) {
      const batch = calibrationData.slice(i, i + batchSize)
      
      const { error } = await supabaseClient
        .from('sphere_calibration')
        .insert(batch)

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error)
        throw error
      }
      
      inserted += batch.length
      console.log(`Progress: ${inserted}/${calibrationData.length}`)
    }

    console.log('Import completed successfully!')

    return new Response(
      JSON.stringify({ 
        success: true, 
        imported: inserted,
        message: `Successfully imported ${inserted} calibration points` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
