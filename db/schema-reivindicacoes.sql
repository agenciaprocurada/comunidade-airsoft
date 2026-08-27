-- ============================================================
-- Comunidade Airsoft — reivindicacao de campo e loja
--
-- Doc de projeto §6.3: toda ficha entra "nao verificada" com o botao
-- "e seu? reivindique esta pagina". Cada pedido e um lead da Fase 2 —
-- por isso o registro guarda o vinculo declarado e o telefone.
--
-- Regras que ficam no BANCO, nao na tela:
--  - so perfil completo abre pedido;
--  - ninguem abre pedido ja aprovado (status inicial e travado);
--  - uma entidade tem no maximo UM dono aprovado;
--  - a mesma pessoa nao abre dois pedidos abertos para a mesma ficha;
--  - aprovar ou recusar exige registrar quem analisou e quando.
--
-- Aplicar DEPOIS de db/schema-usuarios.sql.
-- ============================================================

-- ------------------------------------------------------------
-- Tipos
-- ------------------------------------------------------------

do $$ begin
  create type public.tipo_entidade as enum ('campo','loja');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.status_reivindicacao as enum
    ('pendente','em_analise','aprovada','recusada','cancelada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.vinculo_reivindicante as enum
    ('dono','socio','gerente','autorizado');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- Administradores
--
-- Tabela separada, e nao uma coluna em `perfis`, por um motivo
-- concreto: a policy de update de `perfis` deixa a pessoa editar a
-- propria linha. Um booleano `admin` ali seria auto-promocao. Aqui
-- nao existe policy de insert nenhuma — so o service_role ou SQL
-- direto escreve.
-- ------------------------------------------------------------

create table if not exists public.administradores (
  id         uuid primary key references auth.users(id) on delete cascade,
  criado_em  timestamptz not null default now()
);

alter table public.administradores enable row level security;

drop policy if exists administradores_le_o_proprio on public.administradores;
create policy administradores_le_o_proprio on public.administradores
  for select to authenticated using (auth.uid() = id);

-- `security definer` para a policy conseguir consultar a tabela sem
-- esbarrar na RLS dela mesma (recursao).
create or replace function public.e_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.administradores a where a.id = auth.uid());
$$;

grant execute on function public.e_admin() to authenticated;

-- ------------------------------------------------------------
-- Reivindicacoes
-- ------------------------------------------------------------

create table if not exists public.reivindicacoes (
  id             uuid primary key default gen_random_uuid(),
  usuario_id     uuid not null references auth.users(id) on delete cascade,

  tipo_entidade  public.tipo_entidade not null,
  entidade_id    text not null,
  -- Nome congelado no momento do pedido. Se a ficha for renomeada
  -- depois, o historico continua legivel.
  entidade_nome  text not null,

  vinculo        public.vinculo_reivindicante not null,
  telefone       text,
  mensagem       text not null,
  -- Links de comprovacao (post oficial, pagina do site, documento em
  -- nuvem). Sao LINKS, nao arquivos: guardar documento criaria dever
  -- de guarda e descarte sob LGPD que o projeto ainda nao comporta.
  provas         text[] not null default '{}',

  status         public.status_reivindicacao not null default 'pendente',
  motivo_analise text,
  analisado_por  uuid references auth.users(id),
  analisado_em   timestamptz,

  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),

  constraint reivindicacoes_mensagem_minima
    check (char_length(btrim(mensagem)) >= 20),

  -- Decisao sem autor e sem data nao serve para resolver disputa.
  constraint reivindicacoes_decisao_tem_autor
    check (status not in ('aprovada','recusada')
           or (analisado_por is not null and analisado_em is not null)),

  -- Recusa sem motivo escrito nao pode acontecer: a pessoa tem
  -- direito de saber por que, e voce vai precisar do registro.
  constraint reivindicacoes_recusa_tem_motivo
    check (status <> 'recusada'
           or char_length(btrim(coalesce(motivo_analise,''))) >= 5)
);

-- UMA entidade, UM dono aprovado. Garantido pelo banco: nao depende
-- de o moderador lembrar de conferir.
create unique index if not exists reivindicacoes_uma_aprovada_por_entidade
  on public.reivindicacoes (tipo_entidade, entidade_id)
  where status = 'aprovada';

-- A mesma pessoa nao empilha pedidos abertos para a mesma ficha.
create unique index if not exists reivindicacoes_um_pedido_aberto
  on public.reivindicacoes (usuario_id, tipo_entidade, entidade_id)
  where status in ('pendente','em_analise');

create index if not exists reivindicacoes_fila_idx
  on public.reivindicacoes (status, criado_em);

drop trigger if exists reivindicacoes_atualizado_em on public.reivindicacoes;
create trigger reivindicacoes_atualizado_em before update on public.reivindicacoes
  for each row execute function public.tocar_atualizado_em();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.reivindicacoes enable row level security;

drop policy if exists reivindicacoes_le on public.reivindicacoes;
create policy reivindicacoes_le on public.reivindicacoes
  for select to authenticated
  using (auth.uid() = usuario_id or public.e_admin());

-- O `status = 'pendente'` no CHECK e o que impede alguem de inserir
-- um pedido ja aprovado direto pela API.
drop policy if exists reivindicacoes_cria on public.reivindicacoes;
create policy reivindicacoes_cria on public.reivindicacoes
  for insert to authenticated
  with check (
    auth.uid() = usuario_id
    and status = 'pendente'
    and analisado_por is null
    and analisado_em is null
    and exists (
      select 1 from public.perfis p
      where p.id = auth.uid() and p.perfil_completo
    )
  );

-- So administrador muda status. O solicitante nao edita nem cancela
-- pelo site nesta versao.
drop policy if exists reivindicacoes_analisa on public.reivindicacoes;
create policy reivindicacoes_analisa on public.reivindicacoes
  for update to authenticated
  using (public.e_admin())
  with check (public.e_admin());

-- ------------------------------------------------------------
-- Quem e dono de que — derivado, nao duplicado
-- ------------------------------------------------------------

create or replace view public.donos_entidade
with (security_invoker = true) as
select usuario_id, tipo_entidade, entidade_id, analisado_em as dono_desde
from public.reivindicacoes
where status = 'aprovada';

grant select on public.donos_entidade to authenticated;

-- ------------------------------------------------------------
-- Semente de administrador
--
-- Roda so para contas que ja existem em auth.users. Se o e-mail ainda
-- nao entrou no site, nada acontece — rode o arquivo de novo depois
-- do primeiro login.
-- ------------------------------------------------------------

insert into public.administradores (id)
select u.id from auth.users u
where lower(u.email) in (
  'agenciaprocurada@gmail.com',
  'vinicius.kolling@gmail.com'
)
on conflict (id) do nothing;
