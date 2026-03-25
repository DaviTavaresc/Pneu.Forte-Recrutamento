import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  FileText, 
  Mail, 
  Phone, 
  Calendar, 
  Download, 
  XCircle,
  Building2 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

type EtapaCandidato = Database['public']['Enums']['etapa_candidato'];

const ETAPAS: { id: EtapaCandidato; nome: string; cor: string }[] = [
  { id: 'inscrito', nome: 'Inscritos', cor: 'bg-blue-500' },
  { id: 'triagem', nome: 'Triagem', cor: 'bg-yellow-500' },
  { id: 'entrevista', nome: 'Entrevista', cor: 'bg-purple-500' },
  { id: 'teste_tecnico', nome: 'Teste Técnico', cor: 'bg-orange-500' },
  { id: 'finalizado', nome: 'Finalizado', cor: 'bg-green-500' },
  { id: 'reprovado', nome: 'Não Aprovado', cor: 'bg-red-500' },
];

export function PipelineCandidatos() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notaTexto, setNotaTexto] = useState('');
  const [candidatoSelecionado, setCandidatoSelecionado] = useState<string | null>(null);

  const { data: candidatos = [], isLoading } = useQuery({
    queryKey: ['candidatos-pipeline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidatos')
        .select('*, vagas(titulo)');
      if (error) throw error;
      return data;
    },
  });

  const { data: notas = [] } = useQuery({
    queryKey: ['notas-internas', candidatoSelecionado],
    queryFn: async () => {
      if (!candidatoSelecionado) return [];
      const { data, error } = await supabase
        .from('notas_internas')
        .select('*')
        .eq('candidato_id', candidatoSelecionado)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!candidatoSelecionado,
  });

  const atualizarEtapa = useMutation({
    mutationFn: async ({ id, etapa }: { id: string; etapa: EtapaCandidato }) => {
      const { error } = await supabase
        .from('candidatos')
        .update({ etapa_atual: etapa })
        .eq('id', id);
      if (error) throw error;

      await supabase.functions.invoke('enviar-email-etapa', {
        body: { candidato_id: id, nova_etapa: etapa },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidatos-pipeline'] });
      toast({
        title: "Etapa atualizada",
        description: "Candidato movido com sucesso!",
      });
    },
  });

  const adicionarNota = useMutation({
    mutationFn: async ({ candidato_id, texto }: { candidato_id: string; texto: string }) => {
      const { error } = await supabase
        .from('notas_internas')
        .insert({ candidato_id, texto });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notas-internas'] });
      setNotaTexto('');
      toast({
        title: "Nota adicionada",
        description: "Nota interna salva com sucesso!",
      });
    },
  });

  const deletarCandidato = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('candidatos')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidatos-pipeline'] });
      toast({
        title: "Candidato removido",
        description: "A candidatura foi removida permanentemente do sistema.",
      });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const candidatoId = result.draggableId;
    const novaEtapa = result.destination.droppableId as EtapaCandidato;

    atualizarEtapa.mutate({ id: candidatoId, etapa: novaEtapa });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {ETAPAS.map((etapa) => {
            const candidatosEtapa = candidatos.filter((c) => c.etapa_atual === etapa.id);
            
            return (
              <Droppable key={etapa.id} droppableId={etapa.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="w-80 flex-shrink-0"
                  >
                    <Card className={`neo-glass ${snapshot.isDraggingOver ? 'ring-2 ring-primary' : ''}`}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${etapa.cor}`} />
                            {etapa.nome}
                          </CardTitle>
                          <Badge variant="secondary">{candidatosEtapa.length}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                        {candidatosEtapa.map((candidato, index) => (
                          <Draggable
                            key={candidato.id}
                            draggableId={candidato.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Card
                                      className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${
                                        snapshot.isDragging ? 'rotate-3 shadow-2xl' : ''
                                      }`}
                                      onClick={() => setCandidatoSelecionado(candidato.id)}
                                    >
                                       <CardContent className="p-4 space-y-2">
                                        <div className="font-semibold">{candidato.nome}</div>
                                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                                          <Building2 className="h-3 w-3" />
                                          {candidato.vagas?.titulo || 'Vaga não encontrada'}
                                        </div>
                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          {new Date(candidato.enviado_em).toLocaleDateString('pt-BR')}
                                        </div>
                                        {candidato.cpf && (
                                          <div className="text-xs text-muted-foreground">
                                            CPF: {candidato.cpf}
                                          </div>
                                        )}
                                        {candidato.resumo_ia && (
                                          <div className="text-xs bg-primary/10 p-2 rounded-md mt-2">
                                            <strong>IA:</strong> {candidato.resumo_ia}
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>Detalhes do Candidato</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <h3 className="font-bold text-xl">{candidato.nome}</h3>
                                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                                          <span className="flex items-center gap-1">
                                            <Mail className="h-4 w-4" />
                                            {candidato.email}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <Phone className="h-4 w-4" />
                                            {candidato.telefone}
                                          </span>
                                          {candidato.cpf && (
                                            <span className="flex items-center gap-1">
                                              <FileText className="h-4 w-4" />
                                              CPF: {candidato.cpf}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div>
                                        <strong>Vaga:</strong> {candidato.vagas?.titulo}
                                      </div>

                                      {candidato.resumo_ia && (
                                        <div className="bg-primary/10 p-4 rounded-lg">
                                          <strong className="flex items-center gap-2 mb-2">
                                            <FileText className="h-4 w-4" />
                                            Resumo IA
                                          </strong>
                                          <p className="text-sm">{candidato.resumo_ia}</p>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-2"
                                            onClick={async () => {
                                              toast({ title: "Regenerando resumo...", description: "Aguarde um momento." });
                                               const { error } = await supabase.functions.invoke('gerar-resumo-curriculo', {
                                                body: { 
                                                  candidato_id: candidato.id, 
                                                  curriculo_url: candidato.curriculo_url 
                                                }
                                              });
                                              if (error) {
                                                toast({ 
                                                  title: "Erro", 
                                                  description: "Não foi possível regenerar o resumo.",
                                                  variant: "destructive"
                                                });
                                              } else {
                                                toast({ title: "Sucesso!", description: "Resumo regenerado com sucesso." });
                                                queryClient.invalidateQueries({ queryKey: ['candidatos-pipeline'] });
                                              }
                                            }}
                                          >
                                            Regenerar Resumo
                                          </Button>
                                        </div>
                                      )}

                                      <div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={async () => {
                                            try {
                                              const response = await fetch(candidato.curriculo_url);
                                              const blob = await response.blob();
                                              const url = window.URL.createObjectURL(blob);
                                              const link = document.createElement('a');
                                              link.href = url;
                                              link.download = `curriculo_${candidato.nome.replace(/\s+/g, '_')}.pdf`;
                                              document.body.appendChild(link);
                                              link.click();
                                              document.body.removeChild(link);
                                              window.URL.revokeObjectURL(url);
                                              toast({
                                                title: "Download iniciado",
                                                description: "O currículo está sendo baixado.",
                                              });
                                            } catch (error) {
                                              toast({
                                                title: "Erro no download",
                                                description: "Não foi possível baixar o currículo.",
                                                variant: "destructive",
                                              });
                                            }
                                          }}
                                        >
                                          <Download className="h-4 w-4 mr-2" />
                                          Baixar Currículo
                                        </Button>
                                      </div>

                                      {candidato.etapa_atual !== 'reprovado' ? (
                                        <div className="space-y-2">
                                          <Button
                                            variant="destructive"
                                            size="sm"
                                            className="w-full"
                                            onClick={async () => {
                                              if (confirm(`Tem certeza que deseja reprovar ${candidato.nome}? Será enviado um e-mail de agradecimento.`)) {
                                                await atualizarEtapa.mutateAsync({ 
                                                  id: candidato.id, 
                                                  etapa: 'reprovado' 
                                                });
                                              }
                                            }}
                                          >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Reprovar Candidato
                                          </Button>
                                          
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                                            onClick={async () => {
                                              if (confirm(`⚠️ ATENÇÃO: Deseja REMOVER PERMANENTEMENTE a candidatura de ${candidato.nome}? Esta ação NÃO pode ser desfeita e NÃO enviará email ao candidato.`)) {
                                                if (confirm('Confirme novamente: Esta ação é IRREVERSÍVEL!')) {
                                                  await deletarCandidato.mutateAsync(candidato.id);
                                                }
                                              }
                                            }}
                                          >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Remover Permanentemente
                                          </Button>
                                        </div>
                                      ) : (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                                          onClick={async () => {
                                            if (confirm(`⚠️ ATENÇÃO: Deseja REMOVER PERMANENTEMENTE a candidatura de ${candidato.nome}? Esta ação NÃO pode ser desfeita.`)) {
                                              if (confirm('Confirme novamente: Esta ação é IRREVERSÍVEL!')) {
                                                await deletarCandidato.mutateAsync(candidato.id);
                                              }
                                            }
                                          }}
                                        >
                                          <XCircle className="h-4 w-4 mr-2" />
                                          Remover Permanentemente
                                        </Button>
                                      )}

                                      <div>
                                        <h4 className="font-semibold mb-2">Notas Internas</h4>
                                        <div className="space-y-2 mb-4">
                                          {notas.map((nota) => (
                                            <div key={nota.id} className="bg-muted p-3 rounded-lg text-sm">
                                              <p>{nota.texto}</p>
                                              <p className="text-xs text-muted-foreground mt-1">
                                                {new Date(nota.criado_em).toLocaleString('pt-BR')}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                        <div className="space-y-2">
                                          <Textarea
                                            placeholder="Adicionar nota interna..."
                                            value={notaTexto}
                                            onChange={(e) => setNotaTexto(e.target.value)}
                                          />
                                          <Button
                                            onClick={() => {
                                              if (notaTexto.trim() && candidatoSelecionado) {
                                                adicionarNota.mutate({
                                                  candidato_id: candidatoSelecionado,
                                                  texto: notaTexto,
                                                });
                                              }
                                            }}
                                            disabled={!notaTexto.trim()}
                                          >
                                            Adicionar Nota
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </div>
    </DragDropContext>
  );
}