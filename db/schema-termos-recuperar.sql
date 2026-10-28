-- ============================================================
-- Comunidade Airsoft — recuperar a copia do termo ja assinado
--
-- Caso: a pessoa ja assinou, perdeu a pagina de conclusao e tenta assinar de
-- novo. Em vez de so barrar, a pagina oferece baixar a copia — mas SO se
-- CPF + e-mail + data de nascimento baterem com o que ficou registrado.
--
--   * Sem os tres batendo, nada e entregue (nem o token do PDF).
--   * 5 tentativas erradas para o mesmo CPF no evento = bloqueio de 15 minutos.
--   * Quem ainda nao assinou recebe apenas {"assinou": false}.
--
-- Aplicar DEPOIS de schema-termos-evento.sql. Pode rodar mais de uma vez.
-- ============================================================

create table if not exists public.termos_recuperar_tentativas (
  evento_id     uuid not null references public.termos_eventos (id) on delete cascade,
  cpf           text not null,
  falhas        integer not null default 0,
  bloqueado_ate timestamptz,
  primary key (evento_id, cpf)
);

alter table public.termos_recuperar_tentativas enable row level security;
revoke all on public.termos_recuperar_tentativas from anon, authenticated;

create or replace function public.termo_recuperar(
  p_codigo     text,
  p_cpf        text,
  p_email      text,
  p_nascimento date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.termos_eventos%rowtype;
  a public.termos_assinaturas%rowtype;
  t public.termos_recuperar_tentativas%rowtype;
  v_cpf text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_falhas integer;
begin
  select * into e from public.termos_eventos where codigo = lower(coalesce(p_codigo, ''));
  if not found then
    return jsonb_build_object('assinou', false);
  end if;

  select * into a from public.termos_assinaturas where evento_id = e.id and cpf = v_cpf;
  if not found then
    return jsonb_build_object('assinou', false);
  end if;

  select * into t from public.termos_recuperar_tentativas where evento_id = e.id and cpf = v_cpf;
  if found and t.bloqueado_ate is not null then
    if t.bloqueado_ate > now() then
      return jsonb_build_object('assinou', true, 'bloqueado', true,
        'espera_s', ceil(extract(epoch from (t.bloqueado_ate - now())))::int);
    end if;
    update public.termos_recuperar_tentativas set falhas = 0, bloqueado_ate = null
     where evento_id = e.id and cpf = v_cpf;
  end if;

  if lower(btrim(a.email)) = lower(btrim(coalesce(p_email, '')))
     and (a.nascimento is null or a.nascimento = p_nascimento) then
    delete from public.termos_recuperar_tentativas where evento_id = e.id and cpf = v_cpf;
    return jsonb_build_object('assinou', true, 'token', a.token);
  end if;

  insert into public.termos_recuperar_tentativas (evento_id, cpf, falhas) values (e.id, v_cpf, 1)
  on conflict (evento_id, cpf) do update
    set falhas = public.termos_recuperar_tentativas.falhas + 1
  returning falhas into v_falhas;

  if v_falhas >= 5 then
    update public.termos_recuperar_tentativas set bloqueado_ate = now() + interval '15 minutes'
     where evento_id = e.id and cpf = v_cpf;
    return jsonb_build_object('assinou', true, 'bloqueado', true, 'espera_s', 900);
  end if;
  return jsonb_build_object('assinou', true, 'confere', false, 'restantes', 5 - v_falhas);
end;
$$;

revoke all on function public.termo_recuperar(text, text, text, date) from public;
grant execute on function public.termo_recuperar(text, text, text, date) to anon, authenticated;
