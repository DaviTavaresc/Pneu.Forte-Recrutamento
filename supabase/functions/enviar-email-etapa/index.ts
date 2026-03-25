import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { candidato_id, nova_etapa } = await req.json();

    console.log("Enviando e-mail:", { candidato_id, nova_etapa });

    const { data: candidato, error: candidatoError } = await supabase
      .from('candidatos')
      .select('nome, email, vaga_id')
      .eq('id', candidato_id)
      .single();

    if (candidatoError) throw candidatoError;

    // Em modo de teste, o Resend só permite enviar para o email cadastrado
    // Detecta se está em modo de teste e ajusta o destinatário
    const RESEND_TEST_EMAIL = 'davitavaresc.22@gmail.com';
    const isTestMode = false; // Domínio pneufortenet.com.br verificado no Resend
    const emailDestinatario = isTestMode ? RESEND_TEST_EMAIL : candidato.email;
    const isRedirected = isTestMode && candidato.email !== RESEND_TEST_EMAIL;

    if (candidatoError) throw candidatoError;

    const { data: vaga, error: vagaError } = await supabase
      .from('vagas')
      .select('titulo')
      .eq('id', candidato.vaga_id)
      .single();

    if (vagaError) throw vagaError;

    const etapaNomes: Record<string, string> = {
      inscrito: "Inscrição Recebida",
      triagem: "Triagem Curricular",
      entrevista: "Entrevista",
      teste_tecnico: "Teste Técnico",
      finalizado: "Processo Finalizado",
      reprovado: "Não Aprovado"
    };

    const isReprovado = nova_etapa === 'reprovado';
    const assunto = isReprovado 
      ? `Pneu Forte - Agradecimento pela sua Candidatura`
      : `Pneu Forte - Atualização da sua Candidatura`;

    const avisoTeste = isRedirected ? `
      <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
        <p style="margin: 0; color: #856404; font-size: 14px; font-weight: bold;">
          ⚠️ MODO DE TESTE ATIVO
        </p>
        <p style="margin: 5px 0 0 0; color: #856404; font-size: 13px;">
          Este email seria enviado para: <strong>${candidato.email}</strong><br>
          Mas está sendo redirecionado para você pois o domínio ainda não foi verificado no Resend.
        </p>
      </div>
    ` : '';

    const mensagem = isReprovado ? `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); color: #ffffff; padding: 40px; border-radius: 12px;">
          ${avisoTeste}
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #FFD000; font-size: 28px; margin: 0;">Pneu Forte</h1>
            <div style="width: 60px; height: 4px; background: #FFD000; margin: 15px auto;"></div>
          </div>
          
          <h2 style="color: #FFD000; font-size: 24px;">Agradecemos sua Participação</h2>
          
          <p style="font-size: 16px; line-height: 1.8; color: #e0e0e0;">
            Olá, <strong>${candidato.nome}</strong>!
          </p>
          
          <p style="font-size: 16px; line-height: 1.8; color: #e0e0e0;">
            Agradecemos imensamente seu interesse em fazer parte da equipe Pneu Forte e pelo tempo dedicado ao processo seletivo para a vaga de <strong style="color: #FFD000;">${vaga.titulo}</strong>.
          </p>
          
          <div style="background: rgba(255, 208, 0, 0.1); border-left: 4px solid #FFD000; padding: 20px; margin: 25px 0; border-radius: 8px;">
            <p style="margin: 0; color: #ffffff; font-size: 15px;">
              Após análise cuidadosa, informamos que optamos por seguir com outros candidatos nesta oportunidade. 
              No entanto, seu perfil ficará em nosso banco de dados para futuras vagas que possam estar alinhadas com suas qualificações.
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.8; color: #e0e0e0;">
            Desejamos muito sucesso em sua jornada profissional e esperamos contar com sua participação em próximas oportunidades.
          </p>
          
          <p style="font-size: 14px; color: #a0a0a0; margin-top: 30px;">
            Atenciosamente,<br>
            <strong style="color: #FFD000;">Equipe Pneu Forte</strong>
          </p>
          
          <div style="border-top: 2px solid #333; margin-top: 40px; padding-top: 20px; text-align: center;">
            <p style="font-size: 12px; color: #666; margin: 5px 0;">
              © ${new Date().getFullYear()} Pneu Forte - Todos os direitos reservados
            </p>
            <p style="font-size: 11px; color: #888; margin: 5px 0; font-style: italic;">
              Este é um e-mail automático. Por favor, não responda esta mensagem.
            </p>
          </div>
        </div>` : `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); color: #ffffff; padding: 40px; border-radius: 12px;">
          ${avisoTeste}
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #FFD000; font-size: 28px; margin: 0;">Pneu Forte</h1>
            <div style="width: 60px; height: 4px; background: #FFD000; margin: 15px auto;"></div>
          </div>
          
          <h2 style="color: #FFD000; font-size: 24px;">Atualização do Processo Seletivo</h2>
          
          <p style="font-size: 16px; line-height: 1.8; color: #e0e0e0;">
            Olá, <strong>${candidato.nome}</strong>!
          </p>
          
          <p style="font-size: 16px; line-height: 1.8; color: #e0e0e0;">
            Temos boas notícias sobre sua candidatura para a vaga de <strong style="color: #FFD000;">${vaga.titulo}</strong>!
          </p>
          
          <div style="background: rgba(255, 208, 0, 0.1); border-left: 4px solid #FFD000; padding: 20px; margin: 25px 0; border-radius: 8px;">
            <p style="margin: 0; color: #ffffff; font-size: 15px;">
              Você avançou para a etapa: <strong style="color: #FFD000;">${etapaNomes[nova_etapa] || nova_etapa}</strong>
            </p>
          </div>
          
          <p style="font-size: 16px; line-height: 1.8; color: #e0e0e0;">
            Em breve, nossa equipe entrará em contato com mais informações sobre os próximos passos.
          </p>
          
          <p style="font-size: 14px; color: #a0a0a0; margin-top: 30px;">
            Atenciosamente,<br>
            <strong style="color: #FFD000;">Equipe Pneu Forte</strong>
          </p>
          
          <div style="border-top: 2px solid #333; margin-top: 40px; padding-top: 20px; text-align: center;">
            <p style="font-size: 12px; color: #666; margin: 5px 0;">
              © ${new Date().getFullYear()} Pneu Forte - Todos os direitos reservados
            </p>
            <p style="font-size: 11px; color: #888; margin: 5px 0; font-style: italic;">
              Este é um e-mail automático. Por favor, não responda esta mensagem.
            </p>
          </div>
        </div>`;

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Pneu Forte RH <rh@pneufortenet.com.br>',
      to: [emailDestinatario],
      subject: assunto,
      html: mensagem,
    });

    if (emailError) throw emailError;

    console.log("E-mail enviado com sucesso", isRedirected ? `(redirecionado de ${candidato.email} para ${emailDestinatario})` : `para ${emailDestinatario}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error('Erro ao enviar e-mail:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro desconhecido' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});