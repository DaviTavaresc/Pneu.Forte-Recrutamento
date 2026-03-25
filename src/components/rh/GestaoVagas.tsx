import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

export function GestaoVagas() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoVaga, setEditandoVaga] = useState<any>(null);

  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    requisitos: '',
    area: '',
    localidade: '',
    modelo_trabalho: '',
    tipo_contrato: '',
    salario: '',
    carga_horaria: '',
    beneficios: '',
    status: 'ativa' as 'ativa' | 'pausada' | 'encerrada',
  });

  const { data: vagas = [], isLoading } = useQuery({
    queryKey: ['vagas-gestao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vagas')
        .select('*')
        .order('criada_em', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const salvarVaga = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editandoVaga) {
        const { error } = await supabase
          .from('vagas')
          .update(data)
          .eq('id', editandoVaga.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vagas')
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vagas-gestao'] });
      setDialogOpen(false);
      setEditandoVaga(null);
      resetForm();
      toast({
        title: editandoVaga ? "Vaga atualizada" : "Vaga criada",
        description: "Operação realizada com sucesso!",
      });
    },
  });

  const deletarVaga = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vagas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vagas-gestao'] });
      toast({
        title: "Vaga deletada",
        description: "Vaga removida com sucesso!",
      });
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ativa' | 'pausada' | 'encerrada' }) => {
      const { error } = await supabase
        .from('vagas')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vagas-gestao'] });
    },
  });

  const resetForm = () => {
    setFormData({
      titulo: '',
      descricao: '',
      requisitos: '',
      area: '',
      localidade: '',
      modelo_trabalho: '',
      tipo_contrato: '',
      salario: '',
      carga_horaria: '',
      beneficios: '',
      status: 'ativa',
    });
  };

  const handleEdit = (vaga: any) => {
    setEditandoVaga(vaga);
    setFormData({
      titulo: vaga.titulo,
      descricao: vaga.descricao,
      requisitos: vaga.requisitos,
      area: vaga.area,
      localidade: vaga.localidade,
      modelo_trabalho: vaga.modelo_trabalho,
      tipo_contrato: vaga.tipo_contrato,
      salario: vaga.salario || '',
      carga_horaria: vaga.carga_horaria || '',
      beneficios: vaga.beneficios || '',
      status: vaga.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    salvarVaga.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestão de Vagas</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditandoVaga(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Vaga
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editandoVaga ? 'Editar Vaga' : 'Nova Vaga'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="titulo">Título da Vaga</Label>
                  <Input
                    id="titulo"
                    value={formData.titulo}
                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="requisitos">Requisitos</Label>
                  <Textarea
                    id="requisitos"
                    value={formData.requisitos}
                    onChange={(e) => setFormData({ ...formData, requisitos: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="area">Área</Label>
                  <Input
                    id="area"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="localidade">Localidade</Label>
                  <Input
                    id="localidade"
                    value={formData.localidade}
                    onChange={(e) => setFormData({ ...formData, localidade: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="modelo_trabalho">Modelo de Trabalho</Label>
                  <Select
                    value={formData.modelo_trabalho}
                    onValueChange={(value) => setFormData({ ...formData, modelo_trabalho: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="presencial">Presencial</SelectItem>
                      <SelectItem value="remoto">Remoto</SelectItem>
                      <SelectItem value="hibrido">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tipo_contrato">Tipo de Contrato</Label>
                  <Select
                    value={formData.tipo_contrato}
                    onValueChange={(value) => setFormData({ ...formData, tipo_contrato: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLT">CLT</SelectItem>
                      <SelectItem value="PJ">PJ</SelectItem>
                      <SelectItem value="Estágio">Estágio</SelectItem>
                      <SelectItem value="Temporário">Temporário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="salario">Salário (opcional)</Label>
                  <Input
                    id="salario"
                    value={formData.salario}
                    onChange={(e) => setFormData({ ...formData, salario: e.target.value })}
                    placeholder="Ex: R$ 5.000 - R$ 8.000"
                  />
                </div>

                <div>
                  <Label htmlFor="carga_horaria">Carga Horária (opcional)</Label>
                  <Input
                    id="carga_horaria"
                    value={formData.carga_horaria}
                    onChange={(e) => setFormData({ ...formData, carga_horaria: e.target.value })}
                    placeholder="Ex: 44h semanais"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="beneficios">Benefícios (opcional)</Label>
                  <Textarea
                    id="beneficios"
                    value={formData.beneficios}
                    onChange={(e) => setFormData({ ...formData, beneficios: e.target.value })}
                    rows={3}
                    placeholder="Ex: Vale transporte, vale alimentação, plano de saúde..."
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativa">Ativa</SelectItem>
                      <SelectItem value="pausada">Pausada</SelectItem>
                      <SelectItem value="encerrada">Encerrada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editandoVaga ? 'Atualizar' : 'Criar'} Vaga
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vagas.map((vaga) => (
          <Card key={vaga.id} className="neo-glass">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{vaga.titulo}</CardTitle>
                  <Badge
                    variant={
                      vaga.status === 'ativa' ? 'default' : 
                      vaga.status === 'pausada' ? 'secondary' : 
                      'destructive'
                    }
                  >
                    {vaga.status}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const novoStatus = vaga.status === 'ativa' ? 'pausada' : 'ativa';
                    toggleStatus.mutate({ id: vaga.id, status: novoStatus });
                  }}
                >
                  {vaga.status === 'ativa' ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground space-y-1">
                <div><strong>Área:</strong> {vaga.area}</div>
                <div><strong>Local:</strong> {vaga.localidade}</div>
                <div><strong>Modelo:</strong> {vaga.modelo_trabalho}</div>
                <div><strong>Contrato:</strong> {vaga.tipo_contrato}</div>
                {vaga.carga_horaria && <div><strong>Carga Horária:</strong> {vaga.carga_horaria}</div>}
                {vaga.salario && <div><strong>Salário:</strong> {vaga.salario}</div>}
                {vaga.beneficios && <div><strong>Benefícios:</strong> {vaga.beneficios}</div>}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(vaga)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm('Tem certeza que deseja deletar esta vaga?')) {
                      deletarVaga.mutate(vaga.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}