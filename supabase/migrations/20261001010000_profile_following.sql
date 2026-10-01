-- Profil kuzatuvlari: foydalanuvchi faqat o‘z kuzatuvini RPC orqali o‘zgartira oladi.
create table if not exists public.profile_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  constraint profile_follows_no_self_follow check (follower_id <> followed_id)
);

create index if not exists profile_follows_followed_created_idx
  on public.profile_follows(followed_id, created_at desc);

alter table public.profile_follows enable row level security;
revoke all on table public.profile_follows from anon, authenticated;

create or replace function public.profile_follow_summary(p_profile_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_followers bigint;
  v_following bigint;
  v_is_following boolean := false;
begin
  if p_profile_id is null or not exists (select 1 from public.profiles where id = p_profile_id) then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  select count(*) into v_followers
  from public.profile_follows where followed_id = p_profile_id;
  select count(*) into v_following
  from public.profile_follows where follower_id = p_profile_id;
  if v_user is not null then
    select exists (
      select 1 from public.profile_follows
      where follower_id = v_user and followed_id = p_profile_id
    ) into v_is_following;
  end if;

  return jsonb_build_object(
    'profile_id', p_profile_id,
    'followers', v_followers,
    'following', v_following,
    'is_following', v_is_following
  );
end
$$;

create or replace function public.profile_follow_toggle(p_profile_id uuid, p_follow boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_profile_id is null or p_follow is null then raise exception 'INVALID_REQUEST'; end if;
  if v_user = p_profile_id then raise exception 'CANNOT_FOLLOW_SELF'; end if;
  if not exists (select 1 from public.profiles where id = p_profile_id) then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if p_follow then
    insert into public.profile_follows(follower_id, followed_id)
    values (v_user, p_profile_id)
    on conflict (follower_id, followed_id) do nothing;
  else
    delete from public.profile_follows
    where follower_id = v_user and followed_id = p_profile_id;
  end if;

  return public.profile_follow_summary(p_profile_id);
end
$$;

revoke all on function public.profile_follow_summary(uuid) from public;
grant execute on function public.profile_follow_summary(uuid) to anon, authenticated;
revoke all on function public.profile_follow_toggle(uuid, boolean) from public, anon;
grant execute on function public.profile_follow_toggle(uuid, boolean) to authenticated;

-- Kuzatuvchi ro‘yxatlari faqat foydalanuvchi son ustiga bosganda olinadi.
create or replace function public.profile_follow_list(
  p_profile_id uuid,
  p_list_type text default 'followers',
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_rows jsonb;
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 50);
begin
  if p_profile_id is null or not exists (select 1 from public.profiles where id = p_profile_id) then
    raise exception 'PROFILE_NOT_FOUND';
  end if;
  if p_list_type is null or p_list_type not in ('followers', 'following') then
    raise exception 'INVALID_LIST_TYPE';
  end if;

  if p_list_type = 'followers' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', result.id, 'username', result.username,
      'first_name', result.first_name, 'last_name', result.last_name
    ) order by result.created_at desc), '[]'::jsonb)
    into v_rows
    from (
      select pr.id, pr.username, pr.first_name, pr.last_name, f.created_at
      from public.profile_follows f
      join public.profiles pr on pr.id = f.follower_id
      where f.followed_id = p_profile_id
      order by f.created_at desc
      limit v_limit
    ) result;
  else
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', result.id, 'username', result.username,
      'first_name', result.first_name, 'last_name', result.last_name
    ) order by result.created_at desc), '[]'::jsonb)
    into v_rows
    from (
      select pr.id, pr.username, pr.first_name, pr.last_name, f.created_at
      from public.profile_follows f
      join public.profiles pr on pr.id = f.followed_id
      where f.follower_id = p_profile_id
      order by f.created_at desc
      limit v_limit
    ) result;
  end if;

  return v_rows;
end
$$;

revoke all on function public.profile_follow_list(uuid, text, integer) from public;
grant execute on function public.profile_follow_list(uuid, text, integer) to anon, authenticated;

