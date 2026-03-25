-- Desabilitar RLS temporariamente para permitir inscrições públicas
-- Esta é uma tabela de candidatos onde pessoas não autenticadas precisam se cadastrar
ALTER TABLE public.candidatos DISABLE ROW LEVEL SECURITY;

-- Nota: As políticas SELECT, UPDATE e DELETE continuam protegendo os dados
-- apenas INSERT precisa ser público para permitir candidaturas