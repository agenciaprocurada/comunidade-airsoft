-- ============================================================
-- Comunidade Airsoft — schema do diretorio de lojas (doc §4.4)
-- Fonte da carga inicial: levantamento de lojas online de airsoft
-- feito em agosto/2026 a partir dos sites oficiais + consulta de
-- CNPJ na Receita Federal (BrasilAPI).
--
-- Espelha `campos` de proposito: mesmos enums de status e
-- confianca, mesmo par verificado/verificado_em, mesma RLS.
-- ============================================================

create extension if not exists pgcrypto;

-- Os tipos abaixo ja existem se db/schema.sql rodou antes; o bloco
-- e idempotente para que este arquivo possa rodar sozinho.
do $$ begin
  create type public.status_publicacao as enum ('rascunho','publicado','inativo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.nivel_confianca as enum ('alta','media','baixa');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.loja_tipo as enum ('fisica','online','ambas');
exception when duplicate_object then null; end $$;

create table if not exists public.lojas (
  id                   text primary key,            -- slug: entra na URL /lojas/[id]
  nome                 text not null,

  -- Razao social e CNPJ vem da Receita. Sao o que separa loja seria
  -- de perfil de Instagram que some com o dinheiro do jogador.
  razao_social         text,
  cnpj                 text,
  situacao_cadastral   text,

  descricao            text,
  tipo                 public.loja_tipo not null,

  status               public.status_publicacao not null default 'rascunho',

  -- Loja so-online pode nao ter endereco de atendimento; quando tem
  -- CNPJ, guardamos o endereco da sede assim mesmo (util para SEO
  -- regional e para o hub /lojas/[uf]).
  uf                   char(2),
  cidade               text,
  cidade_slug          text,
  bairro               text,
  endereco             text,
  cep                  text,
  lat                  numeric(9,6),
  lng                  numeric(9,6),

  categorias           text[] not null default '{}',
  marcas               text[] not null default '{}',

  faz_manutencao       boolean not null default false,
  faz_customizacao     boolean not null default false,

  -- Comercial: o que o jogador quer saber antes de comprar.
  entrega_nacional     boolean,
  formas_pagamento     text,
  desconto_avista      text,
  cupom                text,                        -- vira afiliacao na Fase 2
  horario              text,

  contato              jsonb not null default '{}'::jsonb,

  google_nota          numeric(2,1) check (google_nota is null or google_nota between 0 and 5),
  google_avaliacoes    integer check (google_avaliacoes is null or google_avaliacoes >= 0),

  observacoes          text,

  confianca            public.nivel_confianca,
  verificado           boolean not null default false,
  verificado_em        date,
  fonte                text,

  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now(),

  constraint lojas_uf_maiuscula check (uf is null or uf = upper(uf)),
  constraint lojas_verificado_tem_data check (not verificado or verificado_em is not null),
  -- Loja fisica sem cidade e uma ficha inutil: ninguem consegue ir ate ela.
  constraint lojas_fisica_tem_local check (
    tipo = 'online' or (uf is not null and cidade is not null and cidade_slug is not null)
  ),
  -- Vocabulario fechado do doc §4.4. Sem isto, cada carga inventa
  -- uma categoria nova e o filtro do site quebra em silencio.
  constraint lojas_categorias_validas check (
    categorias <@ array['replicas','upgrade','vestuario','consumivel','acessorio']::text[]
  ),
  constraint lojas_tem_categoria check (array_length(categorias, 1) >= 1)
);

create index if not exists lojas_tipo_idx    on public.lojas (tipo);
create index if not exists lojas_status_idx  on public.lojas (status);
create index if not exists lojas_local_idx   on public.lojas (uf, cidade_slug);
create index if not exists lojas_contato_idx on public.lojas using gin (contato);
create index if not exists lojas_categorias_idx on public.lojas using gin (categorias);

create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end $$;

drop trigger if exists lojas_atualizado_em on public.lojas;
create trigger lojas_atualizado_em before update on public.lojas
  for each row execute function public.tocar_atualizado_em();

-- ============================================================
-- RLS: mesma regra de `campos`. A anon key roda no build (e e
-- publica), entao o filtro de publicacao mora no banco.
-- ============================================================
alter table public.lojas enable row level security;

drop policy if exists lojas_leitura_publica on public.lojas;
create policy lojas_leitura_publica on public.lojas
  for select to anon, authenticated
  using (status = 'publicado');

-- Nenhuma policy de insert/update/delete: so o service_role escreve.
