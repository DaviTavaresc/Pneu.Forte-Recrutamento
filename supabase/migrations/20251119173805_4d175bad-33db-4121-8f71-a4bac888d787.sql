-- Garantir que a tabela profiles existe e está configurada corretamente
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nome TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles (usuários podem ver e atualizar apenas seu próprio perfil)
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem ver seu próprio perfil" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem criar seu próprio perfil" ON public.profiles;
CREATE POLICY "Usuários podem criar seu próprio perfil" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Adicionar coluna user_id na tabela candidatos (nullable para permitir candidaturas anônimas)
ALTER TABLE public.candidatos 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Atualizar políticas de candidatos para permitir que usuários vejam suas próprias candidaturas
DROP POLICY IF EXISTS "Candidatos podem ver suas próprias candidaturas" ON public.candidatos;
CREATE POLICY "Candidatos podem ver suas próprias candidaturas" 
  ON public.candidatos FOR SELECT 
  USING (auth.uid() = user_id OR is_rh_or_admin(auth.uid()));

-- Atualizar política de inserção para permitir que usuários autenticados se candidatem
DROP POLICY IF EXISTS "Qualquer pessoa pode se candidatar" ON public.candidatos;
CREATE POLICY "Usuários autenticados podem se candidatar" 
  ON public.candidatos FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Função para criar perfil automaticamente quando usuário se registra
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
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();