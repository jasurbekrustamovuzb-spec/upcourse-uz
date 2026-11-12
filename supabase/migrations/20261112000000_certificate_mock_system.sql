-- UpCourse Uz certificate mock exams. Apply manually in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.certificate_mock_exams (
  id uuid primary key default gen_random_uuid(),
  test_id text not null references public.tests(id) on delete restrict,
  subject text not null,
  title text not null,
  duration_minutes integer not null default 180 check (duration_minutes between 1 and 600),
  is_enabled boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.certificate_mock_sessions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.certificate_mock_exams(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','cancelled','closed')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

-- Immutable per-exam question snapshot keeps scoring stable if a source test
-- is edited later. The answer key is never selectable through the client API.
create table if not exists public.certificate_mock_question_sets (
  exam_id uuid primary key references public.certificate_mock_exams(id) on delete cascade,
  questions jsonb not null,
  source_test_id text not null,
  created_at timestamptz not null default now()
);
alter table public.certificate_mock_question_sets enable row level security;
revoke all on public.certificate_mock_question_sets from public,anon,authenticated;

create or replace function public._certificate_mock_snapshot_questions()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare question_data jsonb;
begin
  select t.questions into question_data from public.tests t where t.id=new.test_id;
  if question_data is null or jsonb_typeof(question_data)<>'array' or jsonb_array_length(question_data)=0 then
    raise exception 'TEST_QUESTION_SET_EMPTY';
  end if;
  insert into public.certificate_mock_question_sets(exam_id,questions,source_test_id) values(new.id,question_data,new.test_id);
  return new;
end $$;
drop trigger if exists certificate_mock_snapshot_questions on public.certificate_mock_exams;
create trigger certificate_mock_snapshot_questions after insert on public.certificate_mock_exams
  for each row execute function public._certificate_mock_snapshot_questions();

create table if not exists public.certificate_mock_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.certificate_mock_exams(id) on delete restrict,
  session_id uuid references public.certificate_mock_sessions(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  status text not null default 'in_progress' check (status in ('in_progress','paused','submitted','expired')),
  answers jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  active_seconds integer not null default 0 check (active_seconds >= 0),
  resumed_at timestamptz,
  paused_at timestamptz,
  submitted_at timestamptz,
  score numeric(5,2),
  correct_count integer,
  total_count integer,
  grade text,
  certificate_id text unique,
  created_at timestamptz not null default now(),
  check ((session_id is null) or (status <> 'in_progress' or resumed_at is not null))
);

-- Shared certificate register so later course certificates use the same verifier.
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_id text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  issuer text not null default 'UpCourse Uz',
  certificate_type text not null,
  title text not null,
  subject text,
  score numeric(6,2),
  grade text,
  status text not null default 'valid' check (status in ('valid','revoked')),
  issued_at timestamptz not null default now(),
  source_id text,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists certificates_owner_issued on public.certificates(user_id,issued_at desc);
alter table public.certificates enable row level security;
drop policy if exists certificates_read_own on public.certificates;
create policy certificates_read_own on public.certificates for select to authenticated using (user_id=auth.uid());
drop policy if exists certificates_admin_read on public.certificates;
create policy certificates_admin_read on public.certificates for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_admin));
create table if not exists public.certificate_events (
  id uuid primary key default gen_random_uuid(),
  certificate_id text not null,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  reason text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists certificate_events_lookup on public.certificate_events(certificate_id,created_at desc);
alter table public.certificate_events enable row level security;
drop policy if exists certificate_events_admin_read on public.certificate_events;
create policy certificate_events_admin_read on public.certificate_events for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_admin));

create unique index if not exists certificate_mock_one_attempt_per_session
  on public.certificate_mock_attempts(session_id, user_id) where session_id is not null;
create index if not exists certificate_mock_attempts_user_created
  on public.certificate_mock_attempts(user_id, created_at desc);
create index if not exists certificate_mock_sessions_schedule
  on public.certificate_mock_sessions(starts_at, ends_at) where status = 'scheduled';

alter table public.certificate_mock_exams enable row level security;
alter table public.certificate_mock_sessions enable row level security;
alter table public.certificate_mock_attempts enable row level security;

drop policy if exists certificate_mock_exams_read on public.certificate_mock_exams;
create policy certificate_mock_exams_read on public.certificate_mock_exams for select to authenticated
  using (is_enabled or exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_admin));
drop policy if exists certificate_mock_exams_admin_write on public.certificate_mock_exams;
create policy certificate_mock_exams_admin_write on public.certificate_mock_exams for all to authenticated
  using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_admin));

drop policy if exists certificate_mock_sessions_read on public.certificate_mock_sessions;
create policy certificate_mock_sessions_read on public.certificate_mock_sessions for select to authenticated
  using (exists (select 1 from public.certificate_mock_exams e where e.id=exam_id and e.is_enabled)
    or exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_admin));
drop policy if exists certificate_mock_sessions_admin_write on public.certificate_mock_sessions;
create policy certificate_mock_sessions_admin_write on public.certificate_mock_sessions for all to authenticated
  using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_admin));

drop policy if exists certificate_mock_attempts_read_own on public.certificate_mock_attempts;
create policy certificate_mock_attempts_read_own on public.certificate_mock_attempts for select to authenticated using (user_id=auth.uid());
drop policy if exists certificate_mock_attempts_admin_read on public.certificate_mock_attempts;
create policy certificate_mock_attempts_admin_read on public.certificate_mock_attempts for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_admin));

grant select,insert,update,delete on public.certificate_mock_exams to authenticated;
grant select,insert,update,delete on public.certificate_mock_sessions to authenticated;
grant select on public.certificate_mock_attempts to authenticated;
grant select on public.certificates,public.certificate_events to authenticated;

create or replace function public._certificate_mock_grade(p_attempt_id uuid, p_expired boolean default false)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  a public.certificate_mock_attempts%rowtype;
  e public.certificate_mock_exams%rowtype;
  question_data jsonb;
  q jsonb;
  pair jsonb;
  answer jsonb;
  n integer := 0;
  correct integer := 0;
  pct numeric(5,2);
  grade_value text;
  cert text;
begin
  select * into a from public.certificate_mock_attempts where id=p_attempt_id for update;
  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if a.status in ('submitted','expired') then return to_jsonb(a); end if;
  select * into e from public.certificate_mock_exams where id=a.exam_id;
  select questions into question_data from public.certificate_mock_question_sets where exam_id=e.id;
  for q in select value from jsonb_array_elements(coalesce(question_data,'[]'::jsonb)) loop
    answer := a.answers -> (q->>'id');
    if q->>'type' = 'matching' then
      for pair in select value from jsonb_array_elements(coalesce(q->'pairs','[]'::jsonb)) loop
        n := n + 1;
        if answer ->> (pair->>'id') = pair->>'correct' then correct := correct + 1; end if;
      end loop;
    else
      n := n + 1;
    end if;
    if q->>'type' = 'matching' then
      continue;
    elsif q->>'type' = 'open' then
      if lower(regexp_replace(trim(coalesce(answer #>> '{}','')), '\s+', '', 'g')) = any (
        select lower(regexp_replace(trim(vals.value), '\s+', '', 'g')) from jsonb_array_elements_text(coalesce(q->'answers','[]'::jsonb)) as vals(value)
      ) then correct := correct + 1; end if;
    else
      if answer is not null and (answer #>> '{}') = (q->>'correct') then correct := correct + 1; end if;
    end if;
  end loop;
  pct := case when n=0 then 0 else round(correct::numeric * 100 / n, 2) end;
  grade_value := case when pct > 70 then 'A+' when pct >= 65 then 'A' when pct >= 60 then 'B+'
    when pct >= 55 then 'B' when pct >= 50 then 'C+' when pct >= 46 then 'C' else null end;
  cert := case when grade_value is not null then 'UC-MOCK-' || upper(left(replace(gen_random_uuid()::text, '-', ''), 16)) else null end;
  update public.certificate_mock_attempts set status=case when p_expired then 'expired' else 'submitted' end,
    submitted_at=now(), resumed_at=null, paused_at=null, score=pct, correct_count=correct, total_count=n,
    grade=grade_value, certificate_id=cert where id=p_attempt_id returning * into a;
  if cert is not null then
    insert into public.certificates(certificate_id,user_id,full_name,certificate_type,title,subject,score,grade,issued_at,source_id,metadata)
      values(cert,a.user_id,a.full_name,'mock_exam',e.title,e.subject,pct,grade_value,a.submitted_at,a.id::text,
        jsonb_build_object('mock',true,'correct_count',correct,'total_count',n,'assessment_method','fixed_percentage_v1'));
  end if;
  return to_jsonb(a);
end $$;

create or replace function public.certificate_mock_begin(p_exam_id uuid, p_session_id uuid, p_full_name text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid := auth.uid(); a public.certificate_mock_attempts%rowtype; e public.certificate_mock_exams%rowtype; s public.certificate_mock_sessions%rowtype;
begin
  if u is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_full_name,''))) < 3 then raise exception 'FULL_NAME_REQUIRED'; end if;
  select * into e from public.certificate_mock_exams where id=p_exam_id and is_enabled;
  if not found then raise exception 'EXAM_UNAVAILABLE'; end if;
  if p_session_id is not null then
    select * into s from public.certificate_mock_sessions where id=p_session_id and exam_id=e.id and status='scheduled';
    if not found or now() < s.starts_at or now() >= s.ends_at then raise exception 'SESSION_CLOSED'; end if;
    select * into a from public.certificate_mock_attempts where session_id=s.id and user_id=u for update;
    if found then
      if a.status in ('submitted','expired') then raise exception 'ATTEMPT_ALREADY_FINISHED'; end if;
      if a.status='paused' then update public.certificate_mock_attempts set status='in_progress',resumed_at=now() where id=a.id returning * into a; end if;
      return jsonb_build_object('attempt',to_jsonb(a),'exam',to_jsonb(e),'session',to_jsonb(s));
    end if;
  end if;
  insert into public.certificate_mock_attempts(exam_id,session_id,user_id,full_name,status,resumed_at)
    values(e.id,p_session_id,u,trim(p_full_name),'in_progress',now()) returning * into a;
  return jsonb_build_object('attempt',to_jsonb(a),'exam',to_jsonb(e),'session',case when p_session_id is null then null else to_jsonb(s) end);
end $$;

create or replace function public.certificate_mock_resume(p_attempt_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.certificate_mock_attempts%rowtype; e public.certificate_mock_exams%rowtype; s public.certificate_mock_sessions%rowtype;
begin
  select * into a from public.certificate_mock_attempts where id=p_attempt_id and user_id=auth.uid() for update;
  if not found or a.status not in ('in_progress','paused') then raise exception 'ATTEMPT_NOT_AVAILABLE'; end if;
  select * into e from public.certificate_mock_exams where id=a.exam_id;
  if not found then raise exception 'EXAM_UNAVAILABLE'; end if;
  if a.session_id is not null then
    select * into s from public.certificate_mock_sessions where id=a.session_id;
    if not found or now()<s.starts_at or now()>=s.ends_at or s.status <> 'scheduled' then raise exception 'SESSION_CLOSED'; end if;
  end if;
  if a.status='paused' then
    update public.certificate_mock_attempts set status='in_progress',resumed_at=now(),paused_at=null where id=a.id returning * into a;
  end if;
  return jsonb_build_object('attempt',to_jsonb(a),'exam',to_jsonb(e),'session',case when a.session_id is null then null else to_jsonb(s) end);
end $$;

create or replace function public.certificate_mock_save(p_attempt_id uuid, p_answers jsonb, p_pause boolean default false)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.certificate_mock_attempts%rowtype; e public.certificate_mock_exams%rowtype; s public.certificate_mock_sessions%rowtype; elapsed integer;
begin
  select * into a from public.certificate_mock_attempts where id=p_attempt_id and user_id=auth.uid() for update;
  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if a.status in ('submitted','expired') then raise exception 'ATTEMPT_ALREADY_FINISHED'; end if;
  select * into e from public.certificate_mock_exams where id=a.exam_id;
  elapsed := a.active_seconds + case when a.status='in_progress' and a.resumed_at is not null then greatest(0,extract(epoch from now()-a.resumed_at)::integer) else 0 end;
  if a.session_id is not null then
    select * into s from public.certificate_mock_sessions where id=a.session_id;
    if now() >= s.ends_at then raise exception 'SESSION_CLOSED'; end if;
  end if;
  if elapsed >= e.duration_minutes*60 then raise exception 'TIME_EXPIRED'; end if;
  update public.certificate_mock_attempts set answers=coalesce(p_answers,'{}'::jsonb), active_seconds=case when p_pause then elapsed else active_seconds end,
    status=case when p_pause then 'paused' else 'in_progress' end,
    paused_at=case when p_pause then now() else null end,
    resumed_at=case when p_pause then null else coalesce(resumed_at,now()) end
    where id=a.id returning * into a;
  return to_jsonb(a);
end $$;

create or replace function public.certificate_mock_finish(p_attempt_id uuid, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.certificate_mock_attempts%rowtype; e public.certificate_mock_exams%rowtype; s public.certificate_mock_sessions%rowtype; elapsed integer;
begin
  select * into a from public.certificate_mock_attempts where id=p_attempt_id and user_id=auth.uid() for update;
  if not found then raise exception 'ATTEMPT_NOT_FOUND'; end if;
  if a.status in ('submitted','expired') then return to_jsonb(a); end if;
  select * into e from public.certificate_mock_exams where id=a.exam_id;
  elapsed := a.active_seconds + case when a.status='in_progress' and a.resumed_at is not null then greatest(0,extract(epoch from now()-a.resumed_at)::integer) else 0 end;
  if a.session_id is not null then select * into s from public.certificate_mock_sessions where id=a.session_id; end if;
  update public.certificate_mock_attempts set answers=case when elapsed >= e.duration_minutes*60 or (a.session_id is not null and now() >= s.ends_at) then a.answers else coalesce(p_answers,'{}'::jsonb) end,active_seconds=least(elapsed,e.duration_minutes*60) where id=a.id;
  return public._certificate_mock_grade(a.id,false);
end $$;

create or replace function public.certificate_mock_verify(p_certificate_id text)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select jsonb_build_object('valid',c.status='valid','certificate_id',c.certificate_id,'full_name',c.full_name,'subject',c.subject,
    'exam_title',c.title,'score',c.score,'grade',c.grade,'issued_at',c.issued_at,'mock',c.certificate_type='mock_exam','issuer',c.issuer)
  from public.certificates c where upper(c.certificate_id)=upper(trim(p_certificate_id))
$$;

create or replace function public.certificate_revoke(p_certificate_id text, p_reason text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.certificates%rowtype;
begin
  if auth.uid() is null or not exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_admin) then raise exception 'ADMIN_REQUIRED'; end if;
  if length(trim(coalesce(p_reason,''))) < 5 then raise exception 'REVOCATION_REASON_REQUIRED'; end if;
  update public.certificates set status='revoked' where upper(certificate_id)=upper(trim(p_certificate_id)) and status='valid' returning * into c;
  if not found then raise exception 'CERTIFICATE_NOT_FOUND_OR_REVOKED'; end if;
  insert into public.certificate_events(certificate_id,actor_id,event_type,reason,metadata)
    values(c.certificate_id,auth.uid(),'revoked',trim(p_reason),jsonb_build_object('type',c.certificate_type,'source_id',c.source_id));
  return jsonb_build_object('certificate_id',c.certificate_id,'status',c.status);
end $$;

create or replace function public.certificate_mock_finalize_expired()
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare a record; n integer := 0;
begin
  for a in select a.id from public.certificate_mock_attempts a
    left join public.certificate_mock_sessions s on s.id=a.session_id
    join public.certificate_mock_exams e on e.id=a.exam_id
    where a.status in ('in_progress','paused') and (
      (a.session_id is not null and s.ends_at <= now()) or
      (a.active_seconds + case when a.status='in_progress' and a.resumed_at is not null then extract(epoch from now()-a.resumed_at)::integer else 0 end >= e.duration_minutes*60)
    )
  loop
    perform public._certificate_mock_grade(a.id,true); n := n+1;
  end loop;
  return n;
end $$;

create or replace function public.certificate_mock_get_questions(p_attempt_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare a public.certificate_mock_attempts%rowtype; e public.certificate_mock_exams%rowtype; question_data jsonb; safe_questions jsonb;
begin
  select * into a from public.certificate_mock_attempts where id=p_attempt_id and user_id=auth.uid();
  if not found or a.status not in ('in_progress','paused') then raise exception 'ATTEMPT_NOT_AVAILABLE'; end if;
  if a.session_id is not null and exists(select 1 from public.certificate_mock_sessions s where s.id=a.session_id and (now()<s.starts_at or now()>=s.ends_at)) then raise exception 'SESSION_CLOSED'; end if;
  select * into e from public.certificate_mock_exams where id=a.exam_id;
  select questions into question_data from public.certificate_mock_question_sets where exam_id=e.id;
  select coalesce(jsonb_agg(case when value->>'type'='matching' then
    jsonb_set(value - 'correct','{pairs}',coalesce((select jsonb_agg(pair_value - 'correct' order by pair_ord) from jsonb_array_elements(coalesce(value->'pairs','[]'::jsonb)) with ordinality as pair_rows(pair_value,pair_ord)),'[]'::jsonb),true)
    else value - 'correct' - 'answers' - 'answer' end order by ord),'[]'::jsonb) into safe_questions
    from jsonb_array_elements(coalesce(question_data,'[]'::jsonb)) with ordinality as questions(value,ord);
  return safe_questions;
end $$;

revoke all on function public._certificate_mock_grade(uuid,boolean) from public,anon,authenticated;
revoke all on function public.certificate_mock_finalize_expired() from public,anon,authenticated;
grant execute on function public.certificate_mock_begin(uuid,uuid,text) to authenticated;
grant execute on function public.certificate_mock_resume(uuid) to authenticated;
grant execute on function public.certificate_mock_save(uuid,jsonb,boolean) to authenticated;
grant execute on function public.certificate_mock_finish(uuid,jsonb) to authenticated;
grant execute on function public.certificate_mock_verify(text) to anon,authenticated;
grant execute on function public.certificate_mock_get_questions(uuid) to authenticated;
grant execute on function public.certificate_revoke(text,text) to authenticated;

-- If pg_cron is enabled in this Supabase project, finalize closed sessions promptly.
do $$ begin
  if exists (select 1 from pg_extension where extname='pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname='upcourse-finalize-certificate-mocks';
    perform cron.schedule('upcourse-finalize-certificate-mocks','* * * * *','select public.certificate_mock_finalize_expired()');
  end if;
exception when undefined_table or insufficient_privilege then null;
end $$;
