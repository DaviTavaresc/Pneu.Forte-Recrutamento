import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Get user from authorization header (optional for candidates)
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} }
    });

    let user = null;
    let isRH = false;

    // Try to get authenticated user (RH only)
    if (authHeader) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        user = authUser;
        
        // Check if user is RH/Admin
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        isRH = roles?.some(r => r.role === 'rh' || r.role === 'admin') || false;
      }
    }

    // User is anonymous candidate if not authenticated
    const isAnonymousCandidate = !user;

    // Define tools based on user role
    const tools = [
      {
        type: "function",
        function: {
          name: "listar_vagas_ativas",
          description: "Lista todas as vagas ativas disponíveis para candidatura",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "info_empresa",
          description: "Retorna informações sobre a Pneu Forte (empresa, cultura, benefícios, processo seletivo)",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      }
    ];

    // Add authenticated user tool (status de candidatura)
    if (user && !isRH) {
      tools.push({
        type: "function",
        function: {
          name: "buscar_status_candidatura",
          description: "Busca o status das candidaturas do usuário atual autenticado",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      });
    }

    // Add tool for anonymous candidates to check status by CPF
    if (isAnonymousCandidate) {
      tools.push({
        type: "function",
        function: {
          name: "buscar_candidatura_por_cpf",
          description: "Busca o status das candidaturas usando o CPF do candidato. SEMPRE explique sobre LGPD antes de pedir o CPF.",
          parameters: {
            type: "object",
            properties: {
              cpf: {
                type: "string",
                description: "CPF do candidato (somente números, 11 dígitos)"
              }
            },
            required: []
          }
        }
      });
    }

    // Add RH-only tools
    if (isRH) {
      tools.push(
        {
          type: "function",
          function: {
            name: "listar_candidatos_por_etapa",
            description: "Lista candidatos filtrados por etapa do processo (inscrito, triagem, entrevista, teste_tecnico, finalizado, reprovado)",
            parameters: {
              type: "object",
              properties: {
                etapa: {
                  type: "string",
                  enum: ["inscrito", "triagem", "entrevista", "teste_tecnico", "finalizado", "reprovado"],
                  description: "Etapa do processo seletivo"
                }
              },
              required: []
            }
          }
        },
        {
          type: "function",
          function: {
            name: "buscar_candidato_por_nome",
            description: "Busca candidatos pelo nome (busca parcial case-insensitive)",
            parameters: {
              type: "object",
              properties: {
                nome: {
                  type: "string",
                  description: "Nome ou parte do nome do candidato"
                }
              },
              required: []
            }
          }
        },
        {
          type: "function",
          function: {
            name: "estatisticas_sistema",
            description: "Retorna estatísticas gerais do sistema (total de candidatos, vagas, distribuição por etapa)",
            parameters: {
              type: "object",
              properties: {},
              required: []
            }
          }
        }
      );
    }

    // System prompt based on role
    const systemPrompt = isRH 
      ? `Você é o assistente virtual de RH da Pneu Forte, especializado em gestão de recrutamento e seleção.

Sua personalidade:
- Profissional, objetivo e eficiente
- Focado em ajudar a equipe de RH com suas tarefas
- Linguagem corporativa e clara
- NUNCA use metáforas ou analogias sobre mecânica, carros ou pneus - isso não é apropriado para o contexto de RH

Você pode ajudar com:
- Consultar status e informações de candidatos
- Buscar candidatos por nome ou etapa do processo
- Ver estatísticas do sistema de recrutamento
- Listar vagas ativas e seus detalhes
- Fornecer informações sobre o processo seletivo

Sempre seja direto e forneça as informações de forma organizada. Use as ferramentas disponíveis para buscar dados atualizados quando necessário.

Exemplo de como responder:
- "Atualmente temos 15 candidatos na etapa de triagem."
- "Encontrei 3 candidatos com o nome 'João'. Aqui estão os detalhes..."
- "As estatísticas do sistema mostram..."

IMPORTANTE: Mantenha o foco em recrutamento e seleção. Não responda perguntas sobre mecânica, carros, pneus ou assuntos não relacionados ao trabalho de RH.`
      : isAnonymousCandidate
      ? `Você é o assistente virtual da Pneu Forte, aqui para ajudar visitantes interessados em oportunidades de trabalho.

Sua personalidade:
- Amigável, acolhedor e profissional
- Entusiasmado em ajudar candidatos a encontrar oportunidades
- Claro e transparente sobre o processo seletivo
- Use linguagem simples e acessível

Você pode ajudar com:
- Informações sobre vagas abertas
- Detalhes sobre a empresa e cultura organizacional
- Dicas para o processo seletivo
- Acompanhamento de candidaturas usando CPF

IMPORTANTE - LGPD e Privacidade:
- Quando o usuário perguntar sobre o status da candidatura, SEMPRE explique primeiro:
  "Para consultar o status da sua candidatura, precisarei do seu CPF. 🔒 Seus dados são protegidos pela Lei Geral de Proteção de Dados (LGPD). Utilizamos seu CPF apenas para identificar e consultar suas candidaturas, sem armazenar ou compartilhar com terceiros. Pode me informar seu CPF?"
- NUNCA peça CPF sem explicar sobre LGPD
- Sempre mascare o CPF nas respostas (ex: ***.456.***-**)
- Seja transparente sobre o uso dos dados

Use as ferramentas disponíveis quando precisar buscar informações específicas.`
      : `Você é o assistente virtual da Pneu Forte, aqui para ajudar candidatos com suas candidaturas e dúvidas sobre vagas.

Sua personalidade:
- Amigável, acolhedor e profissional
- Entusiasmado em ajudar candidatos em sua jornada
- Claro e transparente sobre o processo seletivo
- Use linguagem simples e acessível

Você pode ajudar com:
- Status das suas candidaturas
- Informações sobre vagas abertas
- Detalhes sobre a empresa e cultura organizacional
- Dicas para o processo seletivo

Use as ferramentas disponíveis quando precisar buscar informações específicas.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    
    // Handle tool calls
    if (aiResponse.choices[0].message.tool_calls) {
      const toolCalls = aiResponse.choices[0].message.tool_calls;
      const toolResults = [];

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments || '{}');
        
        let result;

        switch (functionName) {
          case "listar_vagas_ativas":
            const { data: vagas } = await supabase
              .from('vagas')
              .select('id, titulo, area, localidade, modelo_trabalho, tipo_contrato, salario')
              .eq('status', 'ativa')
              .order('criada_em', { ascending: false });
            result = vagas || [];
            break;

          case "buscar_status_candidatura":
            if (!user) {
              result = { error: "Usuário não autenticado" };
              break;
            }
            const { data: candidaturas } = await supabase
              .from('candidatos')
              .select('id, nome, etapa_atual, enviado_em, vagas(titulo, area)')
              .eq('user_id', user.id)
              .order('enviado_em', { ascending: false });
            result = candidaturas || [];
            break;

          case "buscar_candidatura_por_cpf":
            // Validate CPF format (11 digits)
            const cpfOriginal = args.cpf;
            const cpfSomenteNumeros = cpfOriginal?.replace(/\D/g, '');
            
            if (!cpfSomenteNumeros || cpfSomenteNumeros.length !== 11) {
              result = { 
                error: "CPF inválido. Por favor, forneça um CPF válido com 11 dígitos.",
                lgpd_notice: true
              };
              break;
            }

            // Formatar CPF para busca (XXX.XXX.XXX-XX)
            const cpfFormatado = cpfSomenteNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');

            const { data: candidaturasPorCPF } = await supabase
              .from('candidatos')
              .select('id, nome, etapa_atual, enviado_em, vagas(titulo, area)')
              .eq('cpf', cpfFormatado)
              .order('enviado_em', { ascending: false });
            
            if (!candidaturasPorCPF || candidaturasPorCPF.length === 0) {
              result = { 
                error: "Nenhuma candidatura encontrada com este CPF.",
                message: "Verifique se o CPF está correto ou se você já se candidatou a alguma vaga."
              };
            } else {
              // Mask CPF in response for privacy
              result = {
                candidaturas: candidaturasPorCPF,
                cpf_mascarado: cpfSomenteNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '***.$2.***-**'),
                lgpd_notice: "Seus dados são protegidos conforme a LGPD."
              };
            }
            break;

          case "info_empresa":
            result = {
              nome: "Pneu Forte",
              descricao: "Somos uma empresa líder no setor de pneus e serviços automotivos, comprometida com excelência e inovação.",
              valores: ["Qualidade", "Confiabilidade", "Inovação", "Trabalho em Equipe"],
              beneficios: [
                "Plano de saúde e odontológico",
                "Vale alimentação e refeição",
                "Auxílio transporte",
                "Programas de desenvolvimento profissional",
                "Ambiente de trabalho colaborativo"
              ],
              processo_seletivo: {
                etapas: [
                  "Inscrição - Envio do currículo",
                  "Triagem - Análise inicial dos candidatos",
                  "Entrevista - Conversa com RH e gestores",
                  "Teste Técnico - Avaliação de habilidades específicas (quando aplicável)",
                  "Finalização - Feedback e proposta"
                ],
                tempo_medio: "2-4 semanas dependendo da vaga",
                dicas: [
                  "Mantenha seu currículo atualizado e objetivo",
                  "Seja pontual e profissional",
                  "Pesquise sobre a empresa antes da entrevista",
                  "Seja autêntico e mostre suas experiências relevantes"
                ]
              }
            };
            break;

          case "listar_candidatos_por_etapa":
            if (!isRH) {
              result = { error: "Acesso negado" };
              break;
            }
            const { data: candidatosPorEtapa } = await supabase
              .from('candidatos')
              .select('id, nome, email, telefone, etapa_atual, enviado_em, vagas(titulo)')
              .eq('etapa_atual', args.etapa)
              .order('enviado_em', { ascending: false });
            result = candidatosPorEtapa || [];
            break;

          case "buscar_candidato_por_nome":
            if (!isRH) {
              result = { error: "Acesso negado" };
              break;
            }
            const { data: candidatosPorNome } = await supabase
              .from('candidatos')
              .select('id, nome, email, telefone, etapa_atual, enviado_em, vagas(titulo)')
              .ilike('nome', `%${args.nome}%`)
              .order('enviado_em', { ascending: false });
            result = candidatosPorNome || [];
            break;

          case "estatisticas_sistema":
            if (!isRH) {
              result = { error: "Acesso negado" };
              break;
            }
            const { count: totalCandidatos } = await supabase
              .from('candidatos')
              .select('*', { count: 'exact', head: true });
            
            const { count: totalVagas } = await supabase
              .from('vagas')
              .select('*', { count: 'exact', head: true });
            
            const { data: porEtapa } = await supabase
              .from('candidatos')
              .select('etapa_atual');
            
            const distribuicaoEtapas = porEtapa?.reduce((acc: any, c: any) => {
              acc[c.etapa_atual] = (acc[c.etapa_atual] || 0) + 1;
              return acc;
            }, {}) || {};

            result = {
              total_candidatos: totalCandidatos,
              total_vagas: totalVagas,
              distribuicao_etapas: distribuicaoEtapas
            };
            break;

          default:
            result = { error: "Função não encontrada" };
        }

        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify(result)
        });
      }

      // Make second AI call with tool results
      const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            aiResponse.choices[0].message,
            ...toolResults
          ],
          temperature: 0.7,
        }),
      });

      const finalAiResponse = await finalResponse.json();
      return new Response(JSON.stringify(finalAiResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(aiResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in assistente-ia function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
