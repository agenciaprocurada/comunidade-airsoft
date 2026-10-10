-- ============================================================
-- Comunidade Airsoft — termo de consentimento assinado online
--
-- Fluxo: o dono cadastra um EVENTO em /termos-evento, o sistema gera um
-- link publico (/assinar/<codigo>) para o grupo de WhatsApp, e cada
-- participante preenche nome, e-mail, telefone, CPF e desenha a
-- assinatura. Padrao do GorillaOS (link com token + funcoes publicas).
--
-- SEGURANCA (CPF + assinatura sao dado pessoal):
--   * As duas tabelas tem RLS ligada e NENHUMA policy para `anon`.
--     O visitante nunca le nem escreve nas tabelas: so chama as duas
--     funcoes `security definer` do final (termo_publico, termo_assinar).
--   * Quem le/cria/edita/apaga e SO o dono, identificado pelo e-mail do
--     login Google no JWT (`e_dono_termos`).
--   * O texto assinado nao muda depois da primeira assinatura (trigger),
--     e cada assinatura guarda o hash SHA-256 do texto que foi aceito.
--
-- Aplicar no SQL Editor do Supabase. Pode rodar mais de uma vez.
-- ============================================================

-- ------------------------------------------------------------
-- Quem e o dono
-- ------------------------------------------------------------

create or replace function public.e_dono_termos()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(lower(auth.jwt() ->> 'email'), '') = 'agenciaprocurada@gmail.com';
$$;

revoke all on function public.e_dono_termos() from public;
grant execute on function public.e_dono_termos() to authenticated, anon;

-- ------------------------------------------------------------
-- CPF: confere os dois digitos verificadores
-- ------------------------------------------------------------

create or replace function public.cpf_valido(p_cpf text)
returns boolean
language plpgsql
immutable
set search_path = public
as $$
declare
  d text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  soma int;
  dv1 int;
  dv2 int;
  i int;
begin
  if length(d) <> 11 or d ~ '^(\d)\1{10}$' then
    return false;
  end if;

  soma := 0;
  for i in 1..9 loop
    soma := soma + substr(d, i, 1)::int * (11 - i);
  end loop;
  dv1 := (soma * 10) % 11;
  if dv1 = 10 then dv1 := 0; end if;

  soma := 0;
  for i in 1..10 loop
    soma := soma + substr(d, i, 1)::int * (12 - i);
  end loop;
  dv2 := (soma * 10) % 11;
  if dv2 = 10 then dv2 := 0; end if;

  return dv1 = substr(d, 10, 1)::int and dv2 = substr(d, 11, 1)::int;
end;
$$;

-- ------------------------------------------------------------
-- Eventos
-- ------------------------------------------------------------

create table if not exists public.termos_eventos (
  id           uuid primary key default gen_random_uuid(),
  -- Parte final do link. Aleatorio e sem sequencia: quem nao recebeu o
  -- link nao consegue adivinhar o de outro evento.
  codigo       text not null unique check (codigo ~ '^[a-z0-9]{8,16}$'),
  nome         text not null check (char_length(nome) between 3 and 140),
  data_evento  date,
  local_evento text check (char_length(local_evento) <= 200),
  organizador  text check (char_length(organizador) <= 140),
  texto        text not null check (char_length(texto) between 100 and 20000),
  -- SHA-256 do `texto`, preenchido pelo trigger abaixo.
  texto_hash   text not null default '',
  ativo        boolean not null default true,
  -- Depois desse instante o link para de aceitar assinatura.
  encerra_em   timestamptz,
  criado_por   uuid references auth.users (id) on delete set null,
  criado_em    timestamptz not null default now()
);

create table if not exists public.termos_assinaturas (
  id          uuid primary key default gen_random_uuid(),
  evento_id   uuid not null references public.termos_eventos (id) on delete cascade,
  nome        text not null check (char_length(nome) between 5 and 140),
  email       text not null check (
                char_length(email) <= 160 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
              ),
  -- So digitos, com DDD (10 ou 11) e opcionalmente 55 na frente.
  telefone    text not null check (telefone ~ '^[0-9]{10,13}$'),
  cpf         text not null check (cpf ~ '^[0-9]{11}$' and public.cpf_valido(cpf)),
  -- PNG em data URL, desenhado no canvas.
  assinatura  text not null check (
                assinatura like 'data:image/png;base64,%'
                and char_length(assinatura) between 1500 and 400000
              ),
  -- Hash do texto que a pessoa viu e aceitou.
  texto_hash  text not null,
  ip          text check (char_length(ip) <= 64),
  user_agent  text check (char_length(user_agent) <= 400),
  assinado_em timestamptz not null default now(),
  -- Cada CPF assina uma vez por evento.
  unique (evento_id, cpf)
);

-- Codigo secreto do comprovante: quem assinou recebe e baixa o PDF sem login.
alter table public.termos_assinaturas
  add column if not exists token text not null default replace(gen_random_uuid()::text, '-', '');
create unique index if not exists termos_assinaturas_token_idx
  on public.termos_assinaturas (token);

-- Dados que o termo pede alem dos basicos (data de nascimento e equipe).
alter table public.termos_assinaturas
  add column if not exists nascimento date,
  add column if not exists equipe text;
alter table public.termos_assinaturas drop constraint if exists termos_assinaturas_equipe_check;
alter table public.termos_assinaturas
  add constraint termos_assinaturas_equipe_check check (char_length(equipe) <= 80);
alter table public.termos_assinaturas drop constraint if exists termos_assinaturas_nascimento_check;
alter table public.termos_assinaturas
  add constraint termos_assinaturas_nascimento_check
  check (nascimento is null or (nascimento >= date '1900-01-01' and nascimento <= current_date));

create index if not exists termos_assinaturas_evento_idx
  on public.termos_assinaturas (evento_id, assinado_em desc);

-- Horario do evento (texto livre, ex.: "07h"). Fica fora da trava do trigger.
alter table public.termos_eventos
  add column if not exists horario text check (char_length(horario) <= 40);

-- ------------------------------------------------------------
-- Hash do texto + trava depois da primeira assinatura
-- ------------------------------------------------------------

create or replace function public.termos_eventos_antes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.texto_hash := encode(sha256(convert_to(new.texto, 'UTF8')), 'hex');

  if tg_op = 'UPDATE' and exists (
    select 1 from public.termos_assinaturas where evento_id = old.id
  ) then
    if new.texto is distinct from old.texto
       or new.nome is distinct from old.nome
       or new.data_evento is distinct from old.data_evento
       or new.local_evento is distinct from old.local_evento
       or new.organizador is distinct from old.organizador
       or new.codigo is distinct from old.codigo then
      raise exception 'termo ja assinado: nao e possivel alterar o texto nem os dados do evento';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists termos_eventos_antes on public.termos_eventos;
create trigger termos_eventos_antes
  before insert or update on public.termos_eventos
  for each row execute function public.termos_eventos_antes();

-- Uma assinatura registrada nao se edita (so se apaga, pelo dono).
create or replace function public.termos_assinaturas_imutavel()
returns trigger
language plpgsql
as $$
begin
  raise exception 'assinatura registrada nao pode ser alterada';
end;
$$;

drop trigger if exists termos_assinaturas_imutavel on public.termos_assinaturas;
create trigger termos_assinaturas_imutavel
  before update on public.termos_assinaturas
  for each row execute function public.termos_assinaturas_imutavel();

-- ------------------------------------------------------------
-- RLS: so o dono
-- ------------------------------------------------------------

alter table public.termos_eventos enable row level security;
alter table public.termos_assinaturas enable row level security;

revoke all on public.termos_eventos from anon, authenticated;
revoke all on public.termos_assinaturas from anon, authenticated;
grant select, insert, update, delete on public.termos_eventos to authenticated;
grant select, delete on public.termos_assinaturas to authenticated;

drop policy if exists termos_eventos_dono on public.termos_eventos;
create policy termos_eventos_dono on public.termos_eventos
  for all to authenticated
  using (public.e_dono_termos())
  with check (public.e_dono_termos());

drop policy if exists termos_assinaturas_dono_le on public.termos_assinaturas;
create policy termos_assinaturas_dono_le on public.termos_assinaturas
  for select to authenticated using (public.e_dono_termos());

drop policy if exists termos_assinaturas_dono_apaga on public.termos_assinaturas;
create policy termos_assinaturas_dono_apaga on public.termos_assinaturas
  for delete to authenticated using (public.e_dono_termos());

-- ------------------------------------------------------------
-- Funcoes PUBLICAS (as unicas coisas que o visitante alcanca)
-- ------------------------------------------------------------

-- Dados do evento para montar a pagina de assinatura.
create or replace function public.termo_publico(p_codigo text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  e public.termos_eventos%rowtype;
begin
  select * into e from public.termos_eventos where codigo = lower(p_codigo);
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'nome', e.nome,
    'data_evento', e.data_evento,
    'horario', e.horario,
    'local_evento', e.local_evento,
    'organizador', e.organizador,
    'texto', e.texto,
    'aberto', e.ativo and (e.encerra_em is null or e.encerra_em > now())
  );
end;
$$;

-- Registra a assinatura.
-- Devolve {"resultado": "ok"|"ja_assinou"|"encerrado"|"invalido", "token": "..."}
-- (o token so vem quando resultado = ok).
drop function if exists public.termo_assinar(text, text, text, text, text, text, text, text);
-- (a versao com nascimento e equipe tem outra assinatura e e criada abaixo)

create or replace function public.termo_assinar(
  p_codigo     text,
  p_nome       text,
  p_email      text,
  p_telefone   text,
  p_cpf        text,
  p_nascimento date,
  p_equipe     text,
  p_assinatura text,
  p_ip         text,
  p_user_agent text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.termos_eventos%rowtype;
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_tel text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
  v_token text;
begin
  select * into e from public.termos_eventos where codigo = lower(p_codigo);
  if not found then
    return jsonb_build_object('resultado', 'invalido');
  end if;

  if not (e.ativo and (e.encerra_em is null or e.encerra_em > now())) then
    return jsonb_build_object('resultado', 'encerrado');
  end if;

  if not public.cpf_valido(v_cpf) then
    return jsonb_build_object('resultado', 'invalido');
  end if;

  if exists (
    select 1 from public.termos_assinaturas where evento_id = e.id and cpf = v_cpf
  ) then
    return jsonb_build_object('resultado', 'ja_assinou');
  end if;

  begin
    insert into public.termos_assinaturas
      (evento_id, nome, email, telefone, cpf, nascimento, equipe, assinatura, texto_hash, ip, user_agent)
    values
      (e.id, btrim(p_nome), btrim(lower(p_email)), v_tel, v_cpf, p_nascimento,
       nullif(btrim(p_equipe), ''), p_assinatura,
       e.texto_hash, left(p_ip, 64), left(p_user_agent, 400))
    returning token into v_token;
  exception
    when check_violation then
      return jsonb_build_object('resultado', 'invalido');
    when unique_violation then
      return jsonb_build_object('resultado', 'ja_assinou');
  end;

  return jsonb_build_object('resultado', 'ok', 'token', v_token);
end;
$$;

-- Comprovante: o termo assinado, liberado pelo codigo secreto (token).
create or replace function public.termo_assinado(p_codigo text, p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'evento', jsonb_build_object(
      'nome', e.nome,
      'data_evento', e.data_evento,
      'horario', e.horario,
      'local_evento', e.local_evento,
      'organizador', e.organizador,
      'texto', e.texto,
      'texto_hash', e.texto_hash
    ),
    'assinatura', jsonb_build_object(
      'nome', a.nome,
      'email', a.email,
      'telefone', a.telefone,
      'cpf', a.cpf,
      'nascimento', a.nascimento,
      'equipe', a.equipe,
      'assinatura', a.assinatura,
      'texto_hash', a.texto_hash,
      'ip', a.ip,
      'user_agent', a.user_agent,
      'assinado_em', a.assinado_em
    )
  )
  from public.termos_assinaturas a
  join public.termos_eventos e on e.id = a.evento_id
  where e.codigo = lower(p_codigo) and a.token = p_token;
$$;

revoke all on function public.termo_publico(text) from public;
revoke all on function public.termo_assinar(text, text, text, text, text, date, text, text, text, text) from public;
revoke all on function public.termo_assinado(text, text) from public;
grant execute on function public.termo_publico(text) to anon, authenticated;
grant execute on function public.termo_assinar(text, text, text, text, text, date, text, text, text, text) to anon, authenticated;
grant execute on function public.termo_assinado(text, text) to anon, authenticated;
