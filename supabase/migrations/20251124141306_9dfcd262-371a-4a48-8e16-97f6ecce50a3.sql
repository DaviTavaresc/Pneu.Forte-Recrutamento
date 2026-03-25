-- Remover a política atual
DROP POLICY IF EXISTS "allow_insert_candidatos" ON public.candidatos;

-- Criar política específica para role anon (usuários não autenticados)
CREATE POLICY "anon_insert_candidatos"
ON public.candidatos
FOR INSERT
TO anon
WITH CHECK (true);

-- Criar política específica para role authenticated (usuários autenticados)  
CREATE POLICY "authenticated_insert_candidatos"
ON public.candidatos
FOR INSERT
TO authenticated
WITH CHECK (true);