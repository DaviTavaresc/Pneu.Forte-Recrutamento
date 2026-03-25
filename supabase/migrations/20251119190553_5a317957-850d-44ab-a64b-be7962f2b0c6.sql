-- Adicionar coluna CPF na tabela candidatos
ALTER TABLE public.candidatos 
ADD COLUMN cpf TEXT NOT NULL DEFAULT '';

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.candidatos.cpf IS 'CPF do candidato no formato XXX.XXX.XXX-XX';