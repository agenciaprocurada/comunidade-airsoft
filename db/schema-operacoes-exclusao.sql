-- ============================================================
-- Excluir operação
--
-- A área do organizador tinha criar, ler e editar — faltava apagar.
-- Não faltava só o botão: não existia policy de DELETE em
-- `operacoes`, e sem policy o delete volta "0 linhas" em silêncio.
-- A tela mostraria sucesso e o evento continuaria na agenda.
--
-- Aplicar DEPOIS de db/schema-operacoes.sql.
-- ============================================================

-- ------------------------------------------------------------
-- O organizador apaga o que é dele
--
-- Os lados e as inscrições já saem junto pelo `on delete cascade`
-- das chaves estrangeiras — cascata do Postgres não passa por RLS,
-- então não é preciso policy nas tabelas filhas.
--
-- A trava de "tem gente na lista" NÃO mora aqui: apagar um evento
-- com 20 confirmados é decisão do organizador, e ele confirma o
-- aviso na tela antes. O banco só garante que ninguém apague evento
-- dos outros.
-- ------------------------------------------------------------

drop policy if exists operacoes_apaga_o_organizador on public.operacoes;
create policy operacoes_apaga_o_organizador on public.operacoes
  for delete to authenticated
  using (organizador_id = auth.uid() or public.e_admin());

