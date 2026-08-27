-- ============================================================
-- Comunidade Airsoft — replicas do jogador
--
-- Base da segmentacao da Fase 2 (doc §8.2): o consumivel de quem tem
-- AEG e bateria; de quem tem GBB e gas; de quem tem HPA e ar. Sem
-- isso, "disparo segmentado" vira disparo para todo mundo.
--
-- Decisao central: MARCA e lista fechada, MODELO e texto livre.
--   - marca fechada porque e o eixo de segmentacao: "G&G", "g&g" e
--     "GG" em texto livre viram tres segmentos, ou seja, nenhum;
--   - modelo livre porque sao centenas por marca, com lancamento todo
--     mes. Catalogo de modelo vira divida eterna e trava o cadastro
--     de quem tem uma replica que ainda nao esta la.
--
-- Quem nao acha a marca escreve em `marca_outra`. Essa coluna e a
-- fila de curadoria: o que aparecer muito vira marca oficial.
--
-- Aplicar DEPOIS de db/schema-usuarios.sql.
-- ============================================================

-- ------------------------------------------------------------
-- Tipos
-- ------------------------------------------------------------

do $$ begin
  create type public.acionamento as enum ('aeg','aep','gbb','gbbr','hpa','mola','co2');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.categoria_replica as enum
    ('rifle','smg','pistola','sniper','dmr','shotgun','metralhadora','outra');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- Marcas — lista curada
--
-- A semente sai das marcas ja coletadas nas 20 lojas do diretorio,
-- filtrada para FABRICANTE DE REPLICA. Ficaram de fora as marcas de
-- otica e acessorio (Magpul, Holosun, Vector Optics, Mechanix) e as
-- de carabina de pressao (Gamo, Hatsan, Crosman, Artemis), que sao
-- tiro esportivo e nao airsoft.
-- ------------------------------------------------------------

create table if not exists public.marcas_replica (
  id         text primary key,
  nome       text not null,
  -- `ordem` 1 = comum no Brasil, aparece no topo do seletor.
  ordem      smallint not null default 5,
  ativa      boolean not null default true,
  criado_em  timestamptz not null default now()
);

create index if not exists marcas_replica_ordem_idx
  on public.marcas_replica (ordem, nome);

insert into public.marcas_replica (id, nome, ordem) values
  ('cyma','CYMA',1),
  ('rossi','Rossi',1),
  ('qgk','QGK',1),
  ('gg','G&G',1),
  ('specna-arms','Specna Arms',1),
  ('double-eagle','Double Eagle',1),
  ('well','Well',1),
  ('invictus','Invictus',1),
  ('vfc','VFC (Vega Force)',1),
  ('tokyo-marui','Tokyo Marui',1),
  ('we','WE Tech',1),
  ('umarex','Umarex',1),
  ('ares','ARES',1),
  ('ics','ICS',1),
  ('classic-army','Classic Army',1),
  ('src','SRC',1),
  ('action-army','Action Army',5),
  ('ak','A&K',5),
  ('aps','APS',5),
  ('armorer-works','Armorer Works',5),
  ('army-armament','Army Armament',5),
  ('asg','ASG',5),
  ('belica','Bélica',5),
  ('bolt','BOLT Airsoft',5),
  ('cybergun','Cybergun',5),
  ('de-armory','D.E. Armory',5),
  ('ec','E&C',5),
  ('emg','EMG',5),
  ('evo-tactical','Evo Tactical',5),
  ('forhonor','Forhonor',5),
  ('geg','GEG',5),
  ('ghk','GHK',5),
  ('golden-eagle','Golden Eagle',5),
  ('jg','JG (Jing Gong)',5),
  ('kj-works','KJ Works',5),
  ('king-arms','King Arms',5),
  ('krytac','Krytac',5),
  ('kwa','KWA',5),
  ('kwc','KWC',5),
  ('lancer-tactical','Lancer Tactical',5),
  ('lct','LCT',5),
  ('neptune','Neptune',5),
  ('novritsch','Novritsch',5),
  ('nuprol','Nuprol',5),
  ('polarstar','PolarStar',5),
  ('poseidon','Poseidon',5),
  ('raven','Raven',5),
  ('silverback','Silverback',5),
  ('taikoon','Taikoon',5),
  ('tippmann','Tippmann',5),
  ('vigor','Vigor',5),
  ('wingun','Wingun',5),
  ('wolverine','Wolverine',5)
on conflict (id) do update set nome = excluded.nome, ordem = excluded.ordem;

alter table public.marcas_replica enable row level security;

-- Lista publica: o seletor precisa dela, e nao ha nada de privado.
drop policy if exists marcas_leitura_publica on public.marcas_replica;
create policy marcas_leitura_publica on public.marcas_replica
  for select to anon, authenticated using (ativa);

-- ------------------------------------------------------------
-- Replicas do jogador
-- ------------------------------------------------------------

create table if not exists public.armamentos (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references auth.users(id) on delete cascade,

  -- Um dos dois, nunca os dois: ou a marca e da lista, ou e texto
  -- livre esperando curadoria.
  marca_id     text references public.marcas_replica(id),
  marca_outra  text,

  modelo       text not null,
  acionamento  public.acionamento not null,
  categoria    public.categoria_replica not null,

  -- A que ele mais usa. Sinal forte de segmentacao: quem tem sniper
  -- como principal recebe recomendacao diferente de quem tem SMG.
  principal    boolean not null default false,

  observacoes  text,

  criado_em    timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint armamentos_uma_marca
    check (num_nonnulls(marca_id, marca_outra) = 1),
  constraint armamentos_marca_outra_tamanho
    check (marca_outra is null
           or char_length(btrim(marca_outra)) between 2 and 60),
  constraint armamentos_modelo_tamanho
    check (char_length(btrim(modelo)) between 1 and 80),
  constraint armamentos_observacoes_tamanho
    check (observacoes is null or char_length(observacoes) <= 300)
);

create index if not exists armamentos_usuario_idx on public.armamentos (usuario_id);
create index if not exists armamentos_marca_idx   on public.armamentos (marca_id);
-- Para a curadoria: o que a galera escreveu que ainda nao e marca.
create index if not exists armamentos_marca_outra_idx
  on public.armamentos (lower(marca_outra)) where marca_outra is not null;

-- Uma principal por pessoa, garantido pelo banco.
create unique index if not exists armamentos_uma_principal
  on public.armamentos (usuario_id) where principal;

drop trigger if exists armamentos_atualizado_em on public.armamentos;
create trigger armamentos_atualizado_em before update on public.armamentos
  for each row execute function public.tocar_atualizado_em();

/**
 * Marcar uma como principal desmarca a anterior sozinho.
 *
 * Precisa ser BEFORE: o indice unico e conferido ao fim da instrucao,
 * entao a antiga tem que perder o `principal` antes disso. A recursao
 * para na primeira volta, porque o UPDATE de dentro grava `false`.
 */
create or replace function public.uma_replica_principal()
returns trigger language plpgsql as $$
begin
  if new.principal then
    update public.armamentos
       set principal = false
     where usuario_id = new.usuario_id and id <> new.id and principal;
  end if;
  return new;
end $$;

drop trigger if exists armamentos_principal on public.armamentos;
create trigger armamentos_principal before insert or update on public.armamentos
  for each row execute function public.uma_replica_principal();

-- Endpoint autenticado sem teto e convite para encher a tabela.
create or replace function public.limitar_armamentos()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.armamentos where usuario_id = new.usuario_id) >= 30 then
    raise exception 'limite de 30 replicas por usuario atingido'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists armamentos_limite on public.armamentos;
create trigger armamentos_limite before insert on public.armamentos
  for each row execute function public.limitar_armamentos();

-- ------------------------------------------------------------
-- RLS — a lista de replicas e privada
--
-- Quando existir perfil publico de jogador, a exposicao entra por
-- view com colunas escolhidas. A tabela nao abre.
-- ------------------------------------------------------------

alter table public.armamentos enable row level security;

drop policy if exists armamentos_le_o_proprio on public.armamentos;
create policy armamentos_le_o_proprio on public.armamentos
  for select to authenticated using (auth.uid() = usuario_id);

drop policy if exists armamentos_cria_o_proprio on public.armamentos;
create policy armamentos_cria_o_proprio on public.armamentos
  for insert to authenticated with check (auth.uid() = usuario_id);

drop policy if exists armamentos_edita_o_proprio on public.armamentos;
create policy armamentos_edita_o_proprio on public.armamentos
  for update to authenticated
  using (auth.uid() = usuario_id) with check (auth.uid() = usuario_id);

drop policy if exists armamentos_apaga_o_proprio on public.armamentos;
create policy armamentos_apaga_o_proprio on public.armamentos
  for delete to authenticated using (auth.uid() = usuario_id);

-- ------------------------------------------------------------
-- Curadoria: marcas escritas a mao, por frequencia
-- ------------------------------------------------------------

create or replace view public.marcas_para_curar
with (security_invoker = true) as
select btrim(marca_outra) as escrito, count(*)::int as vezes
from public.armamentos
where marca_outra is not null
group by 1
order by 2 desc, 1;
