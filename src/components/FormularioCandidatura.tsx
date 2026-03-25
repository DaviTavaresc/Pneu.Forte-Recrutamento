import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

interface FormularioCandidaturaProps {
  vagaId: string;
  vagaTitulo: string;
}

interface FormData {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  curriculo: FileList;
  lgpd: boolean;
}

export function FormularioCandidatura({ vagaId, vagaTitulo }: FormularioCandidaturaProps) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    
    try {
      const file = data.curriculo[0];
      
      // Upload do currículo
      const fileName = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('curriculos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('curriculos')
        .getPublicUrl(fileName);

      // Criar candidatura (user_id é null para candidatos não autenticados)
      const { data: candidato, error: candidatoError } = await supabase
        .from('candidatos')
        .insert({
          vaga_id: vagaId,
          user_id: null,
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
          cpf: data.cpf,
          curriculo_url: publicUrl,
          etapa_atual: 'inscrito',
        })
        .select()
        .single();

      if (candidatoError) throw candidatoError;

      // Enviar e-mail de confirmação (assíncrono - não bloqueia o fluxo)
      supabase.functions.invoke('enviar-email-etapa', {
        body: {
          candidato_id: candidato.id,
          nova_etapa: 'inscrito'
        }
      }).catch(error => {
        console.error('Erro ao enviar e-mail:', error);
        // Email é opcional, não impede a candidatura
      });

      // Gerar resumo com IA (assíncrono) - não precisa aguardar
      supabase.functions.invoke('gerar-resumo-curriculo', {
        body: {
          candidato_id: candidato.id,
          curriculo_url: publicUrl
        }
      });

      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Erro ao enviar candidatura:', error);
      toast.error('Erro ao enviar candidatura. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="glass-card p-4 md:p-8 animate-scale-in">
        <h2 className="text-xl md:text-2xl font-bold text-primary mb-4 md:mb-6">Candidate-se Agora</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
          <div>
            <Label htmlFor="nome" className="text-foreground">Nome Completo</Label>
            <Input
              id="nome"
              {...register("nome", { required: "Nome é obrigatório" })}
              className="mt-2"
              placeholder="Seu nome completo"
            />
            {errors.nome && (
              <p className="text-sm text-red-500 mt-1">{errors.nome.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email" className="text-foreground">E-mail</Label>
            <Input
              id="email"
              type="email"
              {...register("email", { 
                required: "E-mail é obrigatório",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "E-mail inválido"
                }
              })}
              className="mt-2"
              placeholder="seu@email.com"
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="telefone" className="text-foreground">Telefone</Label>
            <Input
              id="telefone"
              {...register("telefone", { required: "Telefone é obrigatório" })}
              className="mt-2"
              placeholder="(XX) XXXXX-XXXX"
            />
            {errors.telefone && (
              <p className="text-sm text-red-500 mt-1">{errors.telefone.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="cpf" className="text-foreground">CPF</Label>
            <Input
              id="cpf"
              {...register("cpf", { 
                required: "CPF é obrigatório",
                pattern: {
                  value: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
                  message: "CPF inválido. Use o formato: XXX.XXX.XXX-XX"
                }
              })}
              className="mt-2"
              placeholder="000.000.000-00"
              maxLength={14}
            />
            {errors.cpf && (
              <p className="text-sm text-red-500 mt-1">{errors.cpf.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="curriculo" className="text-foreground">Currículo (PDF)</Label>
            <div className="mt-2 relative">
              <Input
                id="curriculo"
                type="file"
                accept=".pdf"
                {...register("curriculo", { required: "Currículo é obrigatório" })}
                className="cursor-pointer"
              />
              <Upload className="absolute right-3 top-3 h-5 w-5 text-primary pointer-events-none" />
            </div>
            {errors.curriculo && (
              <p className="text-sm text-red-500 mt-1">{errors.curriculo.message}</p>
            )}
          </div>

          <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-lg border border-border/50">
            <Controller
              name="lgpd"
              control={control}
              rules={{ required: "Você deve aceitar os termos da LGPD para continuar" }}
              render={({ field }) => (
                <Checkbox
                  id="lgpd"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <div className="flex-1">
              <Label 
                htmlFor="lgpd" 
                className="text-sm text-foreground leading-relaxed cursor-pointer"
              >
                Autorizo o tratamento dos meus dados pessoais pela Pneu Forte conforme a{" "}
                <strong>Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018)</strong>. 
                Os dados fornecidos serão utilizados exclusivamente para fins de recrutamento 
                e seleção, sendo armazenados de forma segura e não compartilhados com terceiros 
                sem autorização prévia.
              </Label>
              {errors.lgpd && (
                <p className="text-sm text-red-500 mt-2">{errors.lgpd.message}</p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary text-lg py-6"
          >
            {isLoading ? "Enviando..." : "Enviar Candidatura"}
          </Button>
        </form>
      </div>

      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto bg-background border-primary/20 p-4 md:p-6">
          <DialogHeader>
            <div className="flex justify-center mb-3 md:mb-4">
              <div className="rounded-full bg-primary/10 p-2 md:p-3 animate-scale-in">
                <CheckCircle2 className="h-8 w-8 md:h-12 md:w-12 text-primary animate-glow-pulse" />
              </div>
            </div>
            <DialogTitle className="text-lg md:text-2xl text-center text-primary">
              Obrigado por se candidatar à Pneu Forte!
            </DialogTitle>
            <DialogDescription className="text-center text-foreground/80 text-sm md:text-base pt-3 md:pt-4">
              Sua candidatura para a vaga <strong className="text-primary">{vagaTitulo}</strong> foi enviada com sucesso.
              <br /><br />
              Nossa equipe analisará seu perfil e você receberá notícias por e-mail.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4 md:mt-6">
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                navigate('/');
              }}
              className="btn-primary w-full sm:w-auto"
            >
              Voltar para vagas
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}