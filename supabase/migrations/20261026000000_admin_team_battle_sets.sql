create or replace function public.admin_list_team_battle_sets()
returns table (
  id uuid,
  owner_id uuid,
  owner_name text,
  title text,
  questions jsonb,
  question_count integer,
  is_shared boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_admin = true
  ) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return query
  select
    s.id,
    s.owner_id,
    coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.username, '') as owner_name,
    s.title,
    s.questions,
    jsonb_array_length(s.questions)::integer as question_count,
    s.is_shared,
    s.created_at
  from public.team_battle_sets s
  left join public.profiles p on p.id = s.owner_id
  order by s.created_at desc;
end;
$$;

revoke all on function public.admin_list_team_battle_sets() from public, anon;
grant execute on function public.admin_list_team_battle_sets() to authenticated;

notify pgrst, 'reload schema';
