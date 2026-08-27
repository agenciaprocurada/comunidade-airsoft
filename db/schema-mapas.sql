-- ============================================================
-- Comunidade Airsoft — criador de mapa de operacao
--
-- Hoje o mapa de briefing e uma foto de satelite printada e rabiscada
-- no Paint, reenviada no grupo toda operacao. Isto substitui o rabisco,
-- nao a conversa: o organizador monta a grade de setores e as areas
-- (estacionamento, CQB, respawn) e leva um PNG embora.
--
-- Decisoes estruturais que este schema trava:
--
-- 1. A IMAGEM DE SATELITE NAO E ARMAZENADA. A tabela guarda o
--    ENQUADRAMENTO (lat, lng, zoom, rotacao, formato) e as CAMADAS
--    (`dados`, o desenho do editor). A imagem base e buscada de novo
--    a cada abertura, pela rota /api/mapa/base.
--
--    Isso e deliberado em tres frentes: o registro inteiro cabe em
--    ~2 KB em vez de ~2 MB; o mapa continua reeditavel para sempre em
--    vez de virar bitmap morto; e a plataforma nao acumula copia de
--    imagem de terceiro em disco proprio.
--
-- 2. O PNG ACHATADO SO EXISTE QUANDO PUBLICADO. `publicado_url` fica
--    nulo enquanto o mapa e rascunho do usuario. Ele so e preenchido
--    quando o organizador anexa o mapa a uma operacao — porque ai a
--    pagina publica precisa de um arquivo leve e sem JavaScript, que
--    e o que abre no celular, no campo, com sinal ruim.
--
-- 3. MAPA E DO USUARIO, NAO DA OPERACAO. Um mapa serve varias
--    operacoes no mesmo campo — e o caso comum, o campo nao muda toda
--    semana. Por isso a chave estrangeira mora em `operacoes`, e nao
--    o contrario: apagar a operacao nao pode levar o mapa junto.
--
-- 4. TETO DE 30 POR PESSOA. Sem teto, um unico usuario transforma o
--    painel em deposito e a listagem em rolagem infinita. 30 cobre com
--    folga quem organiza toda semana num punhado de campos.
--
-- Aplicar DEPOIS de db/schema.sql, schema-usuarios.sql e
-- schema-operacoes.sql.
-- ============================================================

-- ------------------------------------------------------------
-- Tipos
-- ------------------------------------------------------------

-- O formato decide a proporcao do recorte final. Nao e estetica: o
-- mapa vai para tela de celular (retrato), para projetor no briefing
-- (largo) e para folha impressa (paisagem), e forcar um so formato
-- obriga o organizador a recortar de novo por fora.
do $$ begin
  create type public.formato_mapa as enum ('quadrado','paisagem','largo','retrato');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------
-- Mapas
-- ------------------------------------------------------------

create table if not exists public.mapas (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references auth.users(id) on delete cascade,

  nome          text not null,

  -- Vinculo opcional com o diretorio. So para o mapa nascer com nome
  -- decente e aparecer agrupado no painel; o mapa NAO depende da ficha
  -- continuar existindo, por isso `set null` e nao `cascade`.
  --
  -- `text` e nao `uuid`: a chave de `campos` e o slug, porque as fichas
  -- vem do levantamento e sao geradas no build. `operacoes.campo_id` ja
  -- segue esse mesmo tipo.
  campo_id      text references public.campos(id) on delete set null,

  -- ----------------------------------------------------------
  -- Enquadramento — e o que substitui guardar a imagem.
  --
  -- Estes cinco campos, passados para /api/mapa/base, reconstroem
  -- pixel por pixel a mesma base de satelite. Zoom 20 e o teto util:
  -- acima disso a maior parte do Brasil rural nao tem imagem e o
  -- provedor devolve tile cinza.
  -- ----------------------------------------------------------
  lat           double precision not null,
  lng           double precision not null,
  zoom          smallint not null default 18,

  -- Graus no sentido horario aplicados a imagem para alinhar o campo.
  -- Fica aqui, e nao dentro de `dados`, porque a rotacao pertence a
  -- BASE: o desenho por cima ja nasce alinhado com ela.
  rotacao       smallint not null default 0,

  formato       public.formato_mapa not null default 'paisagem',

  -- ----------------------------------------------------------
  -- O desenho
  --
  -- `jsonb` e nao coluna por tipo de forma: a grade de setores, os
  -- poligonos, as setas e os rotulos sao um documento so, lido e
  -- gravado inteiro pelo editor. Modelar cada forma em tabela daria
  -- dezenas de linhas por mapa sem nenhuma consulta que as justifique
  -- — ninguem vai perguntar "quantos poligonos existem no banco".
  -- ----------------------------------------------------------
  dados         jsonb not null default '{}'::jsonb,

  -- ----------------------------------------------------------
  -- Saida publicada
  --
  -- PNG achatado no bucket `mapas`, gerado no navegador do organizador
  -- no momento em que ele anexa o mapa a uma operacao. Nulo enquanto o
  -- mapa e so rascunho dele.
  -- ----------------------------------------------------------
  publicado_url text,
  publicado_em  timestamptz,

  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint mapas_nome_tamanho check (char_length(trim(nome)) between 2 and 80),
  constraint mapas_lat_valida   check (lat between -90 and 90),
  constraint mapas_lng_valida   check (lng between -180 and 180),
  -- 15 enquadra um municipio inteiro, 20 e o teto de imagem no Brasil.
  constraint mapas_zoom_valido  check (zoom between 15 and 20),
  constraint mapas_rotacao_valida check (rotacao between 0 and 359),
  -- Publicar e um par: URL sem data (ou o contrario) e registro quebrado.
  constraint mapas_publicacao_completa check (
    (publicado_url is null and publicado_em is null) or
    (publicado_url is not null and publicado_em is not null)
  )
);

create index if not exists mapas_por_usuario
  on public.mapas (usuario_id, atualizado_em desc);

drop trigger if exists mapas_atualizado_em on public.mapas;
create trigger mapas_atualizado_em before update on public.mapas
  for each row execute function public.tocar_atualizado_em();

-- ------------------------------------------------------------
-- Teto por pessoa
--
-- No banco, e nao so na tela: a tela protege o fluxo normal, o gatilho
-- protege de requisicao repetida e de bug de duplo envio.
-- ------------------------------------------------------------

create or replace function public.limitar_mapas()
returns trigger language plpgsql as $$
declare
  quantos int;
begin
  select count(*) into quantos from public.mapas where usuario_id = new.usuario_id;
  if quantos >= 30 then
    raise exception 'Limite de 30 mapas por usuario atingido.'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists mapas_teto on public.mapas;
create trigger mapas_teto before insert on public.mapas
  for each row execute function public.limitar_mapas();

-- ------------------------------------------------------------
-- RLS
--
-- Mapa e rascunho de trabalho: nasce privado e assim continua. O que
-- fica publico e o PNG achatado no bucket, quando o dono publica — nao
-- a linha da tabela, que carrega o enquadramento e o desenho editavel.
-- ------------------------------------------------------------

alter table public.mapas enable row level security;

drop policy if exists mapas_dono_le on public.mapas;
create policy mapas_dono_le on public.mapas
  for select to authenticated
  using (usuario_id = auth.uid());

drop policy if exists mapas_dono_cria on public.mapas;
create policy mapas_dono_cria on public.mapas
  for insert to authenticated
  with check (usuario_id = auth.uid());

drop policy if exists mapas_dono_edita on public.mapas;
create policy mapas_dono_edita on public.mapas
  for update to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

drop policy if exists mapas_dono_apaga on public.mapas;
create policy mapas_dono_apaga on public.mapas
  for delete to authenticated
  using (usuario_id = auth.uid());

-- ------------------------------------------------------------
-- Bucket do PNG publicado
--
-- Publico pelo mesmo motivo do bucket `diretorio`: a pagina da
-- operacao e servida como HTML e a URL precisa valer sem assinatura.
-- URL assinada expira e o link do briefing morre no meio da semana.
--
-- So PNG: o desenho tem texto e linha fina sobre foto, e JPEG suja
-- borda de letra com artefato. WebP entra junto porque e menor e todo
-- navegador atual le.
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mapas', 'mapas', true,
  8388608,                                   -- 8 MB
  array['image/png','image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 8388608,
      allowed_mime_types = array['image/png','image/webp'];

-- O caminho do arquivo e sempre `<uid>/<mapa>.png`. As policies
-- comparam a PRIMEIRA pasta do caminho com o uid de quem chama: e o
-- que impede alguem logado de sobrescrever o mapa de outro.
drop policy if exists mapas_leitura_publica on storage.objects;
create policy mapas_leitura_publica on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'mapas');

drop policy if exists mapas_dono_envia on storage.objects;
create policy mapas_dono_envia on storage.objects
  for insert to authenticated
  with check (bucket_id = 'mapas' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists mapas_dono_troca on storage.objects;
create policy mapas_dono_troca on storage.objects
  for update to authenticated
  using (bucket_id = 'mapas' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'mapas' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists mapas_dono_apaga_arquivo on storage.objects;
create policy mapas_dono_apaga_arquivo on storage.objects
  for delete to authenticated
  using (bucket_id = 'mapas' and (storage.foldername(name))[1] = auth.uid()::text);

-- ------------------------------------------------------------
-- Ligacao com a operacao
--
-- `set null` e nao `cascade`: o organizador apaga um mapa antigo e a
-- operacao continua de pe, so sem mapa. O contrario — sumir a operacao
-- porque o mapa foi apagado — seria destruir a lista de presenca.
-- ------------------------------------------------------------

alter table public.operacoes
  add column if not exists mapa_id uuid references public.mapas(id) on delete set null;

comment on column public.operacoes.mapa_id is
  'Mapa de briefing anexado. A pagina publica le `mapas.publicado_url`.';
