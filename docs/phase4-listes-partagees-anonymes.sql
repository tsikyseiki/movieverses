-- Phase 4 : permettre aux visiteurs NON connectés de voir une liste publique via son lien.
-- À exécuter une seule fois dans Supabase > SQL Editor (projet MovieVerse).
-- Ne change rien pour les listes privées : elles restent invisibles pour tout le monde sauf le propriétaire.

-- 1) Droits de lecture pour le rôle anonyme (sans eux, PostgreSQL refuse la lecture avant même les politiques)
grant select on public.user_lists to anon;
grant select on public.user_list_items to anon;

-- 2) Politiques : seules les listes marquées « publique » sont lisibles sans compte
drop policy if exists "listes publiques lecture anonyme" on public.user_lists;
create policy "listes publiques lecture anonyme" on public.user_lists
  for select to anon
  using (is_public);

drop policy if exists "items publics lecture anonyme" on public.user_list_items;
create policy "items publics lecture anonyme" on public.user_list_items
  for select to anon
  using (exists (select 1 from public.user_lists l where l.id = list_id and l.is_public));
