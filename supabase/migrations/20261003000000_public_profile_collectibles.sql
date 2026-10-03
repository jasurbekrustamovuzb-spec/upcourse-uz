-- Public profile collections intentionally expose earned collectible metadata.
-- SECURITY DEFINER bypasses user_collectibles RLS, but returns only the
-- collectible's public id, title, subtitle, equipped flag, and collected time.
create or replace function public.public_profile_collectibles(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', uc.id,
        'collectible_id', uc.collectible_id,
        'equipped', uc.equipped,
        'collected_at', uc.collected_at,
        'title', c.title,
        'subtitle', c.subtitle
      )
      order by uc.collected_at desc
    ),
    '[]'::jsonb
  )
  from public.user_collectibles uc
  join public.collectibles c on c.id = uc.collectible_id
  where uc.user_id = p_user_id
    and exists (
      select 1
      from public.profiles p
      where p.id = p_user_id
        and p.username is not null
    );
$$;

revoke all on function public.public_profile_collectibles(uuid) from public;
grant execute on function public.public_profile_collectibles(uuid) to anon, authenticated;
