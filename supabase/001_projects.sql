create table if not exists public.robot_projects (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.robot_projects enable row level security;
create policy "Users manage their own robot projects" on public.robot_projects
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create or replace function public.set_project_updated_at() returns trigger language plpgsql
  set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
create trigger project_updated_at before update on public.robot_projects
  for each row execute function public.set_project_updated_at();
