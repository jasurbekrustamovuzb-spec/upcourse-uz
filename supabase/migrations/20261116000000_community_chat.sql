-- Realtime community: direct chats, public/private groups, channels, and News.
create table if not exists public.community_chats (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('direct', 'group', 'channel', 'news')),
  title text not null default '',
  description text not null default '',
  is_public boolean not null default false,
  is_system boolean not null default false,
  system_key text unique,
  owner_id uuid references public.profiles(id) on delete set null,
  direct_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz,
  constraint community_chats_direct_key_shape check ((kind = 'direct') = (direct_key is not null)),
  constraint community_chats_news_shape check ((kind = 'news') = is_system)
);

create table if not exists public.community_chat_members (
  chat_id uuid not null references public.community_chats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  added_by uuid references public.profiles(id) on delete set null,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);

create index if not exists community_chat_members_user_idx
  on public.community_chat_members(user_id, joined_at desc);
create index if not exists community_chats_discovery_idx
  on public.community_chats(kind, is_public, last_message_at desc)
  where kind in ('group', 'channel');
create index if not exists community_chats_last_message_idx
  on public.community_chats(last_message_at desc);

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.community_chats(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_name text not null default '',
  sender_username text not null default '',
  body text not null default '',
  resource_kind text check (resource_kind is null or resource_kind in ('course', 'test', 'course_category', 'test_category')),
  resource_id text,
  resource_title text,
  resource_data jsonb,
  created_at timestamptz not null default now(),
  constraint community_messages_not_empty check (
    length(trim(body)) > 0 or resource_kind is not null
  ),
  constraint community_messages_resource_shape check (
    (resource_kind is null and resource_id is null) or
    (resource_kind is not null and resource_id is not null)
  )
);
create index if not exists community_messages_chat_created_idx
  on public.community_messages(chat_id, created_at desc);

create table if not exists public.community_invites (
  token uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.community_chats(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '30 days'),
  uses_remaining integer not null default 30 check (uses_remaining >= 0),
  created_at timestamptz not null default now()
);
create index if not exists community_invites_chat_idx
  on public.community_invites(chat_id, created_at desc);

alter table public.community_chats enable row level security;
alter table public.community_chat_members enable row level security;
alter table public.community_messages enable row level security;
alter table public.community_invites enable row level security;

revoke all on public.community_chats, public.community_chat_members, public.community_messages, public.community_invites from anon, authenticated;
grant select on public.community_chats, public.community_chat_members, public.community_messages to authenticated;

drop policy if exists community_chats_read on public.community_chats;
create policy community_chats_read on public.community_chats for select to authenticated using (
  exists (select 1 from public.community_chat_members m where m.chat_id = id and m.user_id = auth.uid())
  or (kind in ('group', 'channel') and is_public and not is_system)
  or kind = 'news'
);

drop policy if exists community_members_read on public.community_chat_members;
create policy community_members_read on public.community_chat_members for select to authenticated using (
  user_id = auth.uid()
);

drop policy if exists community_messages_read on public.community_messages;
create policy community_messages_read on public.community_messages for select to authenticated using (
  exists (select 1 from public.community_chat_members m where m.chat_id = public.community_messages.chat_id and m.user_id = auth.uid())
  or exists (
    select 1 from public.community_chats c
    where c.id = chat_id and c.kind in ('group', 'channel') and c.is_public and not c.is_system
  )
  or exists (
    select 1 from public.community_chats c
    where c.id = public.community_messages.chat_id and c.kind = 'news'
  )
);

create or replace function public.community_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
$$;

create or replace function public.community_start_direct(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid := auth.uid();
  v_key text;
  v_chat uuid;
begin
  if v_me is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_user_id is null or p_user_id = v_me then raise exception 'INVALID_RECIPIENT'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then raise exception 'PROFILE_NOT_FOUND'; end if;
  v_key := least(v_me::text, p_user_id::text) || ':' || greatest(v_me::text, p_user_id::text);
  insert into public.community_chats(kind, title, is_public, owner_id, direct_key)
  values ('direct', '', false, v_me, v_key)
  on conflict (direct_key) do update set updated_at = now()
  returning id into v_chat;
  insert into public.community_chat_members(chat_id, user_id, role, added_by)
  values (v_chat, v_me, 'member', v_me), (v_chat, p_user_id, 'member', v_me)
  on conflict (chat_id, user_id) do nothing;
  return v_chat;
end
$$;

create or replace function public.community_create_chat(
  p_kind text,
  p_title text,
  p_description text default '',
  p_is_public boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_chat uuid;
  v_title text := trim(coalesce(p_title, ''));
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_kind not in ('group', 'channel') then raise exception 'INVALID_CHAT_KIND'; end if;
  if length(v_title) < 2 or length(v_title) > 80 then raise exception 'INVALID_CHAT_TITLE'; end if;
  insert into public.community_chats(kind, title, description, is_public, owner_id)
  values (p_kind, v_title, left(trim(coalesce(p_description, '')), 500), coalesce(p_is_public, false), v_user)
  returning id into v_chat;
  insert into public.community_chat_members(chat_id, user_id, role, added_by)
  values (v_chat, v_user, 'owner', v_user);
  return v_chat;
end
$$;

create or replace function public.community_join_public_chat(p_chat_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from public.community_chats
    where id = p_chat_id and kind in ('group', 'channel') and is_public and not is_system
  ) then raise exception 'CHAT_NOT_PUBLIC'; end if;
  insert into public.community_chat_members(chat_id, user_id, role, added_by)
  values (p_chat_id, v_user, 'member', v_user)
  on conflict (chat_id, user_id) do nothing;
  return true;
end
$$;

create or replace function public.community_add_member(p_chat_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_kind text;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_user_id is null or not exists (select 1 from public.profiles where id = p_user_id) then raise exception 'PROFILE_NOT_FOUND'; end if;
  select kind into v_kind from public.community_chats where id = p_chat_id;
  if v_kind not in ('group', 'channel') then raise exception 'CHAT_CANNOT_ADD_MEMBERS'; end if;
  if not exists (
    select 1 from public.community_chat_members
    where chat_id = p_chat_id and user_id = v_user and role in ('owner', 'admin')
  ) then raise exception 'NOT_CHAT_ADMIN'; end if;
  insert into public.community_chat_members(chat_id, user_id, role, added_by)
  values (p_chat_id, p_user_id, 'member', v_user)
  on conflict (chat_id, user_id) do nothing;
  return true;
end
$$;

create or replace function public.community_create_invite(p_chat_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_token uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from public.community_chat_members
    where chat_id = p_chat_id and user_id = v_user and role in ('owner', 'admin')
  ) then raise exception 'NOT_CHAT_ADMIN'; end if;
  if not exists (select 1 from public.community_chats where id = p_chat_id and kind in ('group', 'channel') and not is_system) then
    raise exception 'CHAT_CANNOT_INVITE';
  end if;
  insert into public.community_invites(chat_id, created_by) values (p_chat_id, v_user) returning token into v_token;
  return v_token;
end
$$;

create or replace function public.community_accept_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_chat uuid;
  v_uses integer;
  v_expiry timestamptz;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select chat_id, uses_remaining, expires_at into v_chat, v_uses, v_expiry
  from public.community_invites where token = p_token for update;
  if v_chat is null or v_uses <= 0 or v_expiry <= now() then raise exception 'INVITE_EXPIRED'; end if;
  insert into public.community_chat_members(chat_id, user_id, role, added_by)
  select v_chat, v_user, 'member', created_by from public.community_invites where token = p_token
  on conflict (chat_id, user_id) do nothing;
  update public.community_invites set uses_remaining = greatest(0, uses_remaining - 1) where token = p_token;
  return v_chat;
end
$$;

create or replace function public.community_search_users(p_query text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_user uuid := auth.uid(); v_rows jsonb;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_query, ''))) < 2 then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id, 'username', q.username, 'first_name', q.first_name, 'last_name', q.last_name
  ) order by q.username), '[]'::jsonb)
  into v_rows
  from (
    select id, username, first_name, last_name
    from public.profiles
    where id <> v_user
      and username is not null
      and (username ilike '%' || left(trim(p_query), 40) || '%'
        or first_name ilike '%' || left(trim(p_query), 40) || '%'
        or last_name ilike '%' || left(trim(p_query), 40) || '%')
    order by username
    limit 20
  ) q;
  return v_rows;
end
$$;

create or replace function public.community_chat_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_rows jsonb;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select coalesce(jsonb_agg(to_jsonb(q) order by q.last_message_at desc nulls last, q.created_at desc), '[]'::jsonb)
  into v_rows
  from (
    select c.id, c.kind, c.title, c.description, c.is_public, c.owner_id, c.created_at, c.last_message_at,
      m.role as my_role, (m.user_id is not null) as is_member,
      last.body as last_body, last.resource_title as last_resource_title, last.sender_name as last_sender,
      peer.id as peer_id, peer.username as peer_username,
      trim(coalesce(peer.first_name, '') || ' ' || coalesce(peer.last_name, '')) as peer_name,
      (select count(*) from public.community_messages unread
        where unread.chat_id = c.id and unread.created_at > coalesce(m.last_read_at, '-infinity'::timestamptz)
          and unread.sender_id is distinct from v_user) as unread_count
    from public.community_chats c
    left join public.community_chat_members m on m.chat_id = c.id and m.user_id = v_user
    left join lateral (
      select body, resource_title, sender_name from public.community_messages
      where chat_id = c.id order by created_at desc limit 1
    ) last on true
    left join lateral (
      select p.id, p.username, p.first_name, p.last_name
      from public.community_chat_members other_member
      join public.profiles p on p.id = other_member.user_id
      where c.kind = 'direct' and other_member.chat_id = c.id and other_member.user_id <> v_user
      limit 1
    ) peer on true
    where m.user_id is not null
      or c.kind = 'news'
  ) q;
  return v_rows;
end
$$;

create or replace function public.community_public_list()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_user uuid := auth.uid(); v_rows jsonb;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select coalesce(jsonb_agg(to_jsonb(q) order by q.member_count desc, q.title), '[]'::jsonb)
  into v_rows
  from (
    select c.id, c.kind, c.title, c.description, c.is_public,
      exists(select 1 from public.community_chat_members mine where mine.chat_id = c.id and mine.user_id = v_user) as is_member,
      (select count(*) from public.community_chat_members members where members.chat_id = c.id) as member_count
    from public.community_chats c
    where c.kind in ('group', 'channel') and c.is_public and not c.is_system
  ) q;
  return v_rows;
end
$$;

create or replace function public.community_chat_history(p_chat_id uuid, p_limit integer default 60)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_user uuid := auth.uid(); v_rows jsonb; v_limit integer := least(greatest(coalesce(p_limit, 60), 1), 100);
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (
    select 1 from public.community_chat_members where chat_id = p_chat_id and user_id = v_user
  ) and not exists (
    select 1 from public.community_chats c
    where c.id = p_chat_id and c.kind in ('group', 'channel') and c.is_public and not c.is_system
  ) and not exists (
    select 1 from public.community_chats c
    where c.id = p_chat_id and c.kind = 'news'
  ) then raise exception 'CHAT_ACCESS_DENIED'; end if;
  select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at), '[]'::jsonb)
  into v_rows
  from (
    select m.id, m.chat_id, m.sender_id, m.sender_name, m.sender_username, m.body,
      m.resource_kind, m.resource_id, m.resource_title, m.resource_data, m.created_at
    from public.community_messages m
    where m.chat_id = p_chat_id
    order by m.created_at desc
    limit v_limit
  ) q;
  return v_rows;
end
$$;

create or replace function public.community_chat_members_list(p_chat_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare v_user uuid := auth.uid(); v_rows jsonb;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.community_chat_members where chat_id = p_chat_id and user_id = v_user)
    and not exists (select 1 from public.community_chats where id = p_chat_id and kind in ('group', 'channel') and is_public)
    then raise exception 'CHAT_ACCESS_DENIED'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'username', p.username, 'first_name', p.first_name, 'last_name', p.last_name, 'role', m.role
  ) order by case when m.role = 'owner' then 0 when m.role = 'admin' then 1 else 2 end, p.username), '[]'::jsonb)
  into v_rows
  from public.community_chat_members m join public.profiles p on p.id = m.user_id
  where m.chat_id = p_chat_id;
  return v_rows;
end
$$;

create or replace function public.community_send_message(
  p_chat_id uuid,
  p_body text default '',
  p_resource_kind text default null,
  p_resource_id text default null,
  p_resource_title text default null,
  p_resource_data jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_kind text;
  v_message uuid;
  v_sender_name text;
  v_username text;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select kind into v_kind from public.community_chats where id = p_chat_id;
  if v_kind is null then raise exception 'CHAT_NOT_FOUND'; end if;
  if v_kind = 'news' then
    if not public.community_is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
  elsif not exists (select 1 from public.community_chat_members where chat_id = p_chat_id and user_id = v_user) then
    raise exception 'NOT_CHAT_MEMBER';
  end if;
  if length(coalesce(p_body, '')) > 8000 then raise exception 'MESSAGE_TOO_LONG'; end if;
  if p_resource_kind is not null and p_resource_kind not in ('course', 'test', 'course_category', 'test_category') then raise exception 'INVALID_RESOURCE_KIND'; end if;
  if nullif(trim(coalesce(p_body, '')), '') is null and p_resource_kind is null then raise exception 'EMPTY_MESSAGE'; end if;
  select coalesce(nullif(trim(first_name || ' ' || last_name), ''), username, 'Foydalanuvchi'), coalesce(username, '')
    into v_sender_name, v_username from public.profiles where id = v_user;
  insert into public.community_messages(chat_id, sender_id, sender_name, sender_username, body, resource_kind, resource_id, resource_title, resource_data)
  values (p_chat_id, v_user, v_sender_name, v_username, coalesce(p_body, ''), p_resource_kind, p_resource_id, p_resource_title, p_resource_data)
  returning id into v_message;
  update public.community_chats set last_message_at = now(), updated_at = now() where id = p_chat_id;
  return v_message;
end
$$;

create or replace function public.community_mark_read(p_chat_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.community_chat_members set last_read_at = now()
  where chat_id = p_chat_id and user_id = auth.uid();
  return found;
end
$$;

-- The News channel is visible to signed-in users; only admins may publish.
insert into public.community_chats(kind, title, description, is_public, is_system, system_key)
values ('news', 'News', 'UpCourse platformasi e’lonlari', false, true, 'news')
on conflict (system_key) do nothing;

do $$
declare v_news_id uuid;
begin
  select id into v_news_id from public.community_chats where system_key = 'news';
  if to_regclass('public.news') is not null then
    insert into public.community_messages(chat_id, sender_id, sender_name, body, created_at)
    select v_news_id, null, 'UpCourse Uz', concat_ws(E'\n\n', nullif(trim(n.title), ''), nullif(trim(n.content), '')),
      coalesce(nullif(n.date::text, '')::timestamptz, now())
    from public.news n
    where length(trim(coalesce(n.title, '') || coalesce(n.content, ''))) > 0;
  end if;
end
$$;

revoke all on function public.community_is_admin() from public, anon;
grant execute on function public.community_is_admin() to authenticated;
revoke all on function public.community_start_direct(uuid) from public, anon;
grant execute on function public.community_start_direct(uuid) to authenticated;
revoke all on function public.community_create_chat(text, text, text, boolean) from public, anon;
grant execute on function public.community_create_chat(text, text, text, boolean) to authenticated;
revoke all on function public.community_join_public_chat(uuid) from public, anon;
grant execute on function public.community_join_public_chat(uuid) to authenticated;
revoke all on function public.community_add_member(uuid, uuid) from public, anon;
grant execute on function public.community_add_member(uuid, uuid) to authenticated;
revoke all on function public.community_create_invite(uuid) from public, anon;
grant execute on function public.community_create_invite(uuid) to authenticated;
revoke all on function public.community_accept_invite(uuid) from public, anon;
grant execute on function public.community_accept_invite(uuid) to authenticated;
revoke all on function public.community_search_users(text) from public, anon;
grant execute on function public.community_search_users(text) to authenticated;
revoke all on function public.community_chat_list() from public, anon;
grant execute on function public.community_chat_list() to authenticated;
revoke all on function public.community_public_list() from public, anon;
grant execute on function public.community_public_list() to authenticated;
revoke all on function public.community_chat_history(uuid, integer) from public, anon;
grant execute on function public.community_chat_history(uuid, integer) to authenticated;
revoke all on function public.community_chat_members_list(uuid) from public, anon;
grant execute on function public.community_chat_members_list(uuid) to authenticated;
revoke all on function public.community_send_message(uuid, text, text, text, text, jsonb) from public, anon;
grant execute on function public.community_send_message(uuid, text, text, text, text, jsonb) to authenticated;
revoke all on function public.community_mark_read(uuid) from public, anon;
grant execute on function public.community_mark_read(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.community_messages;
    exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.community_chats;
    exception when duplicate_object then null; end;
  end if;
end
$$;
