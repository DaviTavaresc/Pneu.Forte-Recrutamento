import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { candidato_id, curriculo_url } = await req.json();

    console.log("Gerando resumo do currículo:", { candidato_id, curriculo_url });

    // Download do currículo do storage
    const fileName = curriculo_url.split('/').pop();
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('curriculos')
      .download(fileName);

    if (downloadError) throw downloadError;

    // Converter o blob para ArrayBuffer e depois para base64
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64Pdf = btoa(String.fromCharCode(...uint8Array));
    
    // Gerar resumo com IA usando modelo com capacidade de visão para PDFs
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente de RH especializado em análise de currículos. Analise o currículo fornecido e forneça um resumo objetivo em 2-4 frases, destacando: experiência profissional relevante, principais habilidades técnicas e pontos fortes do candidato.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analise este currículo em PDF e forneça um resumo profissional objetivo.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Pdf}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro na API de IA:', aiResponse.status, errorText);
      throw new Error(`Erro na API de IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const resumo = aiData.choices[0].message.content;

    // Atualizar o candidato com o resumo
    const { error: updateError } = await supabase
      .from('candidatos')
      .update({ resumo_ia: resumo })
      .eq('id', candidato_id);

    if (updateError) throw updateError;

    console.log("Resumo gerado com sucesso");

    return new Response(
      JSON.stringify({ success: true, resumo }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Erro ao gerar resumo:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro desconhecido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});