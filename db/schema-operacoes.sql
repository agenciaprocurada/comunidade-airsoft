-- ============================================================
-- Comunidade Airsoft — operacoes e lista de presenca
--
-- Isto substitui a lista de texto que hoje e reenviada dezenas de
-- vezes no grupo de WhatsApp. A meta NAO e tirar o pessoal do grupo:
-- a conversa fica la, so a lista sai. Por isso a operacao tem link
-- proprio e a lista vive nele.
--
-- Decisoes estruturais que este schema trava:
--
-- 1. INSCRICAO SEM CONTA EXISTE. `usuario_id` e opcional e existe
--    `nome_avulso`. Na primeira semana metade do pessoal vai mandar o
--    nome no grupo do mesmo jeito, e o organizador precisa jogar na
--    lista em segundos. Lista incompleta no site = organizador volta
--    para o WhatsApp e o produto morre. Absorver o comportamento
--    antigo e requisito, nao concessao.
--
-- 2. LISTA DE ESPERA E AUTOMATICA. Lotou o lado, entra em espera;
--    alguem cancela, o primeiro da fila sobe sozinho. E o que resolve
--    a vaga furada que hoje ninguem preenche porque ninguem avisa que
--    desistiu.
--
-- 3. A PLATAFORMA NAO TOCA NO DINHEIRO. Nao ha valor pago, gateway
--    nem comprovante aqui: so `pago`, que o organizador marca. Ver
--    PRODUCT.md ("nao vende nem intermedia") — virar meio de pagamento
--    e risco juridico, nao funcionalidade.
--
-- 4. TODA OPERACAO NASCE COM DOIS LADOS. Um gatilho cria "Time A" e
--    "Time B" na hora. O organizador renomeia para PMC/Militar ou o
--    que for. Sem isso o cadastro teria mais campos obrigatorios do
--    que digitar a lista no WhatsApp — e ai ele nao usa.
--
-- Aplicar DEPOIS de db/schema.sql, schema-usuarios.sql,
-- schema-reivindicacoes.sql e schema-equipes.sql.
-- ============================================================

-- ------------------------------------------------------------
-- Tipos
-- ------------------------------------------------------------

do $$ begin
  create type public.status_operacao as enum
    ('rascunho','publicada','cancelada','realizada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.status_inscricao as enum
    ('confirmada','espera','cancelada');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- Operacoes
-- ------------------------------------------------------------

create table if not exists public.operacoes (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null,

  -- O campo vem do diretorio: endereco, mapa e contato ja existem la
  -- e nao sao redigitados. E o que faz o cadastro caber em 4 campos.
  campo_id      text references public.campos(id) on delete set null,
  -- Preenchido so quando o campo nao esta no diretorio ainda.
  local_avulso  text,

  -- Organizador NAO e o dono do campo por padrao: boa parte das
  -- operacoes e de equipe que ALUGA campo de terceiro. Modelar como
  -- se fossem a mesma pessoa daria retrabalho na primeira operacao
  -- real.
  organizador_id uuid not null references auth.users(id) on delete cascade,
  equipe_id      uuid references public.equipes(id) on delete set null,

  titulo        text,

  data          date not null,
  abertura      time,
  briefing      time,
  inicio        time,
  fim           time,

  estilo        public.estilo_jogo,

  -- Dois lotes, do jeito que a lista do grupo ja escreve:
  -- "R$ 35 ate sexta / no dia R$ 50".
  preco             numeric(7,2) check (preco is null or preco >= 0),
  preco_no_dia      numeric(7,2) check (preco_no_dia is null or preco_no_dia >= 0),
  prazo_lote        date,

  -- Texto livre porque cada organizador cobra de um jeito (Pix, CNPJ,
  -- "leva no dia"). Normalizar isso agora seria chutar.
  pagamento     text,
  observacoes   text,

  status        public.status_operacao not null default 'rascunho',
  motivo_cancelamento text,

  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint operacoes_slug_forma  check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint operacoes_tem_local   check (campo_id is not null or local_avulso is not null),
  constraint operacoes_prazo_antes check (prazo_lote is null or prazo_lote <= data),
  constraint operacoes_cancelada_tem_motivo
    check (status <> 'cancelada' or motivo_cancelamento is not null)
);

create unique index if not exists operacoes_slug_unico on public.operacoes (slug);
create index if not exists operacoes_data_idx  on public.operacoes (data desc)
  where status = 'publicada';
create index if not exists operacoes_campo_idx on public.operacoes (campo_id, data desc);
create index if not exists operacoes_organizador_idx on public.operacoes (organizador_id);

drop trigger if exists operacoes_atualizado_em on public.operacoes;
create trigger operacoes_atualizado_em before update on public.operacoes
  for each row execute function public.tocar_atualizado_em();

-- ------------------------------------------------------------
-- Lados (PMC x Militar)
--
-- Chama-se LADO, nao "time". Time e a equipe permanente da pessoa e
-- vive em `equipes` — misturar as duas palavras no schema seria erro
-- barato de cometer e caro de desfazer.
-- ------------------------------------------------------------

create table if not exists public.operacao_lados (
  id          uuid primary key default gen_random_uuid(),
  operacao_id uuid not null references public.operacoes(id) on delete cascade,
  nome        text not null,
  ordem       smallint not null default 0,
  -- null = sem teto. O organizador que nao quer limite nao e obrigado
  -- a inventar um numero.
  vagas       integer check (vagas is null or vagas > 0),

  constraint operacao_lados_nome_tamanho
    check (char_length(btrim(nome)) between 1 and 40)
);

create index if not exists operacao_lados_operacao_idx
  on public.operacao_lados (operacao_id, ordem);

/**
 * Toda operacao nasce com dois lados. Renomear e trabalho de um
 * campo de texto; comecar sem lado nenhum trava a inscricao.
 */
create or replace function public.criar_lados_padrao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.operacao_lados (operacao_id, nome, ordem)
  values (new.id, 'Time A', 0), (new.id, 'Time B', 1);
  return new;
end $$;

drop trigger if exists ao_criar_operacao on public.operacoes;
create trigger ao_criar_operacao after insert on public.operacoes
  for each row execute function public.criar_lados_padrao();

-- ------------------------------------------------------------
-- Inscricoes
-- ------------------------------------------------------------

create table if not exists public.inscricoes (
  id          uuid primary key default gen_random_uuid(),
  operacao_id uuid not null references public.operacoes(id) on delete cascade,
  lado_id     uuid references public.operacao_lados(id) on delete set null,

  -- Um dos dois, nunca os dois: ou e gente com conta, ou e nome que o
  -- organizador anotou.
  usuario_id  uuid references auth.users(id) on delete cascade,
  nome_avulso text,

  -- Qual equipe a pessoa representa NESTA operacao. Copiado da
  -- principal no momento da inscricao, e nao lido por join depois:
  -- se ela trocar de equipe em novembro, a lista de agosto tem que
  -- continuar contando o que aconteceu em agosto.
  equipe_id   uuid references public.equipes(id) on delete set null,
  etiqueta_equipe text,

  status      public.status_inscricao not null default 'confirmada',

  -- Levar amigo iniciante e comum e hoje vira linha baguncada na
  -- lista do grupo.
  acompanhantes smallint not null default 0
    check (acompanhantes between 0 and 5),

  -- Conferido pelo organizador. A plataforma nao processa pagamento.
  pago        boolean not null default false,
  pago_em     timestamptz,

  -- Check-in no dia.
  presente    boolean not null default false,
  presente_em timestamptz,

  observacao  text,

  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint inscricoes_uma_identidade
    check (num_nonnulls(usuario_id, nome_avulso) = 1),
  constraint inscricoes_nome_avulso_tamanho
    check (nome_avulso is null or char_length(btrim(nome_avulso)) between 2 and 60)
);

-- A mesma pessoa nao entra duas vezes na mesma operacao. Parcial
-- porque inscricao avulsa nao tem usuario para comparar.
create unique index if not exists inscricoes_uma_por_pessoa
  on public.inscricoes (operacao_id, usuario_id)
  where usuario_id is not null;

create index if not exists inscricoes_operacao_idx
  on public.inscricoes (operacao_id, status);
create index if not exists inscricoes_lado_idx
  on public.inscricoes (lado_id, status);
create index if not exists inscricoes_usuario_idx
  on public.inscricoes (usuario_id, criado_em desc);

drop trigger if exists inscricoes_atualizado_em on public.inscricoes;
create trigger inscricoes_atualizado_em before update on public.inscricoes
  for each row execute function public.tocar_atualizado_em();

-- ------------------------------------------------------------
-- Lista de espera automatica
-- ------------------------------------------------------------

/**
 * Lado cheio manda para a espera.
 *
 * A contagem acontece dentro do gatilho, e nao na tela, porque duas
 * pessoas clicando ao mesmo tempo na ultima vaga e o caso normal
 * numa lista que abre e enche em minutos.
 */
create or replace function public.encaixar_ou_esperar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_vagas integer;
  v_ocupadas integer;
begin
  if new.status <> 'confirmada' or new.lado_id is null then
    return new;
  end if;

  -- Em UPDATE, so reavalia quando o encaixe mudou de verdade. Sem
  -- isso, o organizador marcando "pago" numa lista cheia jogaria a
  -- pessoa para a espera — ela mesma conta como uma das vagas.
  if tg_op = 'UPDATE'
     and old.status = 'confirmada'
     and old.lado_id is not distinct from new.lado_id then
    return new;
  end if;

  select vagas into v_vagas from public.operacao_lados where id = new.lado_id;
  if v_vagas is null then
    return new;                                  -- lado sem teto
  end if;

  select count(*) into v_ocupadas
  from public.inscricoes
  where lado_id = new.lado_id
    and status = 'confirmada'
    and id <> new.id;

  if v_ocupadas >= v_vagas then
    new.status := 'espera';
  end if;

  return new;
end $$;

drop trigger if exists inscricoes_encaixe on public.inscricoes;
create trigger inscricoes_encaixe before insert or update on public.inscricoes
  for each row execute function public.encaixar_ou_esperar();

/**
 * Ninguem entra em lista que ainda nao abriu nem em operacao
 * cancelada.
 *
 * A policy de insert so confere QUEM esta inscrevendo, nao o estado
 * da operacao: com o id na mao, daria para entrar num rascunho que o
 * organizador ainda esta montando.
 */
create or replace function public.travar_inscricao_fora_de_hora()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.status_operacao;
begin
  if auth.uid() is null or public.e_organizador(new.operacao_id) or public.e_admin() then
    return new;
  end if;

  select status into v_status from public.operacoes where id = new.operacao_id;

  if v_status <> 'publicada' then
    raise exception 'Esta operacao nao esta aberta para inscricao'
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

drop trigger if exists inscricoes_trava_hora on public.inscricoes;
create trigger inscricoes_trava_hora before insert on public.inscricoes
  for each row execute function public.travar_inscricao_fora_de_hora();

/**
 * Vaga que abre chama o primeiro da espera.
 *
 * Sem isso a desistencia deixa buraco — que e exatamente o que
 * acontece hoje no grupo, onde ninguem avisa que nao vai.
 */
create or replace function public.promover_da_espera()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proximo uuid;
  v_vagas integer;
  v_ocupadas integer;
begin
  if old.status <> 'confirmada' or new.status = 'confirmada' or old.lado_id is null then
    return new;
  end if;

  select vagas into v_vagas from public.operacao_lados where id = old.lado_id;
  if v_vagas is null then
    return new;
  end if;

  select count(*) into v_ocupadas
  from public.inscricoes
  where lado_id = old.lado_id and status = 'confirmada';

  if v_ocupadas >= v_vagas then
    return new;
  end if;

  select id into v_proximo
  from public.inscricoes
  where lado_id = old.lado_id and status = 'espera'
  order by criado_em
  limit 1;

  if v_proximo is not null then
    update public.inscricoes set status = 'confirmada' where id = v_proximo;
  end if;

  return new;
end $$;

drop trigger if exists inscricoes_promocao on public.inscricoes;
create trigger inscricoes_promocao after update on public.inscricoes
  for each row execute function public.promover_da_espera();

-- ------------------------------------------------------------
-- Inscricao em bloco
--
-- E ISTO que faz a equipe valer a pena existir no produto. Hoje sao
-- oito pessoas digitando oito linhas no grupo; aqui e o lider
-- confirmando as oito de uma vez. Tambem e o vetor de crescimento
-- mais barato: cada lider que adota traz o time inteiro junto.
-- ------------------------------------------------------------

create or replace function public.inscrever_equipe(
  p_operacao uuid,
  p_equipe   uuid,
  p_lado     uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inscritos integer := 0;
  v_etiqueta  text;
begin
  if not public.e_lider_da_equipe(p_equipe) then
    raise exception 'So o lider da equipe inscreve a equipe inteira'
      using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1 from public.operacoes
    where id = p_operacao and status = 'publicada'
  ) then
    raise exception 'Operacao nao esta aberta para inscricao'
      using errcode = 'check_violation';
  end if;

  if p_lado is not null and not exists (
    select 1 from public.operacao_lados where id = p_lado and operacao_id = p_operacao
  ) then
    raise exception 'Esse lado nao e desta operacao'
      using errcode = 'foreign_key_violation';
  end if;

  select coalesce(nullif(btrim(sigla), ''), nome) into v_etiqueta
  from public.equipes where id = p_equipe;

  -- `on conflict do nothing`: quem ja se inscreveu sozinho fica como
  -- estava. O gatilho de encaixe decide, um por um, quem entra e quem
  -- vai para a espera — inclusive no meio do bloco, se a vaga acabar.
  with entradas as (
    insert into public.inscricoes
      (operacao_id, lado_id, usuario_id, equipe_id, etiqueta_equipe)
    select p_operacao, p_lado, m.usuario_id, p_equipe, v_etiqueta
    from public.equipe_membros m
    where m.equipe_id = p_equipe and m.status = 'ativo'
    on conflict (operacao_id, usuario_id) where usuario_id is not null
    do nothing
    returning 1
  )
  select count(*) into v_inscritos from entradas;

  return v_inscritos;
end $$;

revoke all on function public.inscrever_equipe(uuid, uuid, uuid) from public, anon;
grant execute on function public.inscrever_equipe(uuid, uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- Quem organiza
-- ------------------------------------------------------------

create or replace function public.e_organizador(p_operacao uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.operacoes
    where id = p_operacao and organizador_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.operacoes enable row level security;

-- Operacao publicada e conteudo indexavel: ninguem precisa de conta
-- para VER onde tem jogo (PRODUCT.md, "conteudo e isca").
drop policy if exists operacoes_leitura_publica on public.operacoes;
create policy operacoes_leitura_publica on public.operacoes
  for select to anon, authenticated
  using (status in ('publicada','realizada','cancelada'));

drop policy if exists operacoes_le_o_organizador on public.operacoes;
create policy operacoes_le_o_organizador on public.operacoes
  for select to authenticated
  using (organizador_id = auth.uid() or public.e_admin());

-- Qualquer perfil completo abre operacao, e nao so dono de campo
-- aprovado: equipe que aluga campo de terceiro e caso comum, e exigir
-- reivindicacao antes travaria a maior parte das operacoes reais.
drop policy if exists operacoes_cria_com_perfil_completo on public.operacoes;
create policy operacoes_cria_com_perfil_completo on public.operacoes
  for insert to authenticated with check (
    organizador_id = auth.uid()
    and exists (
      select 1 from public.perfis p where p.id = auth.uid() and p.perfil_completo
    )
  );

drop policy if exists operacoes_edita_o_organizador on public.operacoes;
create policy operacoes_edita_o_organizador on public.operacoes
  for update to authenticated
  using (organizador_id = auth.uid() or public.e_admin())
  with check (organizador_id = auth.uid() or public.e_admin());

alter table public.operacao_lados enable row level security;

drop policy if exists lados_leitura_publica on public.operacao_lados;
create policy lados_leitura_publica on public.operacao_lados
  for select to anon, authenticated using (true);

drop policy if exists lados_edita_o_organizador on public.operacao_lados;
create policy lados_edita_o_organizador on public.operacao_lados
  for all to authenticated
  using (public.e_organizador(operacao_id) or public.e_admin())
  with check (public.e_organizador(operacao_id) or public.e_admin());

alter table public.inscricoes enable row level security;

-- A tabela nao e publica: guarda observacao do organizador e o estado
-- de pagamento. A lista que o visitante ve e a view do fim do arquivo.
drop policy if exists inscricoes_leitura on public.inscricoes;
create policy inscricoes_leitura on public.inscricoes
  for select to authenticated using (
    usuario_id = auth.uid()
    or public.e_organizador(operacao_id)
    or public.e_admin()
  );

-- A pessoa se inscreve; o organizador inscreve qualquer um, inclusive
-- nome avulso de quem nao tem conta.
drop policy if exists inscricoes_cria on public.inscricoes;
create policy inscricoes_cria on public.inscricoes
  for insert to authenticated with check (
    (usuario_id = auth.uid() and nome_avulso is null)
    or public.e_organizador(operacao_id)
  );

drop policy if exists inscricoes_edita_a_propria on public.inscricoes;
create policy inscricoes_edita_a_propria on public.inscricoes
  for update to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

drop policy if exists inscricoes_edita_o_organizador on public.inscricoes;
create policy inscricoes_edita_o_organizador on public.inscricoes
  for update to authenticated
  using (public.e_organizador(operacao_id) or public.e_admin())
  with check (public.e_organizador(operacao_id) or public.e_admin());

drop policy if exists inscricoes_apaga_o_organizador on public.inscricoes;
create policy inscricoes_apaga_o_organizador on public.inscricoes
  for delete to authenticated
  using (public.e_organizador(operacao_id) or public.e_admin());

/**
 * Jogador nao marca o proprio pagamento nem a propria presenca.
 *
 * A policy acima libera a linha inteira, e policy nao restringe
 * coluna — sem esta trava, "pago = true" seria um clique.
 */
create or replace function public.travar_conferencia_do_organizador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.e_organizador(old.operacao_id) or public.e_admin() then
    return new;
  end if;

  new.pago        := old.pago;
  new.pago_em     := old.pago_em;
  new.presente    := old.presente;
  new.presente_em := old.presente_em;
  new.observacao  := old.observacao;
  new.usuario_id  := old.usuario_id;
  new.nome_avulso := old.nome_avulso;

  return new;
end $$;

drop trigger if exists inscricoes_trava_conferencia on public.inscricoes;
create trigger inscricoes_trava_conferencia before update on public.inscricoes
  for each row execute function public.travar_conferencia_do_organizador();

-- ------------------------------------------------------------
-- A lista publica
--
-- Mesma excecao da `equipe_elenco`, e pelo mesmo motivo: a RLS de
-- `perfis` so libera a propria linha, entao com invoker a lista sairia
-- vazia. Seguro porque projeta so nome, apelido e equipe — nunca
-- WhatsApp, nunca o estado de pagamento.
-- ------------------------------------------------------------

create or replace view public.operacao_lista
with (security_invoker = false) as
select
  i.id,
  i.operacao_id,
  i.lado_id,
  i.status,
  i.acompanhantes,
  i.etiqueta_equipe,
  i.criado_em,
  coalesce(p.nome, i.nome_avulso) as nome,
  p.nickname,
  p.foto_url
from public.inscricoes i
left join public.perfis p on p.id = i.usuario_id
join public.operacoes o on o.id = i.operacao_id
where i.status <> 'cancelada'
  and o.status in ('publicada','realizada','cancelada');

grant select on public.operacao_lista to anon, authenticated;

-- ============================================================
-- Filtro geografico e operacao fechada
--
-- Duas mudancas que vieram do uso real, aplicadas em cima do schema
-- acima (`add column if not exists`: o arquivo continua idempotente e
-- serve tanto para banco novo quanto para o que ja esta rodando).
--
-- 1. UF E CIDADE NA PROPRIA OPERACAO. Antes so davam para saber por
--    join com `campos` — e operacao em local avulso nao tem ficha, o
--    que a deixava fora de qualquer filtro por regiao. Agora a
--    operacao carrega o proprio lugar, copiado da ficha quando existe.
--
-- 2. OPERACAO FECHADA. Aparece na agenda com selo, mostrando data,
--    lugar e estilo — mas a LISTA e a inscricao ficam atras de uma
--    chave que vai no link. Quem quer entrar fala com o organizador
--    pelo WhatsApp e recebe o link com a chave.
--
--    A chave e necessaria porque o slug e previsivel (campo + data):
--    sem ela, "fechada" seria so uma sugestao.
-- ============================================================

do $$ begin
  create type public.visibilidade_operacao as enum ('aberta','fechada');
exception when duplicate_object then null; end $$;

alter table public.operacoes
  add column if not exists uf           char(2),
  add column if not exists cidade       text,
  add column if not exists cidade_slug  text,
  add column if not exists visibilidade public.visibilidade_operacao not null default 'aberta',
  add column if not exists chave_acesso text,
  -- E.164, igual ao perfil. Fica NA OPERACAO e nao e lido de `perfis`
  -- de proposito: publicar o telefone e um ato explicito do
  -- organizador naquele evento, nao um efeito colateral do cadastro.
  add column if not exists whatsapp_contato text;

do $$ begin
  alter table public.operacoes
    add constraint operacoes_uf_maiuscula check (uf is null or uf = upper(uf));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.operacoes
    add constraint operacoes_whatsapp_e164
      check (whatsapp_contato is null or whatsapp_contato ~ '^\+55[1-9]{2}[0-9]{8,9}$');
exception when duplicate_object then null; end $$;

-- Fechada sem chave nao e fechada; e so invisivel por acidente.
do $$ begin
  alter table public.operacoes
    add constraint operacoes_fechada_tem_chave
      check (visibilidade <> 'fechada' or chave_acesso is not null);
exception when duplicate_object then null; end $$;

create index if not exists operacoes_regiao_idx
  on public.operacoes (uf, cidade_slug, data desc) where status = 'publicada';
create index if not exists operacoes_estilo_idx
  on public.operacoes (estilo) where status = 'publicada';

/**
 * A operacao herda o lugar do campo, e ganha chave quando e fechada.
 *
 * Fica em gatilho, e nao na tela, por dois motivos: a tela erraria em
 * silencio (operacao sem UF simplesmente sumiria do filtro), e a
 * chave gerada no servidor nunca passa pelo navegador de quem cria.
 */
create or replace function public.completar_operacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.campo_id is not null then
    select c.uf, c.cidade, c.cidade_slug
      into new.uf, new.cidade, new.cidade_slug
    from public.campos c where c.id = new.campo_id;
  end if;

  if new.uf is not null then
    new.uf := upper(new.uf);
  end if;

  -- 16 hex do uuid v4: fonte aleatoria forte, curto o bastante para
  -- caber num link de WhatsApp.
  --
  -- NAO usar gen_random_bytes aqui: pgcrypto vive no schema
  -- `extensions` no Supabase, e esta funcao roda com
  -- `search_path = public` — a chamada nao resolve. gen_random_uuid e
  -- nativa do Postgres e esta sempre no caminho.
  if new.visibilidade = 'fechada' and new.chave_acesso is null then
    new.chave_acesso := substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
  end if;

  return new;
end $$;

drop trigger if exists operacoes_completar on public.operacoes;
create trigger operacoes_completar before insert or update on public.operacoes
  for each row execute function public.completar_operacao();

-- Preenche o que ja existia antes do gatilho.
update public.operacoes o
   set uf = c.uf, cidade = c.cidade, cidade_slug = c.cidade_slug
  from public.campos c
 where c.id = o.campo_id and o.uf is null;

-- ------------------------------------------------------------
-- Quem pode ver a lista de uma operacao fechada
-- ------------------------------------------------------------

create or replace function public.pode_ver_lista(p_operacao uuid, p_chave text default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_visibilidade public.visibilidade_operacao;
  v_chave text;
  v_organizador uuid;
begin
  select visibilidade, chave_acesso, organizador_id
    into v_visibilidade, v_chave, v_organizador
  from public.operacoes where id = p_operacao;

  if not found then return false; end if;
  if v_visibilidade = 'aberta' then return true; end if;
  if auth.uid() is not null and auth.uid() = v_organizador then return true; end if;

  -- Comparacao de tempo constante nao importa aqui: a chave tem 12
  -- caracteres aleatorios e nao ha oraculo de tempo por HTTP que
  -- ajude a adivinhar isso antes do rate limit do Supabase.
  if p_chave is not null and v_chave is not null and p_chave = v_chave then
    return true;
  end if;

  -- Quem ja esta na lista continua vendo a lista, mesmo sem o link
  -- na mao — senao a pessoa perde o acesso ao proprio compromisso ao
  -- limpar o historico do navegador.
  return auth.uid() is not null and exists (
    select 1 from public.inscricoes
    where operacao_id = p_operacao and usuario_id = auth.uid() and status <> 'cancelada'
  );
end $$;

revoke all on function public.pode_ver_lista(uuid, text) from public;
grant execute on function public.pode_ver_lista(uuid, text) to anon, authenticated;

create or replace function public.lista_da_operacao(p_operacao uuid, p_chave text default null)
returns table (
  id              uuid,
  lado_id         uuid,
  status          public.status_inscricao,
  acompanhantes   smallint,
  etiqueta_equipe text,
  criado_em       timestamptz,
  nome            text,
  nickname        text,
  foto_url        text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.pode_ver_lista(p_operacao, p_chave) then
    return;                                    -- vazio, nao erro
  end if;

  return query
    select i.id, i.lado_id, i.status, i.acompanhantes, i.etiqueta_equipe,
           i.criado_em, coalesce(p.nome, i.nome_avulso), p.nickname, p.foto_url
    from public.inscricoes i
    left join public.perfis p on p.id = i.usuario_id
    where i.operacao_id = p_operacao and i.status <> 'cancelada'
    order by i.criado_em;
end $$;

revoke all on function public.lista_da_operacao(uuid, text) from public;
grant execute on function public.lista_da_operacao(uuid, text) to anon, authenticated;

-- A view publica passa a mostrar SO operacao aberta. A fechada agora
-- tem porta propria (`lista_da_operacao`), com chave.
create or replace view public.operacao_lista
with (security_invoker = false) as
select
  i.id,
  i.operacao_id,
  i.lado_id,
  i.status,
  i.acompanhantes,
  i.etiqueta_equipe,
  i.criado_em,
  coalesce(p.nome, i.nome_avulso) as nome,
  p.nickname,
  p.foto_url
from public.inscricoes i
left join public.perfis p on p.id = i.usuario_id
join public.operacoes o on o.id = i.operacao_id
where i.status <> 'cancelada'
  and o.status in ('publicada','realizada','cancelada')
  and o.visibilidade = 'aberta';

grant select on public.operacao_lista to anon, authenticated;

-- ------------------------------------------------------------
-- Entrar na lista
--
-- Virou funcao por causa da operacao fechada: o gatilho de entrada
-- nao tem como conhecer a chave que veio no link, entao a checagem
-- precisa acontecer num lugar que receba a chave como argumento.
-- ------------------------------------------------------------

create or replace function public.entrar_na_operacao(
  p_operacao      uuid,
  p_lado          uuid default null,
  p_chave         text default null,
  p_acompanhantes smallint default 0
)
returns public.status_inscricao
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operacao public.operacoes%rowtype;
  v_equipe   uuid;
  v_etiqueta text;
  v_status   public.status_inscricao;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para confirmar presenca'
      using errcode = 'insufficient_privilege';
  end if;

  select * into v_operacao from public.operacoes where id = p_operacao;

  if not found or v_operacao.status <> 'publicada' then
    raise exception 'Esta operacao nao esta aberta para inscricao'
      using errcode = 'check_violation';
  end if;

  if v_operacao.data < current_date then
    raise exception 'Esta operacao ja aconteceu' using errcode = 'check_violation';
  end if;

  if v_operacao.visibilidade = 'fechada'
     and not public.pode_ver_lista(p_operacao, p_chave) then
    raise exception 'Esta operacao e fechada. Peca o link ao organizador'
      using errcode = 'insufficient_privilege';
  end if;

  if p_lado is not null and not exists (
    select 1 from public.operacao_lados where id = p_lado and operacao_id = p_operacao
  ) then
    raise exception 'Esse lado nao e desta operacao' using errcode = 'foreign_key_violation';
  end if;

  select m.equipe_id, coalesce(nullif(btrim(e.sigla), ''), e.nome)
    into v_equipe, v_etiqueta
  from public.equipe_membros m
  join public.equipes e on e.id = m.equipe_id
  where m.usuario_id = auth.uid() and m.status = 'ativo' and m.principal
  limit 1;

  -- Marca de transacao: diz ao gatilho de entrada que a porta ja foi
  -- conferida aqui, com a chave em maos.
  perform set_config('ca.entrada_conferida', '1', true);

  insert into public.inscricoes
    (operacao_id, lado_id, usuario_id, equipe_id, etiqueta_equipe, acompanhantes)
  values
    (p_operacao, p_lado, auth.uid(), v_equipe, v_etiqueta,
     greatest(0, least(5, coalesce(p_acompanhantes, 0))))
  on conflict (operacao_id, usuario_id) where usuario_id is not null
  do update set
    status        = 'confirmada',
    lado_id       = excluded.lado_id,
    acompanhantes = excluded.acompanhantes,
    equipe_id     = excluded.equipe_id,
    etiqueta_equipe = excluded.etiqueta_equipe
  returning status into v_status;

  perform set_config('ca.entrada_conferida', '', true);

  return v_status;
end $$;

revoke all on function public.entrar_na_operacao(uuid, uuid, text, smallint) from public, anon;
grant execute on function public.entrar_na_operacao(uuid, uuid, text, smallint) to authenticated;

/**
 * O gatilho de entrada agora tambem barra a operacao fechada.
 *
 * Sem isso, `entrar_na_operacao` seria uma sugestao: bastaria mandar
 * o insert direto na tabela para furar a porta.
 */
create or replace function public.travar_inscricao_fora_de_hora()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operacao public.operacoes%rowtype;
begin
  if auth.uid() is null or public.e_organizador(new.operacao_id) or public.e_admin() then
    return new;
  end if;

  if coalesce(current_setting('ca.entrada_conferida', true), '') = '1' then
    return new;
  end if;

  select * into v_operacao from public.operacoes where id = new.operacao_id;

  if v_operacao.status <> 'publicada' then
    raise exception 'Esta operacao nao esta aberta para inscricao'
      using errcode = 'check_violation';
  end if;

  if v_operacao.visibilidade = 'fechada' then
    raise exception 'Esta operacao e fechada. Peca o link ao organizador'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end $$;

-- Assinatura nova (com chave). A antiga tinha defaults proprios e o
-- Postgres nao deixa troca-los em replace, entao ela sai primeiro.
drop function if exists public.inscrever_equipe(uuid, uuid, uuid);

-- A inscricao em bloco tambem precisa da chave quando a operacao e
-- fechada: o lider so leva a equipe para dentro se ele proprio tiver
-- recebido o link.
create or replace function public.inscrever_equipe(
  p_operacao uuid,
  p_equipe   uuid,
  p_lado     uuid default null,
  p_chave    text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inscritos integer := 0;
  v_etiqueta  text;
  v_fechada   boolean;
begin
  if not public.e_lider_da_equipe(p_equipe) then
    raise exception 'So o lider da equipe inscreve a equipe inteira'
      using errcode = 'insufficient_privilege';
  end if;

  select (visibilidade = 'fechada') into v_fechada
  from public.operacoes where id = p_operacao and status = 'publicada';

  if v_fechada is null then
    raise exception 'Operacao nao esta aberta para inscricao'
      using errcode = 'check_violation';
  end if;

  if v_fechada and not public.pode_ver_lista(p_operacao, p_chave) then
    raise exception 'Esta operacao e fechada. Peca o link ao organizador'
      using errcode = 'insufficient_privilege';
  end if;

  if p_lado is not null and not exists (
    select 1 from public.operacao_lados where id = p_lado and operacao_id = p_operacao
  ) then
    raise exception 'Esse lado nao e desta operacao'
      using errcode = 'foreign_key_violation';
  end if;

  select coalesce(nullif(btrim(sigla), ''), nome) into v_etiqueta
  from public.equipes where id = p_equipe;

  perform set_config('ca.entrada_conferida', '1', true);

  with entradas as (
    insert into public.inscricoes
      (operacao_id, lado_id, usuario_id, equipe_id, etiqueta_equipe)
    select p_operacao, p_lado, m.usuario_id, p_equipe, v_etiqueta
    from public.equipe_membros m
    where m.equipe_id = p_equipe and m.status = 'ativo'
    on conflict (operacao_id, usuario_id) where usuario_id is not null
    do nothing
    returning 1
  )
  select count(*) into v_inscritos from entradas;

  perform set_config('ca.entrada_conferida', '', true);

  return v_inscritos;
end $$;

revoke all on function public.inscrever_equipe(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.inscrever_equipe(uuid, uuid, uuid, text) to authenticated;

-- ============================================================
-- A lista de participantes deixa de ser publica
--
-- Decisao de produto de 25/08/2026: nome de quem vai jogar e dado
-- pessoal, e a pagina da operacao e indexavel. Publicar a lista
-- expunha nome completo de dezenas de pessoas a qualquer visitante e
-- ao Google, sem que elas tivessem escolhido isso.
--
-- O que continua publico e a CONTAGEM: quantos confirmados e quantas
-- vagas sobram em cada lado. E o que o visitante realmente precisa
-- para decidir se ainda da tempo de entrar — e nao identifica ninguem.
--
-- Quem ve a lista com nomes:
--   - o organizador, no painel;
--   - o admin;
--   - cada pessoa ve a propria inscricao (pela tabela, via RLS).
-- ============================================================

-- A view publica sai de cena. `operacao_contagem` ocupa o lugar dela
-- nas telas que so precisavam do numero.
drop view if exists public.operacao_lista;

create or replace view public.operacao_contagem
with (security_invoker = false) as
select
  i.operacao_id,
  i.lado_id,
  count(*) filter (where i.status = 'confirmada')            as confirmadas,
  count(*) filter (where i.status = 'espera')                as espera,
  coalesce(sum(i.acompanhantes) filter (where i.status = 'confirmada'), 0) as acompanhantes
from public.inscricoes i
join public.operacoes o on o.id = i.operacao_id
where i.status <> 'cancelada'
  and o.status in ('publicada','realizada','cancelada')
group by i.operacao_id, i.lado_id;

grant select on public.operacao_contagem to anon, authenticated;

/**
 * Lista com nomes: so para quem organiza.
 *
 * A chave do link deixou de dar acesso a nomes — ela agora controla
 * quem pode ENTRAR numa operacao fechada, nao quem pode ver quem ja
 * entrou. Mantida na assinatura para nao quebrar chamada existente.
 */
create or replace function public.lista_da_operacao(p_operacao uuid, p_chave text default null)
returns table (
  id              uuid,
  lado_id         uuid,
  status          public.status_inscricao,
  acompanhantes   smallint,
  etiqueta_equipe text,
  criado_em       timestamptz,
  nome            text,
  nickname        text,
  foto_url        text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not (public.e_organizador(p_operacao) or public.e_admin()) then
    return;                                    -- vazio, nao erro
  end if;

  return query
    select i.id, i.lado_id, i.status, i.acompanhantes, i.etiqueta_equipe,
           i.criado_em, coalesce(p.nome, i.nome_avulso), p.nickname, p.foto_url
    from public.inscricoes i
    left join public.perfis p on p.id = i.usuario_id
    where i.operacao_id = p_operacao and i.status <> 'cancelada'
    order by i.criado_em;
end $$;

revoke all on function public.lista_da_operacao(uuid, text) from public, anon;
grant execute on function public.lista_da_operacao(uuid, text) to authenticated;

/**
 * `pode_ver_lista` passa a significar "pode ENTRAR nesta operacao".
 *
 * O nome antigo continua porque a funcao ja e usada em tres lugares e
 * o significado novo e o mesmo teste: operacao aberta libera todo
 * mundo; fechada exige a chave, ser o organizador, ou ja estar dentro.
 */
create or replace function public.pode_ver_lista(p_operacao uuid, p_chave text default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_visibilidade public.visibilidade_operacao;
  v_chave text;
  v_organizador uuid;
begin
  select visibilidade, chave_acesso, organizador_id
    into v_visibilidade, v_chave, v_organizador
  from public.operacoes where id = p_operacao;

  if not found then return false; end if;
  if v_visibilidade = 'aberta' then return true; end if;
  if auth.uid() is not null and auth.uid() = v_organizador then return true; end if;

  if p_chave is not null and v_chave is not null and p_chave = v_chave then
    return true;
  end if;

  return auth.uid() is not null and exists (
    select 1 from public.inscricoes
    where operacao_id = p_operacao and usuario_id = auth.uid() and status <> 'cancelada'
  );
end $$;

-- ============================================================
-- Convite com endereco proprio
--
-- A chave passou a viver em /convite/<chave>, e nao mais numa query
-- string colada no endereco publico. Dois motivos praticos:
--
--  - `?k=` se perde. Copiar so ate o "?" e o erro mais facil de
--    cometer, e o link chega no grupo sem servir para nada;
--  - o endereco publico e o do convite ficavam iguais na aparencia,
--    entao quem recebia nao sabia qual mandar adiante.
--
-- A chave tambem cresceu: 16 -> 32 hex (128 bits). Nao ha como varrer
-- isso por tentativa, e o link nao denuncia de qual evento e.
-- ============================================================

create or replace function public.completar_operacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.campo_id is not null then
    select c.uf, c.cidade, c.cidade_slug
      into new.uf, new.cidade, new.cidade_slug
    from public.campos c where c.id = new.campo_id;
  end if;

  if new.uf is not null then
    new.uf := upper(new.uf);
  end if;

  -- 32 hex de dois uuid v4 = 128 bits de aleatoriedade.
  --
  -- NAO usar gen_random_bytes: pgcrypto vive no schema `extensions` no
  -- Supabase e esta funcao roda com `search_path = public`, entao a
  -- chamada nao resolve. gen_random_uuid e nativa do Postgres.
  if new.visibilidade = 'fechada' and new.chave_acesso is null then
    new.chave_acesso :=
      replace(gen_random_uuid()::text, '-', '');
  end if;

  return new;
end $$;

-- Chaves curtas da primeira versao viram longas. Nenhum convite tinha
-- sido distribuido ainda — o endereco /convite nem existia.
update public.operacoes
   set chave_acesso = replace(gen_random_uuid()::text, '-', '')
 where visibilidade = 'fechada'
   and chave_acesso is not null
   and length(chave_acesso) < 32;

create unique index if not exists operacoes_chave_unica
  on public.operacoes (chave_acesso) where chave_acesso is not null;
