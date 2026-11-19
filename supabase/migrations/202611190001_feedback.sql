create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id text not null check (char_length(content_id) between 1 and 160),
  rating smallint not null check (rating between 1 and 5),
  emoji text not null check (emoji in ('😞', '😕', '😐', '😊', '🤩')),
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists feedback_user_created_idx on public.feedback (user_id, created_at desc);
alter table public.feedback enable row level security;

drop policy if exists "Users can submit own feedback" on public.feedback;
create policy "Users can submit own feedback"
  on public.feedback for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own feedback" on public.feedback;
create policy "Users can read own feedback"
  on public.feedback for select to authenticated
  using (auth.uid() = user_id);

revoke all on public.feedback from anon;
grant insert, select on public.feedback to authenticated;
