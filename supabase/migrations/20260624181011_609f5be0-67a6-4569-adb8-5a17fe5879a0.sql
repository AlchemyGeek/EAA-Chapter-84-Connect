
create table public.hangar_talk_subscriptions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.hangar_talk_posts(id) on delete cascade,
  key_id integer not null references public.roster_members(key_id) on delete cascade,
  created_at timestamptz not null default now(),
  last_notified_at timestamptz,
  unique (post_id, key_id)
);

grant select, insert, delete on public.hangar_talk_subscriptions to authenticated;
grant all on public.hangar_talk_subscriptions to service_role;

alter table public.hangar_talk_subscriptions enable row level security;

create policy "own subs select"
  on public.hangar_talk_subscriptions for select
  to authenticated
  using (public.is_roster_self(key_id));

create policy "own subs insert"
  on public.hangar_talk_subscriptions for insert
  to authenticated
  with check (public.is_roster_self(key_id));

create policy "own subs delete"
  on public.hangar_talk_subscriptions for delete
  to authenticated
  using (public.is_roster_self(key_id));

create index hangar_talk_subscriptions_key_id_idx on public.hangar_talk_subscriptions(key_id);
create index hangar_talk_subscriptions_post_id_idx on public.hangar_talk_subscriptions(post_id);

-- Auto-subscribe the post author on insert.
create or replace function public.hangar_talk_autosub_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.hangar_talk_subscriptions (post_id, key_id)
  values (NEW.id, NEW.author_key_id)
  on conflict (post_id, key_id) do nothing;
  return NEW;
end;
$$;

create trigger hangar_talk_posts_autosub_author
  after insert on public.hangar_talk_posts
  for each row execute function public.hangar_talk_autosub_author();
