-- Remover todas as políticas antigas de INSERT na tabela candidatos
DROP POLICY IF EXISTS "Qualquer pessoa pode se candidatar" ON public.candidatos;
DROP POLICY IF EXISTS "Usuários autenticados podem se candidatar" ON public.candidatos;

-- Criar política que permite inserção sem autenticação (para role anon e authenticated)
CREATE POLICY "Permitir candidaturas sem login"
ON public.candidatos
FOR INSERT
TO public, anon, authenticated
WITH CHECK (true);