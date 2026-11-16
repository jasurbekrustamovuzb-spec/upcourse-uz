-- Per-message read receipts: unread counts stay accurate when a user
-- reads only part of a conversation, and are persisted per account.
create table if not exists public.community_message_reads (
  message_id uuid not null references public.community_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists community_message_reads_user_idx
  on public.community_message_reads(user_id, message_id);

alter table public.community_message_reads enable row level security;
revoke all on public.community_message_reads from anon, authenticated;

-- Preserve the read state recorded by the older per-chat cursor.
insert into public.community_message_reads(message_id, user_id, read_at)
select m.id, member.user_id, member.last_read_at
from public.community_messages m
join public.community_chat_members member on member.chat_id = m.chat_id
where m.created_at <= member.last_read_at
  and m.sender_id is distinct from member.user_id
on conflict (message_id, user_id) do nothing;

create or replace function public.community_ensure_news_membership()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.profiles where id = v_user) then return false; end if;

  insert into public.community_chat_members(chat_id, user_id, role)
  select id, v_user, 'member'
  from public.community_chats
  where kind = 'news' and system_key = 'news'
  on conflict (chat_id, user_id) do nothing;

  return found;
end
$$;

revoke all on function public.community_ensure_news_membership() from public, anon;
grant execute on function public.community_ensure_news_membership() to authenticated;

create or replace function public.community_mark_messages_read(p_chat_id uuid, p_message_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_count integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.community_chat_members where chat_id = p_chat_id and user_id = v_user)
    and not exists (
      select 1 from public.community_chats c
      where c.id = p_chat_id and c.kind in ('group', 'channel') and c.is_public and not c.is_system
    )
    and not exists (
      select 1 from public.community_chats c
      where c.id = p_chat_id and c.kind = 'news'
    )
  then raise exception 'CHAT_ACCESS_DENIED'; end if;

  insert into public.community_message_reads(message_id, user_id)
  select m.id, v_user
  from public.community_messages m
  where m.chat_id = p_chat_id
    and m.id = any(coalesce(p_message_ids, array[]::uuid[]))
    and m.sender_id is distinct from v_user
  on conflict (message_id, user_id) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end
$$;

revoke all on function public.community_mark_messages_read(uuid, uuid[]) from public, anon;
grant execute on function public.community_mark_messages_read(uuid, uuid[]) to authenticated;

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
          and unread.sender_id is distinct from v_user
          and not exists (
            select 1 from public.community_message_reads receipt
            where receipt.message_id = unread.id and receipt.user_id = v_user
          )) as unread_count
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


revoke all on function public.community_chat_list() from public, anon;
grant execute on function public.community_chat_list() to authenticated;
