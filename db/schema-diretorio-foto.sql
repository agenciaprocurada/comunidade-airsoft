-- ============================================================
-- Comunidade Airsoft — foto de capa do diretorio
--
-- Ate aqui campo, loja e armeiro eram so texto: nenhuma coluna de
-- imagem, nenhum bucket de storage, e a imagem de compartilhamento
-- era a mesma (og-padrao.jpg) para as 79 fichas de campo.
--
-- Decisoes que este arquivo trava:
--
-- 1. UMA capa por ficha, nao galeria. Galeria precisa de tabela
--    propria, ordenacao e visualizador; a capa sozinha ja resolve o
--    card do diretorio, o topo da ficha e o preview do WhatsApp.
--
-- 2. SO ADMIN ESCREVE. Imagem enviada por terceiro entra no ar sem
--    ninguem olhar, e o site responde por ela. Quando a tela do dono
--    aprovado existir, a policy de insert ganha o dono junto — nao
--    antes.
--
-- 3. LEITURA PUBLICA. O bucket e publico porque a ficha e publica e
--    gerada no BUILD: URL assinada expiraria dentro do HTML estatico.
-- ============================================================

alter table public.campos   add column if not exists foto_url text;
alter table public.lojas    add column if not exists foto_url text;
alter table public.armeiros add column if not exists foto_url text;

comment on column public.campos.foto_url is
  'Capa da ficha. URL publica do bucket `diretorio` no Storage.';

-- ------------------------------------------------------------
-- O bucket
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'diretorio', 'diretorio', true,
  5242880,                                   -- 5 MB
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- ------------------------------------------------------------
-- Quem mexe nos arquivos
--
-- `storage.objects` tem RLS ligada pelo Supabase. Sem policy, nem o
-- admin consegue subir nada — e o erro que aparece na tela e um
-- generico de "violates row-level security", que nao ajuda ninguem.
-- ------------------------------------------------------------

drop policy if exists diretorio_leitura_publica on storage.objects;
create policy diretorio_leitura_publica on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'diretorio');

drop policy if exists diretorio_admin_envia on storage.objects;
create policy diretorio_admin_envia on storage.objects
  for insert to authenticated
  with check (bucket_id = 'diretorio' and public.e_admin());

drop policy if exists diretorio_admin_troca on storage.objects;
create policy diretorio_admin_troca on storage.objects
  for update to authenticated
  using (bucket_id = 'diretorio' and public.e_admin())
  with check (bucket_id = 'diretorio' and public.e_admin());

drop policy if exists diretorio_admin_apaga on storage.objects;
create policy diretorio_admin_apaga on storage.objects
  for delete to authenticated
  using (bucket_id = 'diretorio' and public.e_admin());
