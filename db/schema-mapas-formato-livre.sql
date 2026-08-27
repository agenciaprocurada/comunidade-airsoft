-- ============================================================
-- Comunidade Airsoft — formato 'livre' no criador de mapa
--
-- O formato livre espelha a proporcao da tela de quem edita: o
-- documento preenche a area de trabalho inteira, sem sobra. Virou o
-- padrao do editor; os formatos fixos continuam para quem exporta com
-- destino certo. As dimensoes exatas do documento viajam em
-- `dados.doc` (jsonb), entao nenhuma coluna nova e necessaria.
--
-- ALTER TYPE ... ADD VALUE nao roda dentro de transacao em Postgres
-- mais antigo; aplicar em autocommit.
-- ============================================================

alter type public.formato_mapa add value if not exists 'livre';
