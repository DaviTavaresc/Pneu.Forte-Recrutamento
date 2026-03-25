-- Solução: Criar uma política que funciona para TODOS os casos
-- Remover políticas anteriores
DROP POLICY IF EXISTS "Permitir INSERT para anon" ON public.candidatos;
DROP POLICY IF EXISTS "Permitir INSERT para authenticated" ON public.candidatos;

-- Criar UMA política universal que permite INSERT sempre
-- Esta política se aplica a todos os roles (public = todos)
CREATE POLICY "Candidaturas abertas para todos"
ON public.candidatos
FOR INSERT
TO public
WITH CHECK (true);

-- Comentário: Esta política permite que qualquer pessoa (autenticada ou não) 
-- possa se candidatar às vagas. A segurança dos dados é mantida através
-- das políticas de SELECT, UPDATE e DELETE que já existem.