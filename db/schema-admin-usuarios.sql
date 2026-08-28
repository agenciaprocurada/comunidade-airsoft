-- ============================================================
-- Comunidade Airsoft — o administrador ve quem esta cadastrado
--
-- O e-mail e a data do ultimo acesso moram em `auth.users`, que a API
-- nao expoe para usuario logado. O resto (nome, cidade, WhatsApp)
-- mora em `perfis`, que so deixa cada um ler a propria linha.
--
-- Uma funcao `security definer` junta as duas tabelas e so responde
-- para quem esta em `administradores` — e o mesmo desenho de
-- `e_admin()` (schema-reivindicacoes.sql): a checagem fica no banco,
-- nao na tela.
--
-- Aplicar DEPOIS de schema-reivindicacoes.sql (usa `e_admin`),
-- schema-armamentos.sql, schema-mapas.sql e schema-operacoes.sql
-- (as contagens leem essas tabelas).
-- ============================================================

-- ------------------------------------------------------------
-- Admin le qualquer perfil
--
-- A tela de decisao de reivindicacao ja mostra o perfil de quem pediu
-- (`solicitante`), mas a unica policy de leitura em `perfis` era
-- "o proprio". Para o admin a consulta voltava vazia.
-- ------------------------------------------------------------

drop policy if exists perfis_admin_le_tudo on public.perfis;
create policy perfis_admin_le_tudo on public.perfis
  for select to authenticated using (public.e_admin());

-- ------------------------------------------------------------
-- Lista de usuarios
--
-- `p_busca` procura em nome, nickname, e-mail, cidade e WhatsApp.
-- `p_situacao`: 'completo' (perfil completo), 'basico' (cadastro
-- minimo feito, perfil ainda nao) ou 'incompleto' (nem o minimo).
-- `total` repete em toda linha a contagem ANTES do limite, para a
-- tela avisar quando esta mostrando so uma parte.
-- ------------------------------------------------------------

drop function if exists public.admin_lista_usuarios(text, text, text, integer);

create or replace function public.admin_lista_usuarios(
  p_busca    text    default null,
  p_uf       text    default null,
  p_situacao text    default null,
  p_limite   integer default 200
)
returns table (
  id               uuid,
  email            text,
  provedor         text,
  nome             text,
  nickname         text,
  foto_url         text,
  whatsapp         text,
  uf               text,
  cidade           text,
  nivel            text,
  estilos          text[],
  onboarding_ok    boolean,
  perfil_completo  boolean,
  criado_em        timestamptz,
  ultimo_acesso    timestamptz,
  replicas         bigint,
  mapas            bigint,
  operacoes        bigint,
  total            bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_busca text := nullif(btrim(coalesce(p_busca, '')), '');
  v_uf    text := nullif(upper(btrim(coalesce(p_uf, ''))), '');
begin
  if not public.e_admin() then
    raise exception 'Somente administrador' using errcode = '42501';
  end if;

  return query
  select
    u.id,
    u.email::text,
    coalesce(u.raw_app_meta_data->>'provider', '')::text,
    p.nome,
    p.nickname,
    p.foto_url,
    p.whatsapp,
    p.uf::text,
    p.cidade,
    p.nivel::text,
    coalesce(p.estilos::text[], '{}'::text[]),
    coalesce(p.onboarding_ok, false),
    coalesce(p.perfil_completo, false),
    u.created_at,
    u.last_sign_in_at,
    (select count(*) from public.armamentos a where a.usuario_id = u.id),
    (select count(*) from public.mapas m where m.usuario_id = u.id),
    (select count(*) from public.operacoes o where o.organizador_id = u.id),
    count(*) over ()
  from auth.users u
  left join public.perfis p on p.id = u.id
  where
    (v_busca is null
      or p.nome     ilike '%' || v_busca || '%'
      or p.nickname ilike '%' || v_busca || '%'
      or u.email    ilike '%' || v_busca || '%'
      or p.cidade   ilike '%' || v_busca || '%'
      or p.whatsapp like  '%' || regexp_replace(v_busca, '\D', '', 'g') || '%'
         and regexp_replace(v_busca, '\D', '', 'g') <> '')
    and (v_uf is null or p.uf = v_uf)
    and (
      p_situacao is null or p_situacao = ''
      or (p_situacao = 'completo'   and coalesce(p.perfil_completo, false))
      or (p_situacao = 'basico'     and coalesce(p.onboarding_ok, false) and not coalesce(p.perfil_completo, false))
      or (p_situacao = 'incompleto' and not coalesce(p.onboarding_ok, false))
    )
  order by u.created_at desc
  limit greatest(coalesce(p_limite, 200), 1);
end $$;

-- So usuario logado chama; anon e public nem enxergam a funcao.
revoke all on function public.admin_lista_usuarios(text, text, text, integer) from public, anon;
grant execute on function public.admin_lista_usuarios(text, text, text, integer) to authenticated;
