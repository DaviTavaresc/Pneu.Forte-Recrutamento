-- Reativar RLS
ALTER TABLE public.candidatos ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas de INSERT
DROP POLICY IF EXISTS "anon_insert_candidatos" ON public.candidatos;
DROP POLICY IF EXISTS "authenticated_insert_candidatos" ON public.candidatos;

-- Criar política simples e funcional para INSERT que permite a todos
-- Usando uma abordagem diferente: sem restrição de role
CREATE POLICY "enable_insert_for_all"
ON public.candidatos
FOR INSERT
WITH CHECK (true);

-- Garantir que esta política não tem restrição de role (aplica a todos)
-- A política já está criada sem TO clause, então se aplica a PUBLIC por padrão