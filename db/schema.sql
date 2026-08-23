-- ============================================================
-- Comunidade Airsoft — schema de diretorio de campos
-- Fonte da carga inicial: planilha "PAINTBALL E AIRSOFT NO RIO
-- GRANDE DO SUL - levantamento de locais (agosto/2026)".
-- ============================================================

create extension if not exists pgcrypto;

do $$ begin
  create type public.modalidade as enum ('airsoft','paintball','ambos');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.status_publicacao as enum ('rascunho','publicado','inativo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.nivel_confianca as enum ('alta','media','baixa');
exception when duplicate_object then null; end $$;

create table if not exists public.campos (
  id                   text primary key,
  nome                 text not null,
  modalidade           public.modalidade not null,
  modalidade_original  text,
  tipo_operacao        text,

  -- 'status' controla publicacao; 'status_original' preserva o texto
  -- da planilha, que e mais rico ("A confirmar", "Temporariamente
  -- fechado") e nao pode ser perdido na normalizacao.
  status               public.status_publicacao not null default 'rascunho',
  status_original      text,

  uf                   char(2) not null,
  cidade               text not null,
  cidade_slug          text not null,
  regiao               text,
  bairro               text,
  endereco             text,

  terreno              text[] not null default '{}',
  tipo_campo_original  text,
  precos               text,

  contato              jsonb not null default '{}'::jsonb,

  google_nota          numeric(2,1) check (google_nota is null or google_nota between 0 and 5),
  google_avaliacoes    integer check (google_avaliacoes is null or google_avaliacoes >= 0),

  observacoes          text,

  -- Confianca vem do levantamento; 'verificado' so vira true depois
  -- de confirmacao com o responsavel pelo campo.
  confianca            public.nivel_confianca,
  verificado           boolean not null default false,
  verificado_em        date,
  fonte                text,

  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now(),

  constraint campos_uf_maiuscula check (uf = upper(uf)),
  constraint campos_verificado_tem_data check (not verificado or verificado_em is not null)
);

create index if not exists campos_modalidade_idx on public.campos (modalidade);
create index if not exists campos_status_idx     on public.campos (status);
create index if not exists campos_local_idx      on public.campos (uf, cidade_slug);
create index if not exists campos_contato_idx    on public.campos using gin (contato);

create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end $$;

drop trigger if exists campos_atualizado_em on public.campos;
create trigger campos_atualizado_em before update on public.campos
  for each row execute function public.tocar_atualizado_em();

-- ============================================================
-- RLS: a anon key e publica (vai no navegador). Sem isso,
-- qualquer visitante leria rascunho e escreveria na tabela.
-- ============================================================
alter table public.campos enable row level security;

drop policy if exists campos_leitura_publica on public.campos;
create policy campos_leitura_publica on public.campos
  for select to anon, authenticated
  using (status = 'publicado');

-- Nenhuma policy de insert/update/delete: so o service_role escreve.
