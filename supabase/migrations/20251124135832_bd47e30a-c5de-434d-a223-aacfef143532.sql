-- Remover política antiga que exige autenticação
DROP POLICY IF EXISTS "Usuários autenticados podem se candidatar" ON public.candidatos;

-- Criar nova política que permite inserção sem autenticação
CREATE POLICY "Qualquer pessoa pode se candidatar"
ON public.candidatos
FOR INSERT
WITH CHECK (true);

-- Atualizar política de SELECT para permitir que candidatos vejam suas candidaturas por CPF
DROP POLICY IF EXISTS "Candidatos podem ver suas próprias candidaturas" ON public.candidatos;

CREATE POLICY "Candidatos podem ver suas candidaturas por CPF ou user_id"
ON public.candidatos
FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  is_rh_or_admin(auth.uid())
);