-- ============================================================
-- Comunidade Airsoft — elenco so para quem e da equipe
--
-- Ate aqui `equipe_elenco` era publica: qualquer visitante (e qualquer
-- chamada anonima da API) lia nome, apelido e foto de todo mundo que
-- esta numa equipe. Vira dado fechado.
--
-- QUEM VE O QUE, a partir de agora:
--   - de fora (anonimo ou logado sem vinculo): so o NUMERO, que sai da
--     view `equipe_vitrine` e e agregado — nao carrega pessoa nenhuma;
--   - membro ativo da equipe: a lista com nome, apelido e foto;
--   - admin: tudo, para moderar.
--
-- A trava fica AQUI, e nao na tela. Esconder a lista no HTML deixaria
-- a mesma consulta aberta na API com a chave anon, que e publica por
-- definicao — seria cortina, nao porta.
--
-- A view continua `security_invoker = false` pelo motivo de sempre: a
-- RLS de `perfis` so libera a propria linha, entao com invoker o join
-- devolveria elenco vazio ate para quem e da equipe. O que autoriza
-- agora e o filtro dentro da view.
--
-- Aplicar DEPOIS de db/schema-equipes.sql.
-- ============================================================

drop view if exists public.equipe_elenco;

create view public.equipe_elenco
with (security_invoker = false) as
select
  m.equipe_id,
  m.usuario_id,
  m.papel,
  m.criado_em as membro_desde,
  p.nome,
  p.nickname,
  p.foto_url
from public.equipe_membros m
join public.perfis p on p.id = m.usuario_id
where m.status = 'ativo'
  -- `e_membro_da_equipe` e `e_admin` sao `security definer` e leem
  -- `auth.uid()`: numa chamada anonima nao ha uid, as duas devolvem
  -- falso e a view responde vazio. E o comportamento certo — a ficha
  -- publica ja mostra a contagem por outro caminho.
  and (public.e_membro_da_equipe(m.equipe_id) or public.e_admin());

grant select on public.equipe_elenco to anon, authenticated;

-- ------------------------------------------------------------
-- A porta dos fundos: `equipe_membros`
--
-- Fechar so a view seria meia solucao. A policy antiga
-- (`equipe_membros_leitura_anon`) liberava para QUALQUER UM toda linha
-- com status ativo: nao devolvia nome, mas devolvia a composicao da
-- equipe em uuid, e uuid de usuario e identificador de pessoa do mesmo
-- jeito. Quem manda na resposta passa a ser o vinculo.
--
-- O que continua funcionando, e por que:
--   - a pessoa lendo os PROPRIOS vinculos (`/conta/equipes`) —
--     `usuario_id = auth.uid()`;
--   - o lider administrando a equipe — `e_lider_da_equipe`;
--   - membro vendo o elenco — `e_membro_da_equipe`;
--   - `inscrever_equipe` e as demais funcoes `security definer`, que
--     nao passam por RLS.
-- ------------------------------------------------------------

drop policy if exists equipe_membros_leitura_anon on public.equipe_membros;

drop policy if exists equipe_membros_leitura on public.equipe_membros;
create policy equipe_membros_leitura on public.equipe_membros
  for select to authenticated using (
    usuario_id = auth.uid()
    or public.e_membro_da_equipe(equipe_id)
    or public.e_lider_da_equipe(equipe_id)
    or public.e_admin()
  );
