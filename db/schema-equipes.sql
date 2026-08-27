-- ============================================================
-- Comunidade Airsoft — equipes
--
-- Vocabulario travado aqui, porque a palavra "time" e ambigua no
-- dominio: EQUIPE e a agremiacao permanente (R.I.S.E, NOMAD) e vive
-- nesta tabela. O lado que a pessoa joga numa operacao (PMC x
-- Militar) NAO e isto e vai se chamar `lado` no schema de operacoes.
--
-- Decisoes estruturais que este schema trava:
--
-- 1. NINGUEM ENTRA SOZINHO NUMA EQUIPE. Equipe e reputacao: se a
--    adesao fosse livre, qualquer um se declararia membro de equipe
--    conhecida. Toda entrada nasce `pendente` e so o lider aprova.
--    O status inicial e travado por gatilho, nao pela tela.
--
-- 2. VINCULO N:N, com UMA equipe marcada como principal. E a que
--    aparece do lado do nome na lista da operacao. Indice unico
--    parcial garante que nao existam duas principais ativas.
--
-- 3. EQUIPE NAO TEM PONTUACAO, NIVEL NEM RANKING. PRODUCT.md fecha
--    essa porta de proposito ("sem gamificacao, sem ranking"). Se
--    aparecer coluna de score aqui, o produto virou outra coisa.
--
-- 4. HISTORICO PRESERVADO. Sair da equipe nao apaga a linha, muda o
--    status. Saber que fulano foi da equipe X ate abril importa.
--
-- Aplicar DEPOIS de db/schema-usuarios.sql e db/schema-reivindicacoes.sql
-- (usa `perfis`, `tocar_atualizado_em` e `e_admin`).
-- ============================================================

-- ------------------------------------------------------------
-- Tipos
-- ------------------------------------------------------------

do $$ begin
  create type public.papel_equipe as enum ('lider','membro');
exception when duplicate_object then null; end $$;

-- `saiu` e `removido` sao estados finais distintos de proposito:
-- um e decisao da pessoa, o outro da lideranca.
do $$ begin
  create type public.status_membro as enum
    ('pendente','ativo','recusado','saiu','removido');
exception when duplicate_object then null; end $$;

-- Quem comecou o vinculo decide quem tem que aceitar. Sem esta coluna
-- os dois lados ficam iguais em `pendente` e nao da para saber se
-- falta o lider aprovar ou a pessoa aceitar.
do $$ begin
  create type public.origem_vinculo as enum ('pedido','convite');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- Equipes
-- ------------------------------------------------------------

create table if not exists public.equipes (
  id            uuid primary key default gen_random_uuid(),

  nome          text not null,
  -- A sigla que o pessoal escreve na lista do grupo ("R.I.S.E").
  -- Nao e unica: siglas curtas colidem legitimamente entre estados.
  sigla         text,
  slug          text not null,

  -- Mesma base de segmentacao dos perfis e das fichas: a equipe
  -- aparece na busca por regiao.
  uf            char(2),
  cidade        text,
  cidade_slug   text,

  descricao     text,
  logo_url      text,
  -- { "instagram": "...", "whatsapp": "..." }
  redes         jsonb not null default '{}'::jsonb,

  -- Mesmo criterio das fichas de campo e loja: nasce nao verificada.
  -- Nao ha auto-verificacao; quem marca e admin.
  verificada    boolean not null default false,

  criada_por    uuid references auth.users(id) on delete set null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint equipes_nome_tamanho  check (char_length(trim(nome)) between 2 and 60),
  constraint equipes_slug_forma    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint equipes_uf_maiuscula  check (uf is null or uf = upper(uf))
);

-- Duplicata e o problema previsivel aqui ("R.I.S.E", "RISE", "Rise
-- Airsoft"). O slug unico barra o caso obvio; o resto e trabalho de
-- moderacao (merge por admin), nao de constraint.
create unique index if not exists equipes_slug_unico on public.equipes (slug);
create unique index if not exists equipes_nome_unico on public.equipes (lower(trim(nome)));
create index if not exists equipes_local_idx on public.equipes (uf, cidade_slug);

drop trigger if exists equipes_atualizado_em on public.equipes;
create trigger equipes_atualizado_em before update on public.equipes
  for each row execute function public.tocar_atualizado_em();

-- ------------------------------------------------------------
-- Membros
-- ------------------------------------------------------------

create table if not exists public.equipe_membros (
  id            uuid primary key default gen_random_uuid(),
  equipe_id     uuid not null references public.equipes(id) on delete cascade,
  usuario_id    uuid not null references auth.users(id) on delete cascade,

  papel         public.papel_equipe not null default 'membro',
  status        public.status_membro not null default 'pendente',
  -- `pedido`: a pessoa pediu, o lider aprova.
  -- `convite`: o lider chamou, a pessoa aceita.
  origem        public.origem_vinculo not null default 'pedido',

  -- Qual equipe aparece do lado do nome na lista da operacao.
  principal     boolean not null default false,

  -- Rastro de quem decidiu, mesmo criterio da reivindicacao.
  decidido_por  uuid references auth.users(id) on delete set null,
  decidido_em   timestamptz,

  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  unique (equipe_id, usuario_id)
);

-- Uma principal por pessoa, contando so vinculo ativo.
create unique index if not exists equipe_membros_uma_principal
  on public.equipe_membros (usuario_id)
  where principal and status = 'ativo';

create index if not exists equipe_membros_por_equipe
  on public.equipe_membros (equipe_id, status);

create index if not exists equipe_membros_por_usuario
  on public.equipe_membros (usuario_id, status);

drop trigger if exists equipe_membros_atualizado_em on public.equipe_membros;
create trigger equipe_membros_atualizado_em before update on public.equipe_membros
  for each row execute function public.tocar_atualizado_em();

/**
 * Marcar uma equipe como principal desmarca a anterior sozinho —
 * mesmo padrao de `uma_replica_principal`.
 *
 * BEFORE porque o indice unico e conferido no fim da instrucao: a
 * antiga precisa perder a marca antes disso. A recursao para na
 * primeira volta, porque o UPDATE de dentro grava `false`.
 *
 * A condicao de status ativo evita desmarcar a principal de verdade
 * por causa de um vinculo pendente que nem vale como principal.
 */
create or replace function public.uma_equipe_principal()
returns trigger language plpgsql as $$
begin
  if new.principal and new.status = 'ativo' then
    update public.equipe_membros
       set principal = false
     where usuario_id = new.usuario_id and id <> new.id and principal;
  end if;
  return new;
end $$;

drop trigger if exists equipe_membros_principal on public.equipe_membros;
create trigger equipe_membros_principal before insert or update on public.equipe_membros
  for each row execute function public.uma_equipe_principal();

-- ------------------------------------------------------------
-- Funcoes de apoio
--
-- `security definer` pelo mesmo motivo de `e_admin`: a policy de
-- equipe_membros precisa consultar equipe_membros. Sem isso, recursao.
-- ------------------------------------------------------------

create or replace function public.e_lider_da_equipe(p_equipe uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.equipe_membros
    where equipe_id = p_equipe
      and usuario_id = auth.uid()
      and papel = 'lider'
      and status = 'ativo'
  );
$$;

create or replace function public.e_membro_da_equipe(p_equipe uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.equipe_membros
    where equipe_id = p_equipe
      and usuario_id = auth.uid()
      and status = 'ativo'
  );
$$;

/**
 * Achar um jogador para convidar.
 *
 * A RLS de `perfis` so libera a propria linha, entao o lider nao tem
 * como procurar ninguem pela API. Esta funcao e a fresta — e ela e
 * estreita de proposito:
 *
 *  - casa o nickname EXATO, nao busca parcial. Busca parcial em cima
 *    de `perfis` transformaria a base de usuarios em diretorio de
 *    pessoas, que nao e o que a pessoa consentiu ao se cadastrar;
 *  - devolve so nome, nickname e foto. Nunca WhatsApp nem e-mail;
 *  - quem nao escolheu nickname nao aparece: ficar achavel e um ato
 *    do usuario, nao um padrao.
 */
create or replace function public.achar_jogador(p_nickname text)
returns table (id uuid, nome text, nickname text, foto_url text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.nome, p.nickname, p.foto_url
  from public.perfis p
  where p.nickname is not null
    and lower(p.nickname) = lower(btrim(p_nickname))
  limit 1;
$$;

revoke all on function public.achar_jogador(text) from public, anon;
grant execute on function public.achar_jogador(text) to authenticated;

/**
 * Fila de pedidos e convites pendentes de uma equipe, com o nome de
 * quem esta esperando.
 *
 * Existe pelo mesmo motivo da funcao acima: a policy deixa o lider ler
 * a linha do vinculo, mas nao o perfil da pessoa — sem isso a fila
 * seria uma lista de UUIDs. Devolve VAZIO para quem nao lidera, em vez
 * de erro: a tela simplesmente nao mostra a secao.
 */
create or replace function public.fila_da_equipe(p_equipe uuid)
returns table (
  vinculo_id uuid,
  usuario_id uuid,
  origem     public.origem_vinculo,
  criado_em  timestamptz,
  nome       text,
  nickname   text,
  foto_url   text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.e_lider_da_equipe(p_equipe) and not public.e_admin() then
    return;
  end if;

  return query
    select m.id, m.usuario_id, m.origem, m.criado_em,
           p.nome, p.nickname, p.foto_url
    from public.equipe_membros m
    join public.perfis p on p.id = m.usuario_id
    where m.equipe_id = p_equipe
      and m.status = 'pendente'
    order by m.criado_em;
end $$;

revoke all on function public.fila_da_equipe(uuid) from public, anon;
grant execute on function public.fila_da_equipe(uuid) to authenticated;

-- ------------------------------------------------------------
-- Quem cria a equipe nasce lider ativo
--
-- Se isso ficasse na aplicacao, uma falha entre os dois inserts
-- deixaria equipe orfa que ninguem consegue administrar.
-- ------------------------------------------------------------

create or replace function public.criar_lider_ao_criar_equipe()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.criada_por is null then
    return new;
  end if;

  -- Marca so desta transacao (`is_local = true`): diz ao gatilho de
  -- entrada que este insert e a lideranca fundadora, nao um pedido.
  perform set_config('ca.criando_equipe', '1', true);

  insert into public.equipe_membros
    (equipe_id, usuario_id, papel, status, origem, principal, decidido_em)
  values (
    new.id,
    new.criada_por,
    'lider',
    'ativo',
    'pedido',
    -- Vira principal so se a pessoa ainda nao tiver uma.
    not exists (
      select 1 from public.equipe_membros
      where usuario_id = new.criada_por and principal and status = 'ativo'
    ),
    now()
  )
  on conflict (equipe_id, usuario_id) do nothing;

  perform set_config('ca.criando_equipe', '', true);

  return new;
end $$;

drop trigger if exists ao_criar_equipe on public.equipes;
create trigger ao_criar_equipe after insert on public.equipes
  for each row execute function public.criar_lider_ao_criar_equipe();

-- ------------------------------------------------------------
-- Travas de integridade do vinculo
-- ------------------------------------------------------------

create or replace function public.travar_entrada_em_equipe()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Unica excecao: o gatilho que cria a equipe. `security definer`
  -- NAO zera `auth.uid()`, entao sem esta marca de transacao a
  -- primeira lideranca cairia como pendente e a equipe nasceria sem
  -- ninguem que pudesse aprovar nada.
  if coalesce(current_setting('ca.criando_equipe', true), '') = '1' then
    return new;
  end if;

  -- Vinculo nasce SEMPRE pendente e como membro comum, venha de que
  -- lado vier. Sem isso a policy de insert deixaria a pessoa se
  -- cadastrar direto como lider ativo, e deixaria o lider empurrar
  -- alguem para dentro da equipe sem essa pessoa aceitar.
  if auth.uid() is not null then
    new.status = 'pendente';
    new.papel  = 'membro';
    new.origem = case
      when new.usuario_id = auth.uid() then 'pedido'::public.origem_vinculo
      else 'convite'::public.origem_vinculo
    end;
  end if;

  -- Principal so faz sentido em vinculo ativo.
  if new.status <> 'ativo' then
    new.principal = false;
  end if;

  return new;
end $$;

drop trigger if exists equipe_membros_trava_entrada on public.equipe_membros;
create trigger equipe_membros_trava_entrada before insert on public.equipe_membros
  for each row execute function public.travar_entrada_em_equipe();

-- Equipe sem lider fica sem quem aprove entrada e sem quem edite a
-- ficha. Bloqueia a saida ou o rebaixamento do ultimo.
create or replace function public.impedir_equipe_sem_lider()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ainda_lider boolean;
begin
  if old.papel <> 'lider' or old.status <> 'ativo' then
    return new;
  end if;

  if new.papel = 'lider' and new.status = 'ativo' then
    return new;
  end if;

  select exists (
    select 1 from public.equipe_membros
    where equipe_id = old.equipe_id
      and usuario_id <> old.usuario_id
      and papel = 'lider'
      and status = 'ativo'
  ) into ainda_lider;

  if not ainda_lider then
    raise exception 'A equipe ficaria sem lider. Promova outro membro antes.';
  end if;

  if new.status <> 'ativo' then
    new.principal = false;
  end if;

  return new;
end $$;

drop trigger if exists equipe_membros_exige_lider on public.equipe_membros;
create trigger equipe_membros_exige_lider before update on public.equipe_membros
  for each row execute function public.impedir_equipe_sem_lider();

-- A policy `equipe_membros_edita_o_proprio` libera a linha inteira, e
-- policy nao restringe coluna. Sem esta trava, um pedido pendente se
-- atualizaria para `papel = lider, status = ativo` numa chamada — a
-- pessoa entraria na equipe dos outros sozinha, no cargo que quisesse.
--
-- Aqui fica a matriz de quem pode mudar o que:
--   quem nao e lider  -> so mexe no proprio status, e so para sair,
--                        recusar convite ou aceitar convite;
--   lider             -> aprova pedido, remove, promove; NAO ativa
--                        convite no lugar da pessoa.
create or replace function public.travar_mudanca_de_vinculo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lider boolean;
begin
  -- Sem sessao e service_role, migracao ou gatilho interno.
  if auth.uid() is null or public.e_admin() then
    return new;
  end if;

  v_lider := public.e_lider_da_equipe(old.equipe_id);

  -- Origem e prova de quem comecou o vinculo. Ninguem reescreve.
  new.origem := old.origem;

  if not v_lider then
    new.papel := old.papel;

    if new.status is distinct from old.status then
      if old.status = 'pendente' and old.origem = 'convite'
         and new.status in ('ativo','recusado') then
        null;                              -- aceita ou recusa o convite
      elsif old.status in ('pendente','ativo') and new.status = 'saiu' then
        null;                              -- desiste do pedido ou sai
      elsif old.status in ('saiu','recusado','removido')
            and new.status = 'pendente' then
        -- Voltar atras e comum: saiu, brigou, voltou. A linha e unica
        -- por (equipe, usuario), entao reabrir e a unica saida — sem
        -- isso quem saiu nunca mais entra. Reabre sempre como PEDIDO,
        -- porque o convite antigo ja foi gasto.
        new.origem := 'pedido';
      else
        new.status := old.status;
      end if;
    end if;
  else
    -- Convite pendente e escolha da pessoa convidada. O lider chamou;
    -- entrar no lugar dela seria o mesmo furo com outro nome.
    if old.status = 'pendente' and old.origem = 'convite'
       and new.status = 'ativo' and old.usuario_id <> auth.uid() then
      new.status := old.status;
    end if;
  end if;

  if new.status <> 'ativo' then
    new.principal := false;
  end if;

  return new;
end $$;

drop trigger if exists equipe_membros_trava_mudanca on public.equipe_membros;
create trigger equipe_membros_trava_mudanca before update on public.equipe_membros
  for each row execute function public.travar_mudanca_de_vinculo();

-- ------------------------------------------------------------
-- RLS
--
-- Equipe e ficha de diretorio: leitura publica, como campo e loja.
-- `equipe_membros` NAO e publica por inteiro — pedido pendente e
-- recusa sao assunto entre a pessoa e a lideranca. A view no fim do
-- arquivo expoe so o elenco ativo.
-- ------------------------------------------------------------

alter table public.equipes enable row level security;

drop policy if exists equipes_leitura_publica on public.equipes;
create policy equipes_leitura_publica on public.equipes
  for select to anon, authenticated using (true);

-- Mesmo criterio da reivindicacao: so perfil completo cadastra.
drop policy if exists equipes_cria_com_perfil_completo on public.equipes;
create policy equipes_cria_com_perfil_completo on public.equipes
  for insert to authenticated with check (
    criada_por = auth.uid()
    and exists (
      select 1 from public.perfis p
      where p.id = auth.uid() and p.perfil_completo
    )
  );

drop policy if exists equipes_edita_o_lider on public.equipes;
create policy equipes_edita_o_lider on public.equipes
  for update to authenticated
  using (public.e_lider_da_equipe(id) or public.e_admin())
  with check (public.e_lider_da_equipe(id) or public.e_admin());

-- Sem policy de delete: apagar equipe com historico de operacao e
-- decisao de moderacao, nao de tela.

alter table public.equipe_membros enable row level security;

drop policy if exists equipe_membros_leitura on public.equipe_membros;
create policy equipe_membros_leitura on public.equipe_membros
  for select to authenticated using (
    status = 'ativo'
    or usuario_id = auth.uid()
    or public.e_lider_da_equipe(equipe_id)
    or public.e_admin()
  );

drop policy if exists equipe_membros_leitura_anon on public.equipe_membros;
create policy equipe_membros_leitura_anon on public.equipe_membros
  for select to anon using (status = 'ativo');

-- A pessoa pede para entrar (o gatilho forca pendente/membro) ou o
-- lider adiciona alguem direto.
drop policy if exists equipe_membros_pede_entrada on public.equipe_membros;
create policy equipe_membros_pede_entrada on public.equipe_membros
  for insert to authenticated with check (
    usuario_id = auth.uid() or public.e_lider_da_equipe(equipe_id)
  );

-- Lider decide sobre qualquer vinculo da equipe.
drop policy if exists equipe_membros_lider_decide on public.equipe_membros;
create policy equipe_membros_lider_decide on public.equipe_membros
  for update to authenticated
  using (public.e_lider_da_equipe(equipe_id) or public.e_admin())
  with check (public.e_lider_da_equipe(equipe_id) or public.e_admin());

-- A pessoa mexe no proprio vinculo (marcar principal, sair).
drop policy if exists equipe_membros_edita_o_proprio on public.equipe_membros;
create policy equipe_membros_edita_o_proprio on public.equipe_membros
  for update to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- ------------------------------------------------------------
-- Elenco publico
--
-- ATENCAO — esta view e a UNICA do projeto que roda como dono
-- (`security_invoker = false`), e e de proposito. A RLS de `perfis`
-- so libera a propria linha; com invoker, o join devolveria elenco
-- vazio para todo mundo.
--
-- O que torna isso seguro e a lista de colunas: nome, nickname e
-- foto. `whatsapp`, `uf`, `cidade` e consentimento ficam de fora. A
-- regra do schema de usuarios continua valendo — nunca abrir a
-- tabela `perfis` inteira, so projetar colunas escolhidas.
--
-- Rodando como dono, a RLS de `equipe_membros` tambem e ignorada
-- aqui; por isso o filtro de status ativo esta DENTRO da view, e
-- nao delegado a policy.
-- ------------------------------------------------------------

create or replace view public.equipe_elenco
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
where m.status = 'ativo';

grant select on public.equipe_elenco to anon, authenticated;
