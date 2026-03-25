-- Remover políticas antigas do bucket de currículos se existirem
DROP POLICY IF EXISTS "Permitir leitura pública de currículos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload de currículos autenticados" ON storage.objects;
DROP POLICY IF EXISTS "RH pode ver todos os currículos" ON storage.objects;

-- Política para permitir leitura pública de currículos (já que o bucket é público)
CREATE POLICY "Leitura pública de currículos"
ON storage.objects FOR SELECT
USING (bucket_id = 'curriculos');

-- Política para permitir usuários autenticados fazerem upload
CREATE POLICY "Upload de currículos para autenticados"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'curriculos' 
  AND auth.uid() IS NOT NULL
);

-- Política para RH e admins gerenciarem currículos
CREATE POLICY "RH pode gerenciar currículos"
ON storage.objects FOR ALL
USING (
  bucket_id = 'curriculos' 
  AND is_rh_or_admin(auth.uid())
);