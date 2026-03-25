-- TESTE: Vamos desabilitar RLS temporariamente para confirmar que é isso
ALTER TABLE public.candidatos DISABLE ROW LEVEL SECURITY;

-- Comentário: Isso é apenas para teste. Vamos reativar em seguida com políticas corretas.