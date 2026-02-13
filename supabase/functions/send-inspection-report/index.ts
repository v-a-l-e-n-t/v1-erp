import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  recipients: string[];
  subject: string;
  htmlBody: string;
  pdfBase64: string;
  pdfFilename: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { recipients, subject, htmlBody, pdfBase64, pdfFilename }: EmailRequest = await req.json()

    if (!recipients || recipients.length === 0) {
      throw new Error('Aucun destinataire spécifié')
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY non configurée. Veuillez ajouter la clé dans les secrets Supabase.')
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'GazPILOT <onboarding@resend.dev>',
        to: recipients,
        subject: subject,
        html: htmlBody,
        attachments: pdfBase64 ? [{
          filename: pdfFilename || 'rapport.pdf',
          content: pdfBase64,
        }] : undefined,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Resend error:', result)
      throw new Error(result.message || 'Erreur lors de l\'envoi du mail')
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Send email error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
