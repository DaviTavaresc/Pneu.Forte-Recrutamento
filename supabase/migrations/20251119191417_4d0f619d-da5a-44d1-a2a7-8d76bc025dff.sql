-- Adicionar nova etapa 'reprovado' ao enum
ALTER TYPE etapa_candidato ADD VALUE IF NOT EXISTS 'reprovado';