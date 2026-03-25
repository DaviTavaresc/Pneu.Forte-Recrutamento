-- Remover TODAS as políticas de INSERT anteriores
DROP POLICY IF EXISTS "Candidatos podem se inscrever sem autenticação" ON public.candidatos;
DROP POLICY IF EXISTS "Permitir candidaturas sem login" ON public.candidatos;
DROP POLICY IF EXISTS "Qualquer pessoa pode se candidatar" ON public.candidatos;

-- Criar política simples que permite INSERT para role anon (não autenticado)
CREATE POLICY "Permitir INSERT para anon"
ON public.candidatos
FOR INSERT
TO anon
WITH CHECK (true);

-- Criar política para usuários autenticados
CREATE POLICY "Permitir INSERT para authenticated"
ON public.candidatos
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);