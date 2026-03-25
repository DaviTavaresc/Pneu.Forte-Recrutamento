-- Tornar o bucket de currículos público para permitir visualização dos PDFs
UPDATE storage.buckets 
SET public = true 
WHERE id = 'curriculos';