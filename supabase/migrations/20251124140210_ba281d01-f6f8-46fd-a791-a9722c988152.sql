-- Remover TODAS as políticas de INSERT existentes
DROP POLICY IF EXISTS "Permitir candidaturas sem login" ON public.candidatos;
DROP POLICY IF EXISTS "Qualquer pessoa pode se candidatar" ON public.candidatos;
DROP POLICY IF EXISTS "Usuários autenticados podem se candidatar" ON public.candidatos;

-- Criar política que permite INSERT para usuário anônimo (não autenticado)
-- Usando apenas WITH CHECK sem USING permite INSERT sem restrições
CREATE POLICY "Candidatos podem se inscrever sem autenticação"
ON public.candidatos
FOR INSERT
WITH CHECK (
  -- Permite inserção se user_id é null (candidatos não autenticados)
  -- OU se user_id corresponde ao usuário autenticado
  user_id IS NULL OR user_id = auth.uid()
);