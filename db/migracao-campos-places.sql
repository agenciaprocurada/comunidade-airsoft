-- ============================================================
-- Comunidade Airsoft — preparacao de `campos` para a coleta
-- nacional via Google Places API.
--
-- Tres coisas que faltavam e que ficam caras se descobertas
-- depois de 1.000 campos carregados:
--
--  1. lat/lng. A Places devolve coordenada de graca em toda
--     resposta. Coletar sem gravar significa varrer tudo de
--     novo quando o mapa da Entrega 4 entrar.
--  2. place_id. Hoje a chave de deduplicacao e o slug do nome,
--     que colide entre estados ("Arena Airsoft" existe em SP,
--     PR e BA). O place_id e estavel e global.
--  3. Uma area de staging. Dado bruto de API nao pode cair
--     direto na tabela que alimenta o site.
-- ============================================================

alter table public.campos add column if not exists lat numeric(9,6);
alter table public.campos add column if not exists lng numeric(9,6);

-- Identificador do Google. UNIQUE com NULL permitido: campo que
-- nunca apareceu na Places continua valido sem place_id.
alter table public.campos add column if not exists place_id text;
alter table public.campos add column if not exists place_status text;
alter table public.campos add column if not exists place_visto_em date;

do $$ begin
  alter table public.campos add constraint campos_place_id_unico unique (place_id);
exception when duplicate_table or duplicate_object then null; end $$;

create index if not exists campos_place_idx on public.campos (place_id);

-- ============================================================
-- Staging: uma linha por resultado bruto da Places, por lote.
--
-- Nada aqui vai para o site. O site le `campos`; isto e a mesa
-- de trabalho onde o resultado da API espera a conciliacao.
-- Guardar o JSON inteiro custa quase nada e evita refazer a
-- chamada quando a regra de normalizacao mudar.
-- ============================================================

create table if not exists public.campos_bruto (
  place_id        text primary key,
  lote            text not null,          -- 'rs-2026-08', 'sp-grande-2026-09'
  consulta        text not null,          -- termo exato que trouxe o resultado
  nome            text not null,
  endereco        text,
  uf              char(2),
  cidade          text,
  lat             numeric(9,6),
  lng             numeric(9,6),
  telefone        text,
  site            text,
  google_nota     numeric(2,1),
  google_avaliacoes integer,
  place_status    text,                   -- OPERATIONAL | CLOSED_TEMPORARILY | CLOSED_PERMANENTLY
  tipos           text[] not null default '{}',
  bruto           jsonb not null,

  -- Preenchido pela conciliacao: para onde este resultado foi.
  destino         text,                   -- 'novo' | 'atualizado' | 'ignorado' | 'pendente'
  campo_id        text references public.campos(id) on delete set null,
  motivo          text,

  coletado_em     timestamptz not null default now()
);

create index if not exists campos_bruto_lote_idx    on public.campos_bruto (lote);
create index if not exists campos_bruto_destino_idx on public.campos_bruto (destino);
create index if not exists campos_bruto_local_idx   on public.campos_bruto (uf, cidade);

-- Staging nao e conteudo publico: sem policy, a anon nao le nada.
alter table public.campos_bruto enable row level security;
