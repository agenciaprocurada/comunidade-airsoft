-- ============================================================
-- Comunidade Airsoft — area de usuarios
--
-- Base: documento de projeto §4.1 (entidade Usuario/Jogador) e
-- §7.2 (LGPD). Duas decisoes estruturais que este schema trava:
--
-- 1. CONSENTIMENTO NAO E BOOLEANO NO PERFIL. E uma linha por evento
--    na tabela `consentimentos`, com data/hora, IP e versao do texto
--    aceito. O documento (§7.2) e o plano de acao (§3) dizem que
--    refazer isso depois com a base montada e inviavel. Tabela
--    append-only: nao ha policy de update nem de delete.
--
-- 2. PAPEL DE DONO DE CAMPO/LOJA NAO E COLUNA AQUI. Reivindicacao
--    exige aprovacao e vai virar tabela propria quando a feature
--    existir. Um `role` no perfil viraria retrabalho.
--
-- Aplicar no SQL Editor do Supabase DEPOIS de db/schema.sql.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Tipos
-- ------------------------------------------------------------

do $$ begin
  create type public.nivel_jogador as enum ('iniciante','intermediario','veterano');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.estilo_jogo as enum ('recreativo','milsim','speedsoft','cqb');
exception when duplicate_object then null; end $$;

-- Os dois primeiros sao condicao de uso; os tres ultimos sao opcionais
-- e precisam ser pedidos separados — consentimento em bloco unico nao
-- atende a LGPD para uso comercial da base (Fase 2, afiliacao).
do $$ begin
  create type public.tipo_consentimento as enum (
    'termos_de_uso',
    'politica_privacidade',
    'comunicacao_email',
    'comunicacao_whatsapp',
    'uso_dados_recomendacao'
  );
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- Perfis
-- ------------------------------------------------------------

create table if not exists public.perfis (
  id                   uuid primary key references auth.users(id) on delete cascade,

  nome                 text,
  nickname             text,
  foto_url             text,

  -- Obrigatorio no cadastro (decisao de produto). Guardado em E.164
  -- para nao ter que normalizar de novo quando a confirmacao por
  -- WhatsApp entrar. `whatsapp_verificado` ja existe e fica false
  -- ate essa feature chegar.
  whatsapp             text,
  whatsapp_verificado  boolean not null default false,

  -- Base de toda a segmentacao (doc §4.1). Sem isso o convite para o
  -- grupo regional e a afiliacao da Fase 2 nao tem como funcionar.
  uf                   char(2),
  cidade               text,
  cidade_slug          text,

  nivel                public.nivel_jogador,
  estilos              public.estilo_jogo[] not null default '{}',

  -- { "instagram": "...", "youtube": "..." }
  redes                jsonb not null default '{}'::jsonb,

  -- Airsoft e atividade para maiores de 18 (doc §9). Declaracao
  -- explicita no cadastro, exigida de novo na venda de inscricao
  -- da Fase 2.
  maioridade           boolean not null default false,

  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now(),

  -- Minimo para liberar o painel.
  onboarding_ok boolean generated always as (
    maioridade
    and whatsapp is not null
    and uf is not null
    and coalesce(cidade, '') <> ''
  ) stored,

  -- Minimo para cadastrar ou reivindicar qualquer coisa. Quem so quer
  -- navegar nunca precisa chegar aqui.
  perfil_completo boolean generated always as (
    maioridade
    and whatsapp is not null
    and uf is not null
    and coalesce(cidade, '') <> ''
    and coalesce(nome, '') <> ''
    and nivel is not null
    and array_length(estilos, 1) is not null
  ) stored,

  constraint perfis_uf_maiuscula   check (uf is null or uf = upper(uf)),
  -- E.164 brasileiro: +55 + DDD + 8 ou 9 digitos.
  constraint perfis_whatsapp_e164  check (whatsapp is null or whatsapp ~ '^\+55[1-9]{2}[0-9]{8,9}$'),
  constraint perfis_nickname_forma check (nickname is null or nickname ~ '^[a-z0-9._-]{3,24}$')
);

-- Nickname unico sem diferenciar maiuscula (evita "Sniper" e "sniper").
create unique index if not exists perfis_nickname_unico
  on public.perfis (lower(nickname)) where nickname is not null;

create index if not exists perfis_local_idx on public.perfis (uf, cidade_slug);

drop trigger if exists perfis_atualizado_em on public.perfis;
create trigger perfis_atualizado_em before update on public.perfis
  for each row execute function public.tocar_atualizado_em();

-- ------------------------------------------------------------
-- Consentimentos — append-only, um registro por evento
-- ------------------------------------------------------------

create table if not exists public.consentimentos (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references auth.users(id) on delete cascade,
  tipo          public.tipo_consentimento not null,
  concedido     boolean not null,
  -- Qual texto a pessoa aceitou. Se os Termos mudarem, o registro
  -- antigo continua provando o que foi aceito naquele dia.
  versao_texto  text not null,
  ip            inet,
  user_agent    text,
  criado_em     timestamptz not null default now()
);

create index if not exists consentimentos_usuario_idx
  on public.consentimentos (usuario_id, tipo, criado_em desc);

-- Estado atual de cada consentimento: a linha mais recente por tipo.
--
-- `security_invoker = true` NAO E OPCIONAL. Sem isso a view roda com os
-- privilegios do dono (postgres), a RLS da tabela e ignorada e qualquer
-- usuario logado leria o consentimento de todos pela API.
create or replace view public.consentimentos_atuais
with (security_invoker = true) as
select distinct on (usuario_id, tipo)
  usuario_id, tipo, concedido, versao_texto, criado_em
from public.consentimentos
order by usuario_id, tipo, criado_em desc;

grant select on public.consentimentos_atuais to authenticated;

-- ------------------------------------------------------------
-- Perfil nasce junto com o usuario
-- ------------------------------------------------------------

create or replace function public.criar_perfil_ao_cadastrar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, nome, foto_url)
  values (
    new.id,
    nullif(trim(coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    )), ''),
    nullif(trim(coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture',
      ''
    )), '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.criar_perfil_ao_cadastrar();

-- Quem se cadastrou ANTES do gatilho existir ficou sem perfil. Sem
-- linha em `perfis`, a pessoa nunca completa o onboarding e fica
-- presa num laco entre o formulario e o painel. Idempotente: pode
-- rodar o arquivo inteiro de novo sem estragar nada.
insert into public.perfis (id, nome, foto_url)
select
  u.id,
  nullif(trim(coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    ''
  )), ''),
  nullif(trim(coalesce(
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture',
    ''
  )), '')
from auth.users u
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- RLS
--
-- Perfil e privado por enquanto. Quando existir pagina publica de
-- jogador, a exposicao entra como uma policy de leitura restrita a
-- colunas escolhidas (via view), nunca abrindo a tabela inteira —
-- ela guarda WhatsApp.
-- ------------------------------------------------------------

alter table public.perfis enable row level security;

drop policy if exists perfis_le_o_proprio on public.perfis;
create policy perfis_le_o_proprio on public.perfis
  for select to authenticated using (auth.uid() = id);

drop policy if exists perfis_edita_o_proprio on public.perfis;
create policy perfis_edita_o_proprio on public.perfis
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Rede de seguranca: o normal e o trigger criar a linha.
drop policy if exists perfis_cria_o_proprio on public.perfis;
create policy perfis_cria_o_proprio on public.perfis
  for insert to authenticated with check (auth.uid() = id);

alter table public.consentimentos enable row level security;

drop policy if exists consentimentos_le_o_proprio on public.consentimentos;
create policy consentimentos_le_o_proprio on public.consentimentos
  for select to authenticated using (auth.uid() = usuario_id);

drop policy if exists consentimentos_registra_o_proprio on public.consentimentos;
create policy consentimentos_registra_o_proprio on public.consentimentos
  for insert to authenticated with check (auth.uid() = usuario_id);

-- Sem policy de update/delete de proposito: historico de consentimento
-- que pode ser reescrito nao serve como prova.

-- `whatsapp_verificado` nao pode ser marcado pelo proprio usuario.
-- A policy de update acima permitiria; o gatilho abaixo bloqueia.
create or replace function public.travar_whatsapp_verificado()
returns trigger language plpgsql as $$
begin
  if new.whatsapp_verificado is distinct from old.whatsapp_verificado
     and auth.uid() is not null then
    new.whatsapp_verificado = old.whatsapp_verificado;
  end if;
  -- Trocou o numero? A verificacao anterior nao vale mais.
  if new.whatsapp is distinct from old.whatsapp then
    new.whatsapp_verificado = false;
  end if;
  return new;
end $$;

drop trigger if exists perfis_trava_verificacao on public.perfis;
create trigger perfis_trava_verificacao before update on public.perfis
  for each row execute function public.travar_whatsapp_verificado();
