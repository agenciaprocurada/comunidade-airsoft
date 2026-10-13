-- ============================================================
-- Comunidade Airsoft — gestao da lista de inscritos do evento
--
-- Controle de: quem pagou, quem assinou o termo, adicionar e remover
-- inscritos. Acesso por um LINK DE GESTAO + SENHA (PIN), sem conta:
--
--   * O dono (login Google em /termos-evento) liga a gestao e define a
--     senha; o sistema gera o link /gestao/<token>.
--   * Quem tem link + senha entra e edita. A senha fica guardada so como
--     hash (bcrypt, pgcrypto). 5 senhas erradas = bloqueio de 15 minutos.
--   * A entrada devolve uma SESSAO (12 h). Do banco, so o hash dela e guardado.
--   * Nenhuma tabela tem policy para `anon`: o visitante so alcanca as
--     funcoes `gestao_*` abaixo, que exigem a sessao.
--   * A gestao mostra apenas nome e equipe das assinaturas. CPF, telefone,
--     e-mail e a imagem da assinatura nunca saem por ela.
--
-- Aplicar DEPOIS de schema-termos-evento.sql. Pode rodar mais de uma vez.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------
-- Evento: link e senha da gestao, numero de vagas
-- ------------------------------------------------------------

alter table public.termos_eventos
  add column if not exists gestao_token text,
  add column if not exists gestao_pin_hash text,
  add column if not exists vagas integer;

alter table public.termos_eventos drop constraint if exists termos_eventos_gestao_token_check;
alter table public.termos_eventos
  add constraint termos_eventos_gestao_token_check check (gestao_token is null or gestao_token ~ '^[0-9a-f]{32}$');
alter table public.termos_eventos drop constraint if exists termos_eventos_vagas_check;
alter table public.termos_eventos
  add constraint termos_eventos_vagas_check check (vagas is null or vagas between 1 and 5000);
create unique index if not exists termos_eventos_gestao_token_idx
  on public.termos_eventos (gestao_token) where gestao_token is not null;

-- ------------------------------------------------------------
-- Inscritos
-- ------------------------------------------------------------

create table if not exists public.termos_inscritos (
  id            uuid primary key default gen_random_uuid(),
  evento_id     uuid not null references public.termos_eventos (id) on delete cascade,
  lado          text not null check (lado in ('PMC/VIETCONG', 'MILITAR', 'RESERVA')),
  ordem         integer not null default 0,
  nome          text not null check (char_length(btrim(nome)) between 1 and 80),
  equipe        text check (char_length(equipe) <= 60),
  pago          boolean not null default false,
  obs           text check (char_length(obs) <= 200),
  -- A assinatura do termo que pertence a esta pessoa (ligada a mao).
  assinatura_id uuid references public.termos_assinaturas (id) on delete set null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists termos_inscritos_evento_idx on public.termos_inscritos (evento_id, lado, ordem);
-- Uma assinatura so pode estar ligada a um inscrito.
create unique index if not exists termos_inscritos_assinatura_idx
  on public.termos_inscritos (assinatura_id) where assinatura_id is not null;

-- Sessoes e tentativas: so as funcoes tocam (RLS ligada, sem policy).
create table if not exists public.termos_gestao_sessoes (
  token_hash text primary key,
  evento_id  uuid not null references public.termos_eventos (id) on delete cascade,
  expira_em  timestamptz not null,
  criado_em  timestamptz not null default now()
);
create table if not exists public.termos_gestao_tentativas (
  evento_id     uuid primary key references public.termos_eventos (id) on delete cascade,
  falhas        integer not null default 0,
  bloqueado_ate timestamptz
);

alter table public.termos_inscritos enable row level security;
alter table public.termos_gestao_sessoes enable row level security;
alter table public.termos_gestao_tentativas enable row level security;

revoke all on public.termos_inscritos from anon, authenticated;
revoke all on public.termos_gestao_sessoes from anon, authenticated;
revoke all on public.termos_gestao_tentativas from anon, authenticated;
grant select, insert, update, delete on public.termos_inscritos to authenticated;

drop policy if exists termos_inscritos_dono on public.termos_inscritos;
create policy termos_inscritos_dono on public.termos_inscritos
  for all to authenticated
  using (public.e_dono_termos())
  with check (public.e_dono_termos());

create or replace function public.termos_inscritos_toca()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;
drop trigger if exists termos_inscritos_toca on public.termos_inscritos;
create trigger termos_inscritos_toca before update on public.termos_inscritos
  for each row execute function public.termos_inscritos_toca();

-- ------------------------------------------------------------
-- Dono: liga a gestao (gera o link se nao existir) e define/troca a senha
-- ------------------------------------------------------------

create or replace function public.gestao_configurar(p_evento uuid, p_pin text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
begin
  if not public.e_dono_termos() then
    raise exception 'sem permissao';
  end if;
  if char_length(coalesce(p_pin, '')) < 6 or char_length(p_pin) > 40 then
    raise exception 'a senha precisa ter de 6 a 40 caracteres';
  end if;

  select gestao_token into v_token from public.termos_eventos where id = p_evento;
  if not found then
    raise exception 'evento nao encontrado';
  end if;
  if v_token is null then
    v_token := replace(gen_random_uuid()::text, '-', '');
  end if;

  update public.termos_eventos
     set gestao_token = v_token, gestao_pin_hash = crypt(p_pin, gen_salt('bf', 10))
   where id = p_evento;

  -- senha nova = todo mundo precisa entrar de novo
  delete from public.termos_gestao_sessoes where evento_id = p_evento;
  delete from public.termos_gestao_tentativas where evento_id = p_evento;
  return v_token;
end;
$$;

create or replace function public.gestao_desligar(p_evento uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.e_dono_termos() then
    raise exception 'sem permissao';
  end if;
  update public.termos_eventos set gestao_token = null, gestao_pin_hash = null where id = p_evento;
  delete from public.termos_gestao_sessoes where evento_id = p_evento;
  delete from public.termos_gestao_tentativas where evento_id = p_evento;
end;
$$;

-- ------------------------------------------------------------
-- Entrada com link + senha. Devolve {"ok":true,"sessao":"..."} ou
-- {"ok":false,"motivo":"invalido"|"bloqueado","espera_s":N,"restantes":N}
-- ------------------------------------------------------------

create or replace function public.gestao_entrar(p_token text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  e record;
  t record;
  v_sessao text;
  v_falhas integer;
begin
  select id, gestao_pin_hash into e
    from public.termos_eventos
   where gestao_token = lower(coalesce(p_token, '')) and gestao_pin_hash is not null;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'invalido');
  end if;

  select * into t from public.termos_gestao_tentativas where evento_id = e.id;
  if found and t.bloqueado_ate is not null then
    if t.bloqueado_ate > now() then
      return jsonb_build_object('ok', false, 'motivo', 'bloqueado',
        'espera_s', ceil(extract(epoch from (t.bloqueado_ate - now())))::int);
    end if;
    update public.termos_gestao_tentativas set falhas = 0, bloqueado_ate = null where evento_id = e.id;
  end if;

  if crypt(coalesce(p_pin, ''), e.gestao_pin_hash) = e.gestao_pin_hash then
    delete from public.termos_gestao_tentativas where evento_id = e.id;
    delete from public.termos_gestao_sessoes where expira_em < now();
    v_sessao := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    insert into public.termos_gestao_sessoes (token_hash, evento_id, expira_em)
    values (encode(sha256(convert_to(v_sessao, 'UTF8')), 'hex'), e.id, now() + interval '12 hours');
    return jsonb_build_object('ok', true, 'sessao', v_sessao);
  end if;

  insert into public.termos_gestao_tentativas (evento_id, falhas) values (e.id, 1)
  on conflict (evento_id) do update set falhas = public.termos_gestao_tentativas.falhas + 1
  returning falhas into v_falhas;

  if v_falhas >= 5 then
    update public.termos_gestao_tentativas set bloqueado_ate = now() + interval '15 minutes' where evento_id = e.id;
    return jsonb_build_object('ok', false, 'motivo', 'bloqueado', 'espera_s', 900);
  end if;
  return jsonb_build_object('ok', false, 'motivo', 'invalido', 'restantes', 5 - v_falhas);
end;
$$;

-- Evento da sessao (uso interno das funcoes abaixo; nao e chamavel de fora)
create or replace function public.gestao_evento(p_sessao text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select evento_id
    from public.termos_gestao_sessoes
   where token_hash = encode(sha256(convert_to(coalesce(p_sessao, ''), 'UTF8')), 'hex')
     and expira_em > now();
$$;

-- ------------------------------------------------------------
-- Leitura: evento, inscritos (com a assinatura ligada) e assinaturas livres
-- ------------------------------------------------------------

create or replace function public.gestao_dados(p_sessao text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ev uuid := public.gestao_evento(p_sessao);
begin
  if v_ev is null then
    return null;
  end if;

  return jsonb_build_object(
    'evento', (
      select jsonb_build_object('nome', nome, 'data_evento', data_evento, 'horario', horario,
                                'local_evento', local_evento, 'vagas', vagas)
        from public.termos_eventos where id = v_ev
    ),
    'inscritos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'lado', i.lado, 'ordem', i.ordem, 'nome', i.nome, 'equipe', i.equipe,
        'pago', i.pago, 'obs', i.obs, 'assinatura_id', i.assinatura_id,
        'assinou_nome', a.nome, 'assinou_equipe', a.equipe, 'assinou_em', a.assinado_em
      ) order by case i.lado when 'PMC/VIETCONG' then 1 when 'MILITAR' then 2 else 3 end, i.ordem, i.criado_em)
      from public.termos_inscritos i
      left join public.termos_assinaturas a on a.id = i.assinatura_id
      where i.evento_id = v_ev
    ), '[]'::jsonb),
    'livres', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'nome', a.nome, 'equipe', a.equipe, 'assinado_em', a.assinado_em)
                       order by lower(a.nome))
      from public.termos_assinaturas a
      where a.evento_id = v_ev
        and not exists (select 1 from public.termos_inscritos i where i.assinatura_id = a.id)
    ), '[]'::jsonb)
  );
end;
$$;

-- ------------------------------------------------------------
-- Escrita (todas exigem a sessao; devolvem {"ok":true|false,"erro":"..."})
-- ------------------------------------------------------------

create or replace function public.gestao_inscrito_salvar(
  p_sessao text, p_id uuid, p_nome text, p_equipe text, p_lado text, p_pago boolean, p_obs text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ev uuid := public.gestao_evento(p_sessao);
  v_id uuid;
begin
  if v_ev is null then return jsonb_build_object('ok', false, 'erro', 'sessao'); end if;
  if p_lado not in ('PMC/VIETCONG', 'MILITAR', 'RESERVA') then
    return jsonb_build_object('ok', false, 'erro', 'lado');
  end if;
  if char_length(btrim(coalesce(p_nome, ''))) not between 1 and 80 then
    return jsonb_build_object('ok', false, 'erro', 'nome');
  end if;

  if p_id is null then
    insert into public.termos_inscritos (evento_id, lado, ordem, nome, equipe, pago, obs)
    values (
      v_ev, p_lado,
      coalesce((select max(ordem) from public.termos_inscritos where evento_id = v_ev and lado = p_lado), 0) + 1,
      btrim(p_nome), nullif(btrim(coalesce(p_equipe, '')), ''), coalesce(p_pago, false), nullif(btrim(coalesce(p_obs, '')), '')
    ) returning id into v_id;
  else
    update public.termos_inscritos
       set nome = btrim(p_nome), equipe = nullif(btrim(coalesce(p_equipe, '')), ''),
           lado = p_lado, pago = coalesce(p_pago, pago), obs = nullif(btrim(coalesce(p_obs, '')), '')
     where id = p_id and evento_id = v_ev
     returning id into v_id;
    if v_id is null then return jsonb_build_object('ok', false, 'erro', 'nao_encontrado'); end if;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
exception when check_violation then
  return jsonb_build_object('ok', false, 'erro', 'dados');
end;
$$;

create or replace function public.gestao_pago(p_sessao text, p_id uuid, p_pago boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ev uuid := public.gestao_evento(p_sessao);
  v_id uuid;
begin
  if v_ev is null then return jsonb_build_object('ok', false, 'erro', 'sessao'); end if;
  update public.termos_inscritos set pago = coalesce(p_pago, false)
   where id = p_id and evento_id = v_ev returning id into v_id;
  if v_id is null then return jsonb_build_object('ok', false, 'erro', 'nao_encontrado'); end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- p_assinatura_id = null desfaz a ligacao
create or replace function public.gestao_vincular(p_sessao text, p_id uuid, p_assinatura_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ev uuid := public.gestao_evento(p_sessao);
  v_id uuid;
begin
  if v_ev is null then return jsonb_build_object('ok', false, 'erro', 'sessao'); end if;
  if p_assinatura_id is not null and not exists (
    select 1 from public.termos_assinaturas where id = p_assinatura_id and evento_id = v_ev
  ) then
    return jsonb_build_object('ok', false, 'erro', 'assinatura');
  end if;
  update public.termos_inscritos set assinatura_id = p_assinatura_id
   where id = p_id and evento_id = v_ev returning id into v_id;
  if v_id is null then return jsonb_build_object('ok', false, 'erro', 'nao_encontrado'); end if;
  return jsonb_build_object('ok', true);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'erro', 'ja_ligada');
end;
$$;

create or replace function public.gestao_remover(p_sessao text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ev uuid := public.gestao_evento(p_sessao);
  v_id uuid;
begin
  if v_ev is null then return jsonb_build_object('ok', false, 'erro', 'sessao'); end if;
  delete from public.termos_inscritos where id = p_id and evento_id = v_ev returning id into v_id;
  if v_id is null then return jsonb_build_object('ok', false, 'erro', 'nao_encontrado'); end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- ------------------------------------------------------------
-- Permissoes: gestao_evento fica interna; o resto o visitante chama
-- ------------------------------------------------------------

revoke all on function public.gestao_evento(text) from public, anon, authenticated;
revoke all on function public.gestao_configurar(uuid, text) from public;
revoke all on function public.gestao_desligar(uuid) from public;
revoke all on function public.gestao_entrar(text, text) from public;
revoke all on function public.gestao_dados(text) from public;
revoke all on function public.gestao_inscrito_salvar(text, uuid, text, text, text, boolean, text) from public;
revoke all on function public.gestao_pago(text, uuid, boolean) from public;
revoke all on function public.gestao_vincular(text, uuid, uuid) from public;
revoke all on function public.gestao_remover(text, uuid) from public;

grant execute on function public.gestao_configurar(uuid, text) to authenticated;
grant execute on function public.gestao_desligar(uuid) to authenticated;
grant execute on function public.gestao_entrar(text, text) to anon, authenticated;
grant execute on function public.gestao_dados(text) to anon, authenticated;
grant execute on function public.gestao_inscrito_salvar(text, uuid, text, text, text, boolean, text) to anon, authenticated;
grant execute on function public.gestao_pago(text, uuid, boolean) to anon, authenticated;
grant execute on function public.gestao_vincular(text, uuid, uuid) to anon, authenticated;
grant execute on function public.gestao_remover(text, uuid) to anon, authenticated;
