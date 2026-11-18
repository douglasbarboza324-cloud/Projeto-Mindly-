create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id text not null check (char_length(content_id) between 1 and 160),
  emoji text not null check (emoji in ('💚', '🙂', '😌', '✨', '🤗')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reactions_user_content_unique unique (user_id, content_id)
);

alter table public.profiles enable row level security;
alter table public.reactions enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can read own reactions" on public.reactions;
create policy "Users can read own reactions"
  on public.reactions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create own reactions" on public.reactions;
create policy "Users can create own reactions"
  on public.reactions for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own reactions" on public.reactions;
create policy "Users can update own reactions"
  on public.reactions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own reactions" on public.reactions;
create policy "Users can delete own reactions"
  on public.reactions for delete to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists reactions_set_updated_at on public.reactions;
create trigger reactions_set_updated_at
  before update on public.reactions
  for each row execute function public.set_updated_at();

create or replace function public.sync_auth_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, phone, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    new.email,
    new.phone,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    phone = excluded.phone,
    full_name = case
      when excluded.full_name <> '' then excluded.full_name
      else public.profiles.full_name
    end,
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_profile_sync on auth.users;
create trigger on_auth_user_profile_sync
  after insert or update of email, phone, raw_user_meta_data on auth.users
  for each row execute function public.sync_auth_profile();

revoke all on public.profiles from anon;
revoke all on public.reactions from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.reactions to authenticated;
