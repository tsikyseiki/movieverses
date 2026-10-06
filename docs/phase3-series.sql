-- MovieVerse — Séries : autorise la nouvelle catégorie « serie » dans les avis, les listes et les listes partagées.
-- À coller dans Lovable : Cloud > SQL editor, puis « Run », une seule fois.
begin;

-- Supprime les anciennes limites (qui n'acceptent que film / manga / occidental), quel que soit leur nom
do $body$
declare r record;
begin
  for r in
    select conrelid::regclass as t, conname
    from pg_constraint
    where contype = 'c'
      and conrelid in ('public.posts'::regclass, 'public.user_list_items'::regclass, 'public.shared_watchlist_items'::regclass)
      and pg_get_constraintdef(oid) ilike '%kind%occidental%'
  loop
    execute format('alter table %s drop constraint %I', r.t, r.conname);
  end loop;
end $body$;

alter table public.posts add constraint posts_kind_check check (kind in ('film','manga','occidental','serie'));
alter table public.user_list_items add constraint user_list_items_kind_check check (kind in ('film','manga','occidental','serie'));
alter table public.shared_watchlist_items add constraint shared_watchlist_items_kind_check check (kind in ('film','manga','occidental','serie'));

commit;
