-- =====================================================================
-- MovieVerse — Phase 2, PARTIE B : stockage des photos de profil (bucket « avatars »)
-- À exécuter APRÈS la partie A. Si cette partie échoue (droits insuffisants),
-- demandez plutôt à Lovable dans le chat de créer ce bucket (voir les explications).
-- =====================================================================
begin;

-- 1) Photos de profil (bucket public, chaque membre ne gère que son dossier)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "avatars lecture publique" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars envoi perso" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars modif perso" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars suppression perso" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

commit;
