-- Private resources shared through UpCourse. The receiver can open and save
-- a resource only while a sender-to-recipient share row exists.
create table if not exists public.profile_shared_resources (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  resource_type text not null check (resource_type in ('course', 'test')),
  resource_id uuid not null,
  shared_at timestamptz not null default now(),
  saved_at timestamptz,
  constraint profile_shared_resources_no_self_share check (sender_id <> recipient_id),
  constraint profile_shared_resources_unique unique (sender_id, recipient_id, resource_type, resource_id)
);

-- App-generated course and test IDs are text slugs/nano IDs, not always UUIDs.
-- Keep old UUID-backed rows readable by converting their IDs to text.
alter table public.profile_shared_resources
  alter column resource_id type text using resource_id::text;

create index if not exists profile_shared_resources_recipient_shared_idx
  on public.profile_shared_resources(recipient_id, shared_at desc);
create index if not exists profile_shared_resources_recipient_saved_idx
  on public.profile_shared_resources(recipient_id, saved_at desc)
  where saved_at is not null;

alter table public.profile_shared_resources enable row level security;
revoke all on table public.profile_shared_resources from anon, authenticated;

drop function if exists public.profile_shared_resource_send(text, uuid, uuid[]);

create or replace function public.profile_shared_resource_send(
  p_resource_type text,
  p_resource_id text,
  p_recipient_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sender uuid := auth.uid();
  v_owned boolean := false;
  v_recipients uuid[];
  v_followers bigint;
begin
  if v_sender is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_resource_type not in ('course', 'test') or p_resource_id is null then
    raise exception 'INVALID_RESOURCE';
  end if;

  select coalesce(array_agg(distinct recipient_id), '{}'::uuid[])
    into v_recipients
  from unnest(coalesce(p_recipient_ids, '{}'::uuid[])) as recipients(recipient_id)
  where recipient_id is not null and recipient_id <> v_sender;

  if cardinality(v_recipients) < 1 or cardinality(v_recipients) > 50 then
    raise exception 'INVALID_RECIPIENT_COUNT';
  end if;

  -- Also recognize legacy rows that the profile already identifies as owned
  -- by matching the current username or exact display name.
  if p_resource_type = 'course' then
    select exists (
      select 1
      from public.courses c
      where c.id::text = p_resource_id
        and (
          c.author_id = v_sender
          or (
            c.author_id is null
            and exists (
              select 1
              from public.profiles p
              where p.id = v_sender
                and nullif(btrim(c.author), '') is not null
                and lower(btrim(c.author)) in (
                  lower(btrim(p.username)),
                  lower('@' || btrim(p.username)),
                  lower(btrim(concat_ws(' ', p.first_name, p.last_name)))
                )
            )
          )
        )
    ) into v_owned;
  else
    select exists (
      select 1
      from public.tests t
      where t.id::text = p_resource_id
        and (
          t.author_id = v_sender
          or (
            t.author_id is null
            and exists (
              select 1
              from public.profiles p
              where p.id = v_sender
                and nullif(btrim(t.author), '') is not null
                and lower(btrim(t.author)) in (
                  lower(btrim(p.username)),
                  lower('@' || btrim(p.username)),
                  lower(btrim(concat_ws(' ', p.first_name, p.last_name)))
                )
            )
          )
        )
    ) into v_owned;
  end if;

  if not v_owned then
    raise exception 'RESOURCE_NOT_OWNED';
  end if;

  select count(*) into v_followers
  from public.profile_follows
  where followed_id = v_sender and follower_id = any(v_recipients);

  if v_followers <> cardinality(v_recipients) then
    raise exception 'RECIPIENT_NOT_FOLLOWER';
  end if;

  insert into public.profile_shared_resources (
    sender_id, recipient_id, resource_type, resource_id, shared_at
  )
  select v_sender, recipient_id, p_resource_type, p_resource_id, now()
  from unnest(v_recipients) as recipients(recipient_id)
  on conflict (sender_id, recipient_id, resource_type, resource_id)
  do update set shared_at = excluded.shared_at;

  return jsonb_build_object('sent_count', cardinality(v_recipients));
end;
$$;

create or replace function public.profile_shared_resources_list(
  p_scope text default 'all',
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_rows jsonb;
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 50);
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if coalesce(p_scope, 'all') not in ('all', 'saved') then
    raise exception 'INVALID_SCOPE';
  end if;

  select coalesce(jsonb_agg(result.row_data order by result.shared_at desc), '[]'::jsonb)
    into v_rows
  from (
    select
      s.shared_at,
      jsonb_build_object(
        'share_id', s.id,
        'resource_type', s.resource_type,
        'shared_at', s.shared_at,
        'saved_at', s.saved_at,
        'saved', s.saved_at is not null,
        'sender', jsonb_build_object(
          'id', sender.id,
          'username', sender.username,
          'first_name', sender.first_name,
          'last_name', sender.last_name
        ),
        'resource',
          case
            when s.resource_type = 'course' and c.id is not null then jsonb_build_object(
              'id', c.id, 'category_id', c.category_id, 'title', c.title,
              'summary', c.summary, 'content', c.content, 'video_url', c.video_url,
              'author', c.author, 'author_id', c.author_id, 'status', c.status
            )
            when s.resource_type = 'test' and t.id is not null then jsonb_build_object(
              'id', t.id, 'category_id', t.category_id, 'title', t.title,
              'description', t.description, 'questions', t.questions,
              'author', t.author, 'author_id', t.author_id, 'status', t.status
            )
            else null
          end
      ) as row_data
    from public.profile_shared_resources s
    join public.profiles sender on sender.id = s.sender_id
    left join public.courses c on s.resource_type = 'course' and c.id::text = s.resource_id
    left join public.tests t on s.resource_type = 'test' and t.id::text = s.resource_id
    where s.recipient_id = v_user
      and (coalesce(p_scope, 'all') <> 'saved' or s.saved_at is not null)
    order by s.shared_at desc
    limit v_limit
  ) result;

  return v_rows;
end;
$$;

create or replace function public.profile_shared_resource_save(
  p_share_id uuid,
  p_save boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_updated integer;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  update public.profile_shared_resources
  set saved_at = case when coalesce(p_save, false) then now() else null end
  where id = p_share_id and recipient_id = v_user;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.profile_shared_resource_send(text, text, uuid[]) from public, anon;
revoke all on function public.profile_shared_resources_list(text, integer) from public, anon;
revoke all on function public.profile_shared_resource_save(uuid, boolean) from public, anon;
grant execute on function public.profile_shared_resource_send(text, text, uuid[]) to authenticated;
grant execute on function public.profile_shared_resources_list(text, integer) to authenticated;
grant execute on function public.profile_shared_resource_save(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
