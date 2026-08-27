-- ============================================================
-- Comunidade Airsoft — schema do diretorio de armeiros
--
-- Espelha `lojas` de proposito: mesmos enums de status e confianca,
-- mesmo par verificado/verificado_em, mesma RLS, mesmo trigger de
-- atualizado_em. Quem entende uma tabela entende a outra.
--
-- ------------------------------------------------------------
-- POR QUE ESTA TABELA NAO E "LOJA QUE FAZ MANUTENCAO"
--
-- `lojas.faz_manutencao` responde "esta loja tambem mexe em replica?".
-- Nao responde o que o jogador realmente pergunta antes de entregar
-- uma AEG de R$ 3.000 para um desconhecido:
--
--   - ele abre a MINHA gearbox? (V2 e V3 sao mundos diferentes de V7,
--     GBBR e HPA — quase ninguem faz tudo)
--   - ele faz o servico que eu preciso? (revisao != shimming != solda
--     de mosfet)
--   - eu preciso ir ate la, ou posso MANDAR pelo correio?
--   - quanto tempo fica com ele, e tem garantia?
--
-- ------------------------------------------------------------
-- POR QUE CIDADE E OBRIGATORIA E ENDERECO NAO E
--
-- Campo e loja tem vitrine publica: endereco fixo, ficha no Maps,
-- CNPJ na Receita. Armeiro, na maioria, nao tem. Trabalha em bancada
-- dentro de casa, atende por WhatsApp e e pessoa fisica. Publicar o
-- endereco residencial dele por padrao afastaria justamente quem o
-- diretorio precisa listar.
--
-- Entao: cidade/UF sempre (e o que responde "quem atende perto de
-- mim" e e o que sustenta o SEO regional), endereco e coordenada so
-- quando existe ponto de atendimento E o armeiro autoriza — ver
-- `endereco_publico`.
--
-- E `atende_envio` existe porque boa parte do servico de armeiro no
-- Brasil e feito pelo correio: a gearbox viaja 2.000 km. Um filtro
-- por proximidade sozinho esconderia exatamente essa parte.
--
-- Aplicar DEPOIS de db/schema-lojas.sql (ha FK para `lojas`) e de
-- db/schema-reivindicacoes.sql (o ALTER TYPE do fim depende dele).
-- ============================================================

create extension if not exists pgcrypto;

-- Os tipos compartilhados ja existem se schema.sql/schema-lojas.sql
-- rodaram antes; os blocos sao idempotentes para que este arquivo
-- possa rodar sozinho.
do $$ begin
  create type public.status_publicacao as enum ('rascunho','publicado','inativo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.nivel_confianca as enum ('alta','media','baixa');
exception when duplicate_object then null; end $$;

-- autonomo: pessoa fisica com bancada propria, sem ponto publico.
-- oficina:  ponto de atendimento dedicado a manutencao.
-- loja:     armeiro que atende dentro de uma loja (ver `loja_id`).
do $$ begin
  create type public.armeiro_tipo as enum ('autonomo','oficina','loja');
exception when duplicate_object then null; end $$;

create table if not exists public.armeiros (
  id                   text primary key,            -- slug: entra na URL /armeiros/[id]
  nome                 text not null,               -- nome ou nome de guerra usado no meio
  descricao            text,

  tipo                 public.armeiro_tipo not null,
  status               public.status_publicacao not null default 'rascunho',

  -- ----------------------------------------------------------
  -- Localizacao. Cidade/UF obrigatorias; o resto e opcional e so
  -- aparece na ficha com `endereco_publico = true`.
  -- ----------------------------------------------------------
  uf                   char(2) not null,
  cidade               text not null,
  cidade_slug          text not null,
  bairro               text,
  endereco             text,
  cep                  text,
  lat                  numeric(9,6),
  lng                  numeric(9,6),
  -- Consentimento explicito para exibir endereco e pin no mapa.
  -- Default false: o silencio protege, nao expoe.
  endereco_publico     boolean not null default false,

  -- ----------------------------------------------------------
  -- Como atende
  -- ----------------------------------------------------------
  atende_presencial    boolean not null default false,
  atende_envio         boolean not null default false,
  -- Texto livre: "Grande Curitiba", "Vale do Paraiba", "so no campo X".
  raio_atendimento     text,

  -- ----------------------------------------------------------
  -- O que atende. Vocabulario fechado: sem isto, cada carga inventa
  -- um termo novo e o filtro do site quebra em silencio.
  -- ----------------------------------------------------------
  -- Plataforma e o que o mercado fala: "faco AEG e GBB". A versao da
  -- gearbox e granularidade que so o proprio armeiro declara, entao
  -- mora em `gearboxes`, separada e opcional. Toda fonte publica que
  -- levantamos (AEGPlus, airsoftrs) so traz a plataforma.
  plataformas          text[] not null default '{}',
  gearboxes            text[] not null default '{}',
  servicos             text[] not null default '{}',
  marcas               text[] not null default '{}',

  -- ----------------------------------------------------------
  -- Condicoes do servico: o que o jogador pergunta no primeiro
  -- contato e que hoje se perde no privado do WhatsApp.
  -- ----------------------------------------------------------
  prazo_medio          text,                        -- "3 a 7 dias uteis"
  garantia             text,                        -- "30 dias sobre o servico"
  emite_nota           boolean,                     -- null = nao apurado
  precos               text,                        -- texto livre, como em `campos`
  formas_pagamento     text,
  horario              text,

  -- Ano em que comecou a atender. Tempo de bancada e o proxy de
  -- experiencia mais honesto que existe aqui.
  desde                smallint check (desde is null or desde between 1990 and 2100),
  -- Curso/treinamento declarado pelo armeiro. A ficha mostra como
  -- DECLARADO — nao emitimos nem conferimos certificado de ninguem.
  formacao             text,

  -- Armeiro que atende dentro de uma loja do diretorio. Amarra as
  -- duas fichas sem duplicar o cadastro comercial.
  loja_id              text references public.lojas(id) on delete set null,

  -- Existe armeiro com CNPJ (MEI, quase sempre). Quando existe,
  -- vale muito para quem vai deixar equipamento caro.
  razao_social         text,
  cnpj                 text,
  situacao_cadastral   text,

  contato              jsonb not null default '{}'::jsonb,

  google_nota          numeric(2,1) check (google_nota is null or google_nota between 0 and 5),
  google_avaliacoes    integer check (google_avaliacoes is null or google_avaliacoes >= 0),

  observacoes          text,

  confianca            public.nivel_confianca,
  verificado           boolean not null default false,
  verificado_em        date,
  fonte                text,

  -- Quem enviou o cadastro pelo site. Null nos registros que a
  -- curadoria criou a mao. E o que permite a pessoa acompanhar o
  -- proprio envio antes de ele ser publicado.
  criado_por           uuid references auth.users(id) on delete set null,

  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now(),

  constraint armeiros_uf_maiuscula check (uf = upper(uf)),
  constraint armeiros_verificado_tem_data check (not verificado or verificado_em is not null),

  -- Endereco so vai para a tela com consentimento E com endereco.
  -- Sem esta trava, um `endereco_publico = true` solto renderizaria
  -- um bloco de endereco vazio na ficha.
  constraint armeiros_endereco_publico_tem_endereco check (
    not endereco_publico or endereco is not null
  ),

  -- Armeiro que nao atende nem presencial nem por envio nao atende
  -- ninguem: a ficha seria um beco sem saida.
  constraint armeiros_tem_forma_de_atender check (
    atende_presencial or atende_envio
  ),

  -- Quem nao recebe presencialmente nao tem por que publicar endereco.
  constraint armeiros_endereco_exige_presencial check (
    not endereco_publico or atende_presencial
  ),

  constraint armeiros_plataformas_validas check (
    plataformas <@ array[
      'aeg','aep','gbb','gbbr','hpa','spring','ptw'
    ]::text[]
  ),

  constraint armeiros_gearboxes_validas check (
    gearboxes <@ array['v2','v3','v6','v7']::text[]
  ),

  constraint armeiros_servicos_validos check (
    servicos <@ array[
      'manutencao','reparo','upgrade','shimming','aoe','hop-up',
      'eletronica','solda','customizacao','pintura'
    ]::text[]
  ),

  -- ----------------------------------------------------------
  -- NAO existe constraint de completude para publicar.
  --
  -- Existiu ate 25/08/2026: `armeiros_publicado_tem_plataforma` e
  -- `armeiros_publicado_tem_servico` exigiam pelo menos um item de
  -- cada para a ficha ir ao ar. Foram REMOVIDAS por decisao de
  -- produto, para permitir publicar o levantamento inicial completo —
  -- 19 dos 47 registros nao trazem plataforma porque a fonte publica
  -- nao informou, e inventar seria pior.
  --
  -- O QUE ISSO CUSTA, para quem mexer aqui depois saber:
  --
  --  1. Ficha publicada com `plataformas = {}` nunca aparece em busca
  --     filtrada por plataforma. Ela existe e e alcancavel por link,
  --     UF e texto — mas some do filtro principal.
  --  2. Por isso card, ficha e busca tratam o array vazio de forma
  --     explicita ("nao informado" + convite a reivindicar), em vez de
  --     renderizar um bloco vazio. Ver CardArmeiro.astro,
  --     FichaArmeiro.astro e BuscaArmeiros.astro.
  --
  -- Se um dia a lista estiver madura, recolocar as duas constraints e
  -- despublicar o que nao passar e o caminho de volta.
  -- ----------------------------------------------------------
  constraint armeiros_gearboxes_sem_plataforma check (
    -- Versao de gearbox so faz sentido para quem declara AEG: e a
    -- unica plataforma que TEM gearbox versionada.
    array_length(gearboxes, 1) is null or 'aeg' = any(plataformas)
  )
);

create index if not exists armeiros_status_idx      on public.armeiros (status);
create index if not exists armeiros_local_idx       on public.armeiros (uf, cidade_slug);
create index if not exists armeiros_envio_idx       on public.armeiros (atende_envio);
create index if not exists armeiros_plataformas_idx on public.armeiros using gin (plataformas);
create index if not exists armeiros_gearboxes_idx   on public.armeiros using gin (gearboxes);
create index if not exists armeiros_servicos_idx    on public.armeiros using gin (servicos);
create index if not exists armeiros_contato_idx     on public.armeiros using gin (contato);

-- Ja existe se schema-lojas.sql rodou; o create or replace e inofensivo.
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end $$;

drop trigger if exists armeiros_atualizado_em on public.armeiros;
create trigger armeiros_atualizado_em before update on public.armeiros
  for each row execute function public.tocar_atualizado_em();

-- ============================================================
-- RLS: mesma regra de `campos` e `lojas`. A anon key roda no build
-- (e e publica), entao o filtro de publicacao mora no banco.
-- ============================================================
alter table public.armeiros enable row level security;

drop policy if exists armeiros_leitura_publica on public.armeiros;
create policy armeiros_leitura_publica on public.armeiros
  for select to anon, authenticated
  using (status = 'publicado');

-- Quem enviou o proprio cadastro consegue ver o rascunho dele enquanto
-- espera a curadoria. Sem isto a pessoa envia e a ficha some da vista.
drop policy if exists armeiros_le_o_proprio_envio on public.armeiros;
create policy armeiros_le_o_proprio_envio on public.armeiros
  for select to authenticated
  using (criado_por = auth.uid());

-- ------------------------------------------------------------
-- Auto-cadastro.
--
-- Este diretorio nao veio de levantamento: ele enche por submissao.
-- Entao existe UMA policy de insert — e ela e escrita para que o que
-- entra por aqui nao possa se publicar sozinho:
--
--   status     travado em 'rascunho'  -> nao aparece no site
--   verificado travado em false       -> nao herda selo
--   fonte      travada em 'submissao' -> a ficha diz de onde veio
--   criado_por travado em auth.uid()  -> ninguem envia em nome de outro
--
-- Publicar continua sendo ato humano, feito pelo service_role.
-- ------------------------------------------------------------
drop policy if exists armeiros_auto_cadastro on public.armeiros;
create policy armeiros_auto_cadastro on public.armeiros
  for insert to authenticated
  with check (
    criado_por = auth.uid()
    and status = 'rascunho'
    and verificado = false
    and fonte = 'submissao'
  );

-- Um envio aberto por pessoa. Trava de spam simples: quem ja mandou
-- um cadastro que ainda nao foi publicado nao manda outro.
create unique index if not exists armeiros_um_rascunho_por_usuario
  on public.armeiros (criado_por)
  where criado_por is not null and status = 'rascunho';

-- Nenhuma policy de update/delete: corrigir e despublicar sao atos do
-- service_role. Quem quer editar a ficha ja publicada reivindica ela.

-- ============================================================
-- Reivindicacao: armeiro passa a ser entidade reivindicavel, igual
-- a campo e loja. Sem isto o botao "e voce?" da ficha quebra na
-- constraint do enum.
--
-- Se esta linha falhar com "ALTER TYPE ... cannot run inside a
-- transaction block", rode-a sozinha no SQL editor do Supabase:
--   alter type public.tipo_entidade add value if not exists 'armeiro';
-- ============================================================
do $$
begin
  if exists (select 1 from pg_type where typname = 'tipo_entidade') then
    execute 'alter type public.tipo_entidade add value if not exists ''armeiro''';
  end if;
end $$;
