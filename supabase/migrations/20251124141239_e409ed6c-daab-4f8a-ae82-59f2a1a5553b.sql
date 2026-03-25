-- SOLUÇÃO DEFINITIVA: Remover TODAS as políticas de INSERT e criar uma simples

-- Remover todas as políticas de INSERT existentes
DROP POLICY IF EXISTS "Candidaturas abertas para todos" ON public.candidatos;
DROP POLICY IF EXISTS "Permitir INSERT para anon" ON public.candidatos;
DROP POLICY IF EXISTS "Permitir INSERT para authenticated" ON public.candidatos;
DROP POLICY IF EXISTS "Qualquer pessoa pode se candidatar" ON public.candidatos;
DROP POLICY IF EXISTS "Permitir candidaturas sem login" ON public.candidatos;
DROP POLICY IF EXISTS "Candidatos podem se inscrever sem autenticação" ON public.candidatos;
DROP POLICY IF EXISTS "Usuários autenticados podem se candidatar" ON public.candidatos;

-- Criar política de INSERT que funciona para QUALQUER usuário (autenticado ou não)
CREATE POLICY "allow_insert_candidatos"
ON public.candidatos
FOR INSERT
WITH CHECK (true);

-- Garantir que a política se aplica a todos os roles
ALTER POLICY "allow_insert_candidatos" ON public.candidatos TO public;