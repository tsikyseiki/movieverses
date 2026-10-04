-- =====================================================================
-- MovieVerse — Phase 2 (base de données) — NON TESTÉ, à appliquer via Lovable Cloud
-- Chaque bloc est indépendant. Toutes les tables ont la sécurité RLS activée.
-- =====================================================================

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

-- 2) Synchronisation du compte (favoris, notes, journal) + hors-ligne
create table public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;
create policy "user_data perso" on public.user_data for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3) Profils publics, abonnés, classement
alter table public.profiles add column if not exists is_public boolean not null default false;
create table public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
alter table public.follows enable row level security;
create policy "follows lecture" on public.follows for select to authenticated using (true);
create policy "follows ajout perso" on public.follows for insert to authenticated with check (auth.uid() = follower_id);
create policy "follows retrait perso" on public.follows for delete to authenticated using (auth.uid() = follower_id);

create table public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  watched_count int not null default 0,
  ratings_count int not null default 0,
  trophies_count int not null default 0,
  points int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.user_stats enable row level security;
create policy "stats perso" on public.user_stats for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Vue publique : uniquement les membres qui ont choisi un profil public (pseudo, photo, bio, stats)
create or replace view public.public_profiles as
  select p.id, p.display_name, p.avatar_url, p.bio,
         coalesce(s.watched_count,0) as watched_count, coalesce(s.trophies_count,0) as trophies_count, coalesce(s.points,0) as points
  from public.profiles p left join public.user_stats s on s.user_id = p.id
  where p.is_public = true;
grant select on public.public_profiles to authenticated;

-- 4) Listes publiques partageables
create table public.user_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text check (char_length(description) <= 300),
  is_public boolean not null default false,
  share_code text unique not null default substr(md5(random()::text), 1, 10),
  created_at timestamptz not null default now()
);
create table public.user_list_items (
  list_id uuid not null references public.user_lists(id) on delete cascade,
  kind text not null check (kind in ('film','manga','occidental')),
  item_id text not null,
  title text not null,
  poster text,
  position int not null default 0,
  primary key (list_id, kind, item_id)
);
alter table public.user_lists enable row level security;
alter table public.user_list_items enable row level security;
create policy "listes lecture" on public.user_lists for select to authenticated using (is_public or owner_id = auth.uid());
create policy "listes écriture perso" on public.user_lists for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "items lecture" on public.user_list_items for select to authenticated
  using (exists (select 1 from public.user_lists l where l.id = list_id and (l.is_public or l.owner_id = auth.uid())));
create policy "items écriture perso" on public.user_list_items for all to authenticated
  using (exists (select 1 from public.user_lists l where l.id = list_id and l.owner_id = auth.uid()))
  with check (exists (select 1 from public.user_lists l where l.id = list_id and l.owner_id = auth.uid()));

-- 5) Watchlist partagée en temps réel
create table public.shared_watchlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  join_code text unique not null default substr(md5(random()::text), 1, 8),
  created_at timestamptz not null default now()
);
create table public.shared_watchlist_members (
  watchlist_id uuid not null references public.shared_watchlists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (watchlist_id, user_id)
);
create table public.shared_watchlist_items (
  id uuid primary key default gen_random_uuid(),
  watchlist_id uuid not null references public.shared_watchlists(id) on delete cascade,
  kind text not null check (kind in ('film','manga','occidental')),
  item_id text not null,
  title text not null,
  poster text,
  added_by uuid not null default auth.uid() references auth.users(id),
  watched boolean not null default false,
  created_at timestamptz not null default now(),
  unique (watchlist_id, kind, item_id)
);
alter table public.shared_watchlists enable row level security;
alter table public.shared_watchlist_members enable row level security;
alter table public.shared_watchlist_items enable row level security;
create or replace function public.is_watchlist_member(_wl uuid) returns boolean
language sql stable security definer set search_path = public as $body$
  select exists (select 1 from public.shared_watchlist_members where watchlist_id = _wl and user_id = auth.uid())
      or exists (select 1 from public.shared_watchlists where id = _wl and owner_id = auth.uid());
$body$;
create policy "wl lecture membres" on public.shared_watchlists for select to authenticated using (public.is_watchlist_member(id));
create policy "wl création" on public.shared_watchlists for insert to authenticated with check (owner_id = auth.uid());
create policy "wl suppression propriétaire" on public.shared_watchlists for delete to authenticated using (owner_id = auth.uid());
create policy "membres lecture" on public.shared_watchlist_members for select to authenticated using (public.is_watchlist_member(watchlist_id));
create policy "membres départ" on public.shared_watchlist_members for delete to authenticated using (user_id = auth.uid());
create policy "wl items tout membres" on public.shared_watchlist_items for all to authenticated
  using (public.is_watchlist_member(watchlist_id)) with check (public.is_watchlist_member(watchlist_id));
-- Rejoindre via le code (fonction sécurisée : le code fait office de clé)
create or replace function public.join_watchlist(_code text) returns uuid
language plpgsql security definer set search_path = public as $body$
declare wl uuid;
begin
  select id into wl from public.shared_watchlists where join_code = _code;
  if wl is null then raise exception 'Code invalide'; end if;
  insert into public.shared_watchlist_members (watchlist_id, user_id) values (wl, auth.uid()) on conflict do nothing;
  return wl;
end $body$;
alter publication supabase_realtime add table public.shared_watchlist_items;

-- 6) Modération : signalements, masquage, permissions modérateur
alter table public.posts add column if not exists hidden boolean not null default false;
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 300),
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "signaler" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "moderation lecture" on public.reports for select to authenticated
  using (public.has_role(auth.uid(), 'moderator') or public.has_role(auth.uid(), 'admin'));
create policy "moderation traitement" on public.reports for update to authenticated
  using (public.has_role(auth.uid(), 'moderator') or public.has_role(auth.uid(), 'admin'));
create policy "moderateur masque avis" on public.posts for update to authenticated
  using (public.has_role(auth.uid(), 'moderator') or public.has_role(auth.uid(), 'admin'));
create policy "moderateur supprime avis" on public.posts for delete to authenticated
  using (public.has_role(auth.uid(), 'moderator') or public.has_role(auth.uid(), 'admin'));
create policy "moderateur supprime commentaires" on public.post_comments for delete to authenticated
  using (public.has_role(auth.uid(), 'moderator') or public.has_role(auth.uid(), 'admin'));
create policy "admin gère les rôles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- 7) Notifications push (stockage des abonnements ; l'envoi demande une clé VAPID côté serveur)
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "push perso" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 8) Droits d'accès (indispensables : sans eux, les politiques ci-dessus ne servent à rien)
grant select, insert, update, delete on public.user_data, public.follows, public.user_stats, public.user_lists,
  public.user_list_items, public.shared_watchlists, public.shared_watchlist_members, public.shared_watchlist_items,
  public.reports, public.push_subscriptions to authenticated;
grant all on public.user_data, public.follows, public.user_stats, public.user_lists, public.user_list_items,
  public.shared_watchlists, public.shared_watchlist_members, public.shared_watchlist_items,
  public.reports, public.push_subscriptions to service_role;
grant update, delete on public.posts to authenticated;
grant delete on public.post_comments to authenticated;
grant insert, update, delete on public.user_roles to authenticated;

-- 9) Retours des membres (page « Contact »)
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('Suggestion','Bug','Contenu à corriger','Suppression de mon compte','Autre')),
  message text not null check (char_length(message) between 10 and 1000),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
create policy "feedback envoi" on public.feedback for insert to authenticated with check (user_id = auth.uid());
create policy "feedback lecture admin" on public.feedback for select to authenticated using (public.has_role(auth.uid(), 'admin'));
grant select, insert on public.feedback to authenticated;
grant all on public.feedback to service_role;
