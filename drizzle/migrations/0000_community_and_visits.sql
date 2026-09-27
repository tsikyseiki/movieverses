create table public.posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('film','manga','occidental')),
  item_id text not null,
  title text not null check (char_length(title) between 1 and 300),
  poster text,
  rating numeric,
  user_rating int check (user_rating between 1 and 10),
  author text not null check (char_length(author) between 1 and 40),
  body text not null check (char_length(body) between 1 and 2000),
  likes_count int not null default 0,
  comments_count int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert on public.posts to anon, authenticated;
grant all on public.posts to service_role;
alter table public.posts enable row level security;
create policy "posts readable" on public.posts for select using (true);
create policy "posts insertable" on public.posts for insert with check (likes_count = 0 and comments_count = 0);

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author text not null check (char_length(author) between 1 and 40),
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
grant select, insert on public.post_comments to anon, authenticated;
grant all on public.post_comments to service_role;
alter table public.post_comments enable row level security;
create policy "comments readable" on public.post_comments for select using (true);
create policy "comments insertable" on public.post_comments for insert with check (true);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  device_id text not null check (char_length(device_id) between 8 and 64),
  created_at timestamptz not null default now(),
  primary key (post_id, device_id)
);
grant all on public.post_likes to service_role;
alter table public.post_likes enable row level security;

create table public.site_stats (
  id int primary key default 1 check (id = 1),
  visits bigint not null default 0
);
insert into public.site_stats (id, visits) values (1, 0);
grant select on public.site_stats to anon, authenticated;
grant all on public.site_stats to service_role;
alter table public.site_stats enable row level security;
create policy "stats readable" on public.site_stats for select using (true);

create or replace function public.bump_comments() returns trigger language plpgsql security definer set search_path = public as $$
begin update public.posts set comments_count = comments_count + 1 where id = new.post_id; return new; end $$;
create trigger trg_comments after insert on public.post_comments for each row execute function public.bump_comments();

create or replace function public.toggle_like(_post uuid, _device text) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if char_length(_device) < 8 or char_length(_device) > 64 then raise exception 'invalid device'; end if;
  if exists (select 1 from post_likes where post_id=_post and device_id=_device) then
    delete from post_likes where post_id=_post and device_id=_device;
    update posts set likes_count = greatest(likes_count-1,0) where id=_post returning likes_count into n;
  else
    insert into post_likes(post_id, device_id) values (_post,_device);
    update posts set likes_count = likes_count+1 where id=_post returning likes_count into n;
  end if;
  return n;
end $$;
grant execute on function public.toggle_like(uuid, text) to anon, authenticated;

create or replace function public.register_visit() returns bigint language sql security definer set search_path = public as $$
  update site_stats set visits = visits + 1 where id = 1 returning visits;
$$;
grant execute on function public.register_visit() to anon, authenticated;

alter publication supabase_realtime add table public.site_stats;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.post_comments;