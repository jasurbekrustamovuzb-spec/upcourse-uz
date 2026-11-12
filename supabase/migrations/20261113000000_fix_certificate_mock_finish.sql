-- Repair certificate issuance on Supabase projects where pgcrypto is not in search_path.
-- gen_random_uuid() is provided by PostgreSQL and avoids the missing gen_random_bytes(integer) error.
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

