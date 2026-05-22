-- Enums
create type public.classified_category as enum (
  'for-sale','wanted','hangar-space','services','training',
  'expertise-help','free-giveaway','miscellaneous'
);
create type public.classified_status as enum ('active','expired','hidden');

-- Listings table
create table public.classifieds (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 100),
  description text not null check (char_length(description) >= 20),
  category public.classified_category not null,
  tags text[] not null default '{}',
  status public.classified_status not null default 'active',
  author_key_id integer not null,
  author_name text not null,
  author_email text not null,
  author_phone text,
  author_phone_visible boolean not null default false,
  posted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index classifieds_status_expires_idx on public.classifieds (status, expires_at);
create index classifieds_author_idx on public.classifieds (author_key_id);

create trigger classifieds_set_updated_at
before update on public.classifieds
for each row execute function public.update_updated_at_column();

alter table public.classifieds enable row level security;

-- Helper: does caller's email match this key_id in roster_members?
create or replace function public.is_classified_author(_key_id integer)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from roster_members rm
    where rm.key_id = _key_id
      and lower(rm.email) = lower((auth.jwt() ->> 'email'))
  );
$$;

-- SELECT: visible to all authenticated except hidden (which only author/officer/admin see)
create policy "View non-hidden classifieds"
  on public.classifieds for select
  to authenticated
  using (
    status <> 'hidden'
    or has_role(auth.uid(), 'admin')
    or is_officer(auth.jwt() ->> 'email')
    or is_classified_author(author_key_id)
  );

-- INSERT: caller must be the author (and an active roster member)
create policy "Active members can post own classifieds"
  on public.classifieds for insert
  to authenticated
  with check (
    is_classified_author(author_key_id)
    and exists (
      select 1 from roster_members rm
      where rm.key_id = author_key_id
        and rm.current_standing = 'Active'
    )
  );

-- UPDATE: author, officer, or admin
create policy "Author/officer/admin can update classifieds"
  on public.classifieds for update
  to authenticated
  using (
    is_classified_author(author_key_id)
    or has_role(auth.uid(), 'admin')
    or is_officer(auth.jwt() ->> 'email')
  )
  with check (
    is_classified_author(author_key_id)
    or has_role(auth.uid(), 'admin')
    or is_officer(auth.jwt() ->> 'email')
  );

-- DELETE: author, officer, or admin
create policy "Author/officer/admin can delete classifieds"
  on public.classifieds for delete
  to authenticated
  using (
    is_classified_author(author_key_id)
    or has_role(auth.uid(), 'admin')
    or is_officer(auth.jwt() ->> 'email')
  );

-- Photos table
create table public.classified_photos (
  id uuid primary key default gen_random_uuid(),
  classified_id uuid not null references public.classifieds(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index classified_photos_classified_idx on public.classified_photos (classified_id, sort_order);

alter table public.classified_photos enable row level security;

create policy "View photos of visible classifieds"
  on public.classified_photos for select
  to authenticated
  using (
    exists (
      select 1 from public.classifieds c
      where c.id = classified_id
        and (
          c.status <> 'hidden'
          or has_role(auth.uid(), 'admin')
          or is_officer(auth.jwt() ->> 'email')
          or is_classified_author(c.author_key_id)
        )
    )
  );

create policy "Author/officer/admin can insert photos"
  on public.classified_photos for insert
  to authenticated
  with check (
    exists (
      select 1 from public.classifieds c
      where c.id = classified_id
        and (
          is_classified_author(c.author_key_id)
          or has_role(auth.uid(), 'admin')
          or is_officer(auth.jwt() ->> 'email')
        )
    )
  );

create policy "Author/officer/admin can delete photos"
  on public.classified_photos for delete
  to authenticated
  using (
    exists (
      select 1 from public.classifieds c
      where c.id = classified_id
        and (
          is_classified_author(c.author_key_id)
          or has_role(auth.uid(), 'admin')
          or is_officer(auth.jwt() ->> 'email')
        )
    )
  );

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('classifieds', 'classifieds', false)
on conflict (id) do nothing;

-- Storage RLS — authenticated read, member-scoped write, officer/admin moderation
create policy "Authenticated can view classified photos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'classifieds');

create policy "Members can upload to own classified folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'classifieds'
    and (storage.foldername(name))[1] in (
      select rm.key_id::text
      from roster_members rm
      where lower(rm.email) = lower(auth.jwt() ->> 'email')
        and rm.current_standing = 'Active'
    )
  );

create policy "Author or officer/admin can delete classified photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'classifieds'
    and (
      has_role(auth.uid(), 'admin')
      or is_officer(auth.jwt() ->> 'email')
      or (storage.foldername(name))[1] in (
        select rm.key_id::text
        from roster_members rm
        where lower(rm.email) = lower(auth.jwt() ->> 'email')
      )
    )
  );

create policy "Author or officer/admin can update classified photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'classifieds'
    and (
      has_role(auth.uid(), 'admin')
      or is_officer(auth.jwt() ->> 'email')
      or (storage.foldername(name))[1] in (
        select rm.key_id::text
        from roster_members rm
        where lower(rm.email) = lower(auth.jwt() ->> 'email')
      )
    )
  );