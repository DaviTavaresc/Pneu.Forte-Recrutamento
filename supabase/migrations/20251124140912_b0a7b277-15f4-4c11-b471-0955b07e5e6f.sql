-- Remover política que exige autenticação para upload de currículos
DROP POLICY IF EXISTS "Upload de currículos para autenticados" ON storage.objects;

-- A política "Qualquer pessoa pode fazer upload de currículo" já permite uploads sem autenticação
-- Não precisa criar nada novo, apenas garantir que não há conflito