-- ============================================================
-- Comunidade Airsoft — Achados (produtos com link de afiliado)
--
-- Vitrine de produtos que o site indica, com link de afiliado do
-- Mercado Livre, Shopee, AliExpress e afins. O site nao vende nada:
-- mostra o produto e manda para a loja, que paga comissao pelo clique
-- que virou compra.
--
-- Decisoes que este arquivo trava:
--
-- 1. PRODUTO E OFERTA SAO TABELAS SEPARADAS. A mesma replica costuma
--    ter link nas tres lojas; guardar "um produto = um link" faria o
--    mesmo item aparecer tres vezes na vitrine. Um produto tem N
--    ofertas, no maximo uma por loja.
--
-- 2. PRECO E REFERENCIA, NAO PROMESSA. Preco de afiliado muda toda
--    semana. A oferta guarda o preco E a data em que foi visto: a
--    vitrine mostra "R$ 189,90 · visto em set/26", e o admin enxerga
--    o que esta velho para revisar. Preco pode ficar vazio — a oferta
--    continua valida como "ver preco na loja".
--
-- 3. IMAGEM E URL COLADA, NAO ARQUIVO. Decisao do Vinicius em
--    11/09/2026, avisado do risco: a loja pode trocar o endereco da
--    foto e o card fica sem imagem. A tela mostra um fallback nesse
--    caso; nao ha bucket.
--
-- 4. SO ADMIN ESCREVE. Link de afiliado e receita do site: nao ha
--    cadastro por terceiro.
--
-- 5. SEM CATEGORIA por enquanto. Lista unica, mais recente primeiro.
--    Entra quando a vitrine tiver volume que justifique filtro.
--
-- Aplicar DEPOIS de schema.sql (usa `tocar_atualizado_em`) e de
-- schema-reivindicacoes.sql (usa `e_admin`).
-- ============================================================

-- ------------------------------------------------------------
-- Produto
-- ------------------------------------------------------------

create table if not exists public.achados (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null check (char_length(nome) between 2 and 120),
  descricao     text check (descricao is null or char_length(descricao) <= 600),
  imagem_url    text check (imagem_url is null or imagem_url ~* '^https?://'),
  -- So `publicado` aparece no site. Nasce rascunho: cadastrar e
  -- publicar sao dois gestos, senao um produto pela metade vai ao ar.
  status        text not null default 'rascunho'
                check (status in ('publicado', 'rascunho')),
  criado_por    uuid references auth.users (id) on delete set null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.achados is
  'Produto indicado na vitrine /achados. As ofertas (link por loja) ficam em achado_ofertas.';
comment on column public.achados.imagem_url is
  'URL da foto, colada da loja. Pode quebrar quando a loja trocar o endereco.';

drop trigger if exists achados_atualizado_em on public.achados;
create trigger achados_atualizado_em before update on public.achados
  for each row execute function public.tocar_atualizado_em();

-- A vitrine ordena por publicado + mais recente.
create index if not exists achados_vitrine_idx
  on public.achados (atualizado_em desc) where status = 'publicado';

-- ------------------------------------------------------------
-- Oferta: o link de afiliado em UMA loja
-- ------------------------------------------------------------

create table if not exists public.achado_ofertas (
  id             uuid primary key default gen_random_uuid(),
  achado_id      uuid not null references public.achados (id) on delete cascade,
  loja           text not null
                 check (loja in ('mercadolivre', 'shopee', 'aliexpress', 'amazon', 'outra')),
  url            text not null check (url ~* '^https?://'),
  -- Preco em reais. Nulo = "ver preco na loja".
  preco          numeric(10, 2) check (preco is null or preco > 0),
  -- Quando o preco foi conferido. Anda junto com o preco: sem data, o
  -- numero nao diz nada.
  preco_visto_em date,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  -- Uma oferta por loja: dois links do mesmo produto na mesma loja e
  -- erro de cadastro, nao caso de uso.
  unique (achado_id, loja),
  check ((preco is null) = (preco_visto_em is null))
);

comment on table public.achado_ofertas is
  'Link de afiliado de um achado em uma loja. No maximo um por loja.';

drop trigger if exists achado_ofertas_atualizado_em on public.achado_ofertas;
create trigger achado_ofertas_atualizado_em before update on public.achado_ofertas
  for each row execute function public.tocar_atualizado_em();

create index if not exists achado_ofertas_por_achado
  on public.achado_ofertas (achado_id);

-- ------------------------------------------------------------
-- Quem le, quem escreve
-- ------------------------------------------------------------

alter table public.achados enable row level security;
alter table public.achado_ofertas enable row level security;

-- Visitante (logado ou nao) ve so o publicado.
drop policy if exists achados_leitura_publica on public.achados;
create policy achados_leitura_publica on public.achados
  for select to anon, authenticated
  using (status = 'publicado');

-- A oferta segue o produto: aparece se o produto esta publicado.
drop policy if exists achado_ofertas_leitura_publica on public.achado_ofertas;
create policy achado_ofertas_leitura_publica on public.achado_ofertas
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.achados a
      where a.id = achado_id and a.status = 'publicado'
    )
  );

-- Admin faz tudo, inclusive ler rascunho.
drop policy if exists achados_admin on public.achados;
create policy achados_admin on public.achados
  for all to authenticated
  using (public.e_admin()) with check (public.e_admin());

drop policy if exists achado_ofertas_admin on public.achado_ofertas;
create policy achado_ofertas_admin on public.achado_ofertas
  for all to authenticated
  using (public.e_admin()) with check (public.e_admin());

-- ------------------------------------------------------------
-- Preco cheio ("de R$ 129 por R$ 96,90")
--
-- Acrescentado em 11/09/2026, na primeira carga: a planilha de
-- afiliado do Mercado Livre traz o valor cheio e o promocional. So
-- `preco` (o que se paga hoje) e obrigatorio para mostrar; o cheio
-- e enfeite de desconto e pode faltar. Nunca vem sozinho nem menor
-- que o preco — senao vira "de R$ 96 por R$ 129".
-- ------------------------------------------------------------

alter table public.achado_ofertas
  add column if not exists preco_cheio numeric(10, 2);

comment on column public.achado_ofertas.preco_cheio is
  'Valor "de", riscado no card. Opcional; exige preco e tem que ser maior que ele.';

alter table public.achado_ofertas drop constraint if exists achado_ofertas_preco_cheio_check;
alter table public.achado_ofertas add constraint achado_ofertas_preco_cheio_check
  check (preco_cheio is null or (preco is not null and preco_cheio > preco));
