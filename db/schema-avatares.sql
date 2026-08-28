-- ------------------------------------------------------------
-- Fotos de perfil enviadas pelo usuario ("Alterar foto")
--
-- Ate aqui a foto vinha so do Google (perfis.foto_url). O botao
-- "Alterar foto" na ficha grava a imagem neste bucket e troca a URL.
-- Caminho sempre `<uid>/avatar-<ts>.<ext>`; as policies comparam a
-- primeira pasta com o uid de quem chama, igual ao bucket `mapas`.
-- ------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatares', 'avatares', true,
  4194304,                                   -- 4 MB
  array['image/png','image/webp','image/jpeg']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 4194304,
      allowed_mime_types = array['image/png','image/webp','image/jpeg'];

drop policy if exists avatares_leitura_publica on storage.objects;
create policy avatares_leitura_publica on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatares');

drop policy if exists avatares_dono_envia on storage.objects;
create policy avatares_dono_envia on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatares_dono_troca on storage.objects;
create policy avatares_dono_troca on storage.objects
  for update to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatares_dono_apaga on storage.objects;
create policy avatares_dono_apaga on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
