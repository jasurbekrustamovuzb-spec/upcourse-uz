create table if not exists public.team_battle_sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  questions jsonb not null default '[]'::jsonb check (case when jsonb_typeof(questions) = 'array' then jsonb_array_length(questions) between 1 and 100 else false end),
  share_token uuid not null unique default gen_random_uuid(),
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_battle_sets_owner_created_idx
  on public.team_battle_sets(owner_id, created_at desc);

alter table public.team_battle_sets enable row level security;
revoke all on public.team_battle_sets from anon, authenticated;
grant select, insert, update, delete on public.team_battle_sets to authenticated;

drop policy if exists "owners read team battle sets" on public.team_battle_sets;
create policy "owners read team battle sets"
  on public.team_battle_sets for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "owners create team battle sets" on public.team_battle_sets;
create policy "owners create team battle sets"
  on public.team_battle_sets for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "owners update team battle sets" on public.team_battle_sets;
create policy "owners update team battle sets"
  on public.team_battle_sets for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "owners delete team battle sets" on public.team_battle_sets;
create policy "owners delete team battle sets"
  on public.team_battle_sets for delete to authenticated
  using (owner_id = auth.uid());

create or replace function public.get_shared_team_battle_set(p_share_token uuid)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', s.id,
    'title', s.title,
    'questions', s.questions,
    'share_token', s.share_token
  )
  from public.team_battle_sets s
  where s.share_token = p_share_token
    and s.is_shared = true
  limit 1;
$$;

revoke all on function public.get_shared_team_battle_set(uuid) from public;
grant execute on function public.get_shared_team_battle_set(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
