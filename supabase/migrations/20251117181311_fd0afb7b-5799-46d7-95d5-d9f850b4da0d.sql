-- Criar enums para status e etapas
CREATE TYPE status_vaga AS ENUM ('ativa', 'pausada', 'encerrada');
CREATE TYPE etapa_candidato AS ENUM ('inscrito', 'triagem', 'entrevista', 'teste_tecnico', 'finalizado');

-- Tabela de vagas
CREATE TABLE public.vagas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  localidade TEXT NOT NULL,
  tipo_contrato TEXT NOT NULL,
  modelo_trabalho TEXT NOT NULL,
  area TEXT NOT NULL,
  requisitos TEXT NOT NULL,
  salario TEXT,
  status status_vaga DEFAULT 'ativa' NOT NULL,
  criada_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabela de candidatos
CREATE TABLE public.candidatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id UUID REFERENCES public.vagas(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  curriculo_url TEXT NOT NULL,
  etapa_atual etapa_candidato DEFAULT 'inscrito' NOT NULL,
  resumo_ia TEXT,
  enviado_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabela de notas internas
CREATE TABLE public.notas_internas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidato_id UUID REFERENCES public.candidatos(id) ON DELETE CASCADE NOT NULL,
  texto TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Tabela de perfis de usuários RH
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  email TEXT,
  criado_em TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.vagas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_internas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para vagas (área pública pode ver, apenas RH autenticado pode modificar)
CREATE POLICY "Vagas ativas são visíveis para todos"
ON public.vagas FOR SELECT
USING (status = 'ativa' OR auth.uid() IS NOT NULL);

CREATE POLICY "Apenas RH autenticado pode inserir vagas"
ON public.vagas FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Apenas RH autenticado pode atualizar vagas"
ON public.vagas FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Apenas RH autenticado pode deletar vagas"
ON public.vagas FOR DELETE
TO authenticated
USING (true);

-- Políticas para candidatos (público pode inserir, apenas RH pode ver)
CREATE POLICY "Qualquer pessoa pode se candidatar"
ON public.candidatos FOR INSERT
WITH CHECK (true);

CREATE POLICY "Apenas RH autenticado pode ver candidatos"
ON public.candidatos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Apenas RH autenticado pode atualizar candidatos"
ON public.candidatos FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Apenas RH autenticado pode deletar candidatos"
ON public.candidatos FOR DELETE
TO authenticated
USING (true);

-- Políticas para notas internas (apenas RH autenticado)
CREATE POLICY "Apenas RH autenticado pode ver notas"
ON public.notas_internas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Apenas RH autenticado pode criar notas"
ON public.notas_internas FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Apenas RH autenticado pode atualizar notas"
ON public.notas_internas FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Apenas RH autenticado pode deletar notas"
ON public.notas_internas FOR DELETE
TO authenticated
USING (true);

-- Políticas para profiles
CREATE POLICY "Usuários podem ver seu próprio perfil"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Usuários podem criar seu próprio perfil"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Função para criar perfil automaticamente ao cadastrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Criar bucket para currículos
INSERT INTO storage.buckets (id, name, public)
VALUES ('curriculos', 'curriculos', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para currículos (qualquer um pode fazer upload, apenas RH pode ver)
CREATE POLICY "Qualquer pessoa pode fazer upload de currículo"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'curriculos');

CREATE POLICY "Apenas RH autenticado pode ver currículos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'curriculos');

CREATE POLICY "Apenas RH autenticado pode deletar currículos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'curriculos');