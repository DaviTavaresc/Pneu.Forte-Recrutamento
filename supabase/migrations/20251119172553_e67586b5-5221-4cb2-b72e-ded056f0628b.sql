-- Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'rh', 'user');

-- Criar tabela de roles de usuários
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função para verificar se usuário tem role específica
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para verificar se usuário tem role de RH ou admin
CREATE OR REPLACE FUNCTION public.is_rh_or_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('rh', 'admin')
  )
$$;

-- Políticas RLS para user_roles
CREATE POLICY "Usuários podem ver seus próprios roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Apenas admins podem inserir roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Apenas admins podem atualizar roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Apenas admins podem deletar roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Atualizar políticas das tabelas existentes para usar a função de verificação de role
DROP POLICY IF EXISTS "Apenas RH autenticado pode ver candidatos" ON public.candidatos;
DROP POLICY IF EXISTS "Apenas RH autenticado pode atualizar candidatos" ON public.candidatos;
DROP POLICY IF EXISTS "Apenas RH autenticado pode deletar candidatos" ON public.candidatos;

CREATE POLICY "RH e admins podem ver candidatos"
ON public.candidatos
FOR SELECT
USING (public.is_rh_or_admin(auth.uid()));

CREATE POLICY "RH e admins podem atualizar candidatos"
ON public.candidatos
FOR UPDATE
USING (public.is_rh_or_admin(auth.uid()));

CREATE POLICY "RH e admins podem deletar candidatos"
ON public.candidatos
FOR DELETE
USING (public.is_rh_or_admin(auth.uid()));

-- Atualizar políticas de notas internas
DROP POLICY IF EXISTS "Apenas RH autenticado pode ver notas" ON public.notas_internas;
DROP POLICY IF EXISTS "Apenas RH autenticado pode criar notas" ON public.notas_internas;
DROP POLICY IF EXISTS "Apenas RH autenticado pode atualizar notas" ON public.notas_internas;
DROP POLICY IF EXISTS "Apenas RH autenticado pode deletar notas" ON public.notas_internas;

CREATE POLICY "RH e admins podem ver notas"
ON public.notas_internas
FOR SELECT
USING (public.is_rh_or_admin(auth.uid()));

CREATE POLICY "RH e admins podem criar notas"
ON public.notas_internas
FOR INSERT
WITH CHECK (public.is_rh_or_admin(auth.uid()));

CREATE POLICY "RH e admins podem atualizar notas"
ON public.notas_internas
FOR UPDATE
USING (public.is_rh_or_admin(auth.uid()));

CREATE POLICY "RH e admins podem deletar notas"
ON public.notas_internas
FOR DELETE
USING (public.is_rh_or_admin(auth.uid()));

-- Atualizar políticas de vagas
DROP POLICY IF EXISTS "Apenas RH autenticado pode inserir vagas" ON public.vagas;
DROP POLICY IF EXISTS "Apenas RH autenticado pode atualizar vagas" ON public.vagas;
DROP POLICY IF EXISTS "Apenas RH autenticado pode deletar vagas" ON public.vagas;
DROP POLICY IF EXISTS "Vagas ativas são visíveis para todos" ON public.vagas;

CREATE POLICY "Vagas ativas são visíveis para todos"
ON public.vagas
FOR SELECT
USING (status = 'ativa' OR public.is_rh_or_admin(auth.uid()));

CREATE POLICY "RH e admins podem inserir vagas"
ON public.vagas
FOR INSERT
WITH CHECK (public.is_rh_or_admin(auth.uid()));

CREATE POLICY "RH e admins podem atualizar vagas"
ON public.vagas
FOR UPDATE
USING (public.is_rh_or_admin(auth.uid()));

CREATE POLICY "RH e admins podem deletar vagas"
ON public.vagas
FOR DELETE
USING (public.is_rh_or_admin(auth.uid()));