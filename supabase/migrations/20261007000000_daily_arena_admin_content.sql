-- Admin-authored Daily Arena content. Existing generated challenges remain the fallback.
create table if not exists public.daily_arena_content (
  challenge_date date primary key,
  title text not null check (length(btrim(title)) between 1 and 120),
  subtitle text not null default '' check (length(subtitle) <= 240),
  mode text not null check (mode in ('pattern','logic','word','visual','matching','calculation','fact','cipher','attention')),
  rounds jsonb not null check (jsonb_typeof(rounds) = 'array' and jsonb_array_length(rounds) = 5),
  answer_key jsonb not null check (jsonb_typeof(answer_key) = 'array' and jsonb_array_length(answer_key) = 5),
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.daily_arena_content enable row level security;
revoke all on table public.daily_arena_content from anon, authenticated;

create or replace function public.daily_arena_admin_save_content(
  p_date date,
  p_title text,
  p_subtitle text,
  p_mode text,
  p_rounds jsonb,
  p_answer_key jsonb,
  p_published boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $arena_admin_save$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if p_date is null or length(btrim(coalesce(p_title,''))) not between 1 and 120
     or length(coalesce(p_subtitle,'')) > 240
     or p_mode not in ('pattern','logic','word','visual','matching','calculation','fact','cipher','attention')
     or jsonb_typeof(p_rounds) <> 'array' or jsonb_array_length(p_rounds) <> 5
     or jsonb_typeof(p_answer_key) <> 'array' or jsonb_array_length(p_answer_key) <> 5
     or exists (select 1 from jsonb_array_elements(p_rounds) as r(value)
                where jsonb_typeof(r.value) <> 'object'
                   or nullif(btrim(r.value->>'prompt'),'') is null
                   or r.value->>'kind' not in ('choice','visual','text','match'))
     or exists (select 1 from jsonb_array_elements(p_answer_key) as a(value)
                where jsonb_typeof(a.value) <> 'string' or nullif(btrim(a.value#>>'{}'),'') is null) then
    raise exception 'INVALID_ARENA_CONTENT';
  end if;
  insert into public.daily_arena_content(challenge_date,title,subtitle,mode,rounds,answer_key,published,updated_at)
  values (p_date,btrim(p_title),coalesce(p_subtitle,''),p_mode,p_rounds,p_answer_key,coalesce(p_published,false),now())
  on conflict (challenge_date) do update set
    title=excluded.title, subtitle=excluded.subtitle, mode=excluded.mode,
    rounds=excluded.rounds, answer_key=excluded.answer_key,
    published=excluded.published, updated_at=now();
  return jsonb_build_object('date',p_date,'published',coalesce(p_published,false));
end
$arena_admin_save$;

create or replace function public.daily_arena_admin_list_content()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $arena_admin_list$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'ADMIN_REQUIRED';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(c) order by c.challenge_date desc)
    from public.daily_arena_content c
  ), '[]'::jsonb);
end
$arena_admin_list$;

revoke all on function public.daily_arena_admin_save_content(date,text,text,text,jsonb,jsonb,boolean) from public, anon;
grant execute on function public.daily_arena_admin_save_content(date,text,text,text,jsonb,jsonb,boolean) to authenticated;
revoke all on function public.daily_arena_admin_list_content() from public, anon;
grant execute on function public.daily_arena_admin_list_content() to authenticated;

do $arena_rename$
begin
  if to_regprocedure('public.daily_arena_build_generated_challenge(date)') is null then
    alter function public.daily_arena_build_challenge(date) rename to daily_arena_build_generated_challenge;
  end if;
end
$arena_rename$;

create or replace function public.daily_arena_build_challenge(p_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $arena_build$
declare
  v_content public.daily_arena_content%rowtype;
begin
  select * into v_content
  from public.daily_arena_content
  where challenge_date = p_date and published = true;

  if found then
    return jsonb_build_object(
      'date',v_content.challenge_date,
      'mode',v_content.mode,
      'title',v_content.title,
      'subtitle',v_content.subtitle,
      'rounds',v_content.rounds,
      'answer_key',v_content.answer_key
    );
  end if;

  return public.daily_arena_build_generated_challenge(p_date);
end
$arena_build$;
revoke all on function public.daily_arena_build_challenge(date) from public, anon, authenticated;
