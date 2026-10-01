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
