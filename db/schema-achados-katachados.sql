-- ============================================================
-- Comunidade Airsoft — Achados alimentados pelo Katachados
--
-- O Katachados (sistema de ofertas do Vinicius) manda, a cada hora,
-- as ofertas de airsoft enviadas nas ultimas 24h. Decisao de
-- 17/10/2026: entram publicadas direto, e as que saem da lista voltam
-- a rascunho (somem do site, mas nao sao apagadas).
--
-- Decisoes que este arquivo trava:
--
-- 1. ORIGEM SEPARA MANUAL DE AUTOMATICO. A troca diaria so mexe em
--    `origem = 'katachados'`. O que o admin cadastrou a mao (inclusive
--    a primeira carga da planilha) nunca e tocado por ela.
--
-- 2. ENTRADA POR UMA FUNCAO SO, COM CHAVE PROPRIA. O Katachados nao
--    recebe a chave mestra deste banco. Ele chama a rota
--    /api/achados/sincronizar do site, que repassa para
--    `katachados_sincronizar`. A funcao confere o hash da chave; a
--    chave em si so existe nos segredos do Katachados.
--
-- 3. SAIR = RASCUNHO, NAO DELETE. Se a sincronizacao errar, nada se
--    perde: e so publicar de novo no admin.
--
-- Aplicar DEPOIS de schema-achados.sql. Idempotente.
-- ============================================================

alter table public.achados
  add column if not exists origem text not null default 'manual';
alter table public.achados drop constraint if exists achados_origem_check;
alter table public.achados add constraint achados_origem_check
  check (origem in ('manual', 'katachados'));

-- Codigo do produto na loja (ex.: MLB6247249354). Chave da troca diaria.
alter table public.achados
  add column if not exists origem_ref text;

create unique index if not exists achados_origem_ref_unico
  on public.achados (origem, origem_ref) where origem_ref is not null;

comment on column public.achados.origem is
  'manual = cadastrado no admin; katachados = entra e sai sozinho pela sincronizacao.';

-- ------------------------------------------------------------
-- Chaves de integracao: so o hash. RLS ligado e sem policy =
-- ninguem le pela API; so funcoes security definer.
-- ------------------------------------------------------------

create table if not exists public.integracao_chaves (
  nome       text primary key,
  chave_hash text not null
);
alter table public.integracao_chaves enable row level security;
revoke all on public.integracao_chaves from anon, authenticated;

insert into public.integracao_chaves (nome, chave_hash)
values ('katachados', 'fbf5be27aa64a7c3b312d84159acce7d9758bd6ac3e726c2389b7453b3c8284c')
on conflict (nome) do update set chave_hash = excluded.chave_hash;

-- ------------------------------------------------------------
-- A sincronizacao
--
-- p_itens: [{ ref, nome, imagem_url, url, preco, preco_cheio }]
-- A lista e o retrato COMPLETO do momento: o que estava publicado
-- pelo Katachados e nao veio na lista volta a rascunho.
-- ------------------------------------------------------------

create or replace function public.katachados_sincronizar(p_chave text, p_itens jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item     jsonb;
  v_id       uuid;
  v_ref      text;
  v_nome     text;
  v_url      text;
  v_preco    numeric;
  v_cheio    numeric;
  v_hoje     date := (now() at time zone 'America/Sao_Paulo')::date;
  v_refs     text[] := '{}';
  v_entraram int := 0;
  v_ignorados int := 0;
  v_sairam   int;
begin
  if p_chave is null or not exists (
    select 1 from public.integracao_chaves
    where nome = 'katachados'
      and chave_hash = encode(sha256(convert_to(p_chave, 'UTF8')), 'hex')
  ) then
    raise exception 'chave invalida' using errcode = '28000';
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) > 300 then
    raise exception 'lista invalida (array de ate 300 itens)';
  end if;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    v_ref   := nullif(trim(v_item->>'ref'), '');
    v_nome  := left(trim(coalesce(v_item->>'nome', '')), 120);
    v_url   := trim(coalesce(v_item->>'url', ''));
    v_preco := nullif(v_item->>'preco', '')::numeric;
    v_cheio := nullif(v_item->>'preco_cheio', '')::numeric;
    if v_ref is null or char_length(v_nome) < 2 or v_url !~* '^https://' or v_preco is null or v_preco <= 0 then
      v_ignorados := v_ignorados + 1;
      continue;
    end if;
    if v_cheio is not null and v_cheio <= v_preco then v_cheio := null; end if;

    insert into public.achados (nome, imagem_url, status, origem, origem_ref)
    values (v_nome,
            case when v_item->>'imagem_url' ~* '^https?://' then v_item->>'imagem_url' end,
            'publicado', 'katachados', v_ref)
    on conflict (origem, origem_ref) where origem_ref is not null
    do update set nome = excluded.nome,
                  imagem_url = coalesce(excluded.imagem_url, public.achados.imagem_url),
                  status = 'publicado'
    returning id into v_id;

    insert into public.achado_ofertas (achado_id, loja, url, preco, preco_cheio, preco_visto_em)
    values (v_id, 'mercadolivre', v_url, round(v_preco, 2), round(v_cheio, 2), v_hoje)
    on conflict (achado_id, loja)
    do update set url = excluded.url, preco = excluded.preco,
                  preco_cheio = excluded.preco_cheio, preco_visto_em = excluded.preco_visto_em;

    v_refs := v_refs || v_ref;
    v_entraram := v_entraram + 1;
  end loop;

  update public.achados set status = 'rascunho'
  where origem = 'katachados' and status = 'publicado'
    and not (origem_ref = any (v_refs));
  get diagnostics v_sairam = row_count;

  return jsonb_build_object('publicados', v_entraram, 'ignorados', v_ignorados, 'sairam', v_sairam);
end;
$$;

revoke all on function public.katachados_sincronizar(text, jsonb) from public;
grant execute on function public.katachados_sincronizar(text, jsonb) to anon, authenticated;
