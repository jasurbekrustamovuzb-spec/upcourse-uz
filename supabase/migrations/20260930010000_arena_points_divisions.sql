-- Division progression uses each player's monthly Arena points, not leaderboard position.
-- Safe to run in Supabase SQL Editor after the original daily_arena migration.

create or replace function public.daily_arena_division(p_rank bigint)
returns text language sql immutable set search_path = public, pg_temp
as $$
  select case
    when coalesce(p_rank,0) >= 15000 then 'legend'
    when coalesce(p_rank,0) >= 9000 then 'diamond'
    when coalesce(p_rank,0) >= 5000 then 'platinum'
    when coalesce(p_rank,0) >= 2500 then 'gold'
    when coalesce(p_rank,0) >= 1000 then 'silver'
    else 'bronze'
  end
$$;

create or replace function public.daily_arena_submit_answer(p_stage smallint, p_answer text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_date date := (now() at time zone 'Asia/Tashkent')::date;
  v_challenge jsonb;
  v_expected text;
  v_progress public.daily_arena_progress%rowtype;
  v_try public.daily_arena_stage_attempts%rowtype;
  v_now_count integer;
  v_is_correct boolean;
  v_resolved boolean;
  v_points integer := 0;
  v_base integer[];
  v_next integer;
  v_answers jsonb;
  v_completed boolean;
  v_month date := date_trunc('month',(now() at time zone 'Asia/Tashkent'))::date;
  v_month_points bigint := 0;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  v_challenge := public.daily_arena_build_challenge(v_date);
  v_answers := v_challenge->'answer_key';
  if p_stage < 1 or p_stage > 5 then raise exception 'INVALID_STAGE'; end if;
  insert into public.daily_arena_progress(user_id,challenge_date) values(v_user,v_date)
    on conflict do nothing;
  select * into v_progress from public.daily_arena_progress
    where user_id=v_user and challenge_date=v_date for update;
  if v_progress.completed_at is not null then
    return jsonb_build_object('completed',true,'score',v_progress.score,'next_stage',6,'stage_complete',true);
  end if;
  if p_stage <> v_progress.current_stage then
    return jsonb_build_object('completed',false,'score',v_progress.score,'next_stage',v_progress.current_stage,'stage_complete',false,'message','Boshqa bosqich tanlangan.');
  end if;
  v_expected := lower(btrim(v_answers->>(p_stage-1)));
  insert into public.daily_arena_stage_attempts(user_id,challenge_date,stage)
    values(v_user,v_date,p_stage) on conflict do nothing;
  select * into v_try from public.daily_arena_stage_attempts
    where user_id=v_user and challenge_date=v_date and stage=p_stage for update;
  if v_try.resolved then
    return jsonb_build_object('completed',v_progress.completed_at is not null,'score',v_progress.score,
      'next_stage',v_progress.current_stage,'stage_complete',true,'correct',v_try.solved,
      'points_awarded',0,'attempts_left',0,'correct_answer',v_answers->>(p_stage-1));
  end if;
  v_is_correct := lower(regexp_replace(btrim(coalesce(p_answer,'')),'\s+','','g')) =
                  lower(regexp_replace(v_expected,'\s+','','g'));
  v_now_count := v_try.attempts + 1;
  v_resolved := v_is_correct or v_now_count >= 3;
  if v_is_correct then
    v_base := array[30,60,110,200,360];
    v_points := case v_now_count when 1 then v_base[p_stage] when 2 then (v_base[p_stage]*70)/100 else (v_base[p_stage]*40)/100 end;
  end if;
  update public.daily_arena_stage_attempts set attempts=v_now_count,resolved=v_resolved,solved=v_is_correct,points=v_points
    where user_id=v_user and challenge_date=v_date and stage=p_stage;
  v_next := case when v_resolved then p_stage+1 else p_stage end;
  v_completed := v_next > 5;
  update public.daily_arena_progress set score=score+v_points,current_stage=v_next,
    completed_at=case when v_completed then now() else completed_at end
    where user_id=v_user and challenge_date=v_date returning * into v_progress;

  insert into public.daily_arena_badges(user_id,season_start,badge)
    values(v_user,v_month,'debut') on conflict do nothing;
  select coalesce(sum(score),0)::bigint into v_month_points
    from public.daily_arena_progress
    where user_id=v_user and challenge_date>=v_month and challenge_date<(v_month+interval '1 month')::date;
  insert into public.daily_arena_badges(user_id,season_start,badge)
  select v_user,v_month,b.badge
  from (values ('silver',1000),('gold',2500),('platinum',5000),('diamond',9000),('legend',15000)) as b(badge,minimum_points)
  where v_month_points>=b.minimum_points
  on conflict do nothing;

  return jsonb_build_object(
    'completed',v_completed,'score',v_progress.score,'next_stage',v_next,
    'stage_complete',v_resolved,'correct',v_is_correct,'points_awarded',v_points,
    'attempts_left',greatest(0,3-v_now_count),
    'correct_answer',case when v_resolved then v_expected else null end
  );
end
$$;

create or replace function public.daily_arena_leaderboard(p_period text default 'month',p_division text default null,p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_today date := (now() at time zone 'Asia/Tashkent')::date;
  v_month date := date_trunc('month',(now() at time zone 'Asia/Tashkent'))::date;
  v_period text := case when p_period='day' then 'day' else 'month' end;
  v_rows jsonb;
  v_total bigint;
begin
  with period_totals as (
    select p.user_id,sum(p.score)::bigint points,min(p.completed_at) completed
    from public.daily_arena_progress p
    where (v_period='day' and p.challenge_date=v_today)
       or (v_period='month' and p.challenge_date>=v_month and p.challenge_date<(v_month+interval '1 month')::date)
    group by p.user_id
  ), ranked as (
    select t.*,row_number() over(order by t.points desc,t.completed asc nulls last,t.user_id) place
    from period_totals t
  )
  select count(*) into v_total from ranked;

  with period_totals as (
    select p.user_id,sum(p.score)::bigint points,min(p.completed_at) completed
    from public.daily_arena_progress p
    where (v_period='day' and p.challenge_date=v_today)
       or (v_period='month' and p.challenge_date>=v_month and p.challenge_date<(v_month+interval '1 month')::date)
    group by p.user_id
  ), monthly_totals as (
    select p.user_id,sum(p.score)::bigint season_points
    from public.daily_arena_progress p
    where p.challenge_date>=v_month and p.challenge_date<(v_month+interval '1 month')::date
    group by p.user_id
  ), ranked as (
    select t.*,row_number() over(order by t.points desc,t.completed asc nulls last,t.user_id) place
    from period_totals t
  ), visible as (
    select r.*,public.daily_arena_division(coalesce(m.season_points,0)) division
    from ranked r left join monthly_totals m on m.user_id=r.user_id
    where p_division is null or public.daily_arena_division(coalesce(m.season_points,0))=p_division
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'rank',v.place,'user_id',v.user_id,'division',v.division,'points',v.points,
    'name',coalesce(nullif(pr.username,''),nullif(trim(concat_ws(' ',pr.first_name,pr.last_name)),''),'Arena ishtirokchisi')
  ) order by v.place),'[]'::jsonb)
  into v_rows
  from (select * from visible order by place limit least(greatest(coalesce(p_limit,100),1),100)) v
  left join public.profiles pr on pr.id=v.user_id;
  return jsonb_build_object('period',v_period,'month',v_month,'participants',coalesce(v_total,0),'rows',v_rows);
end
$$;

create or replace function public.daily_arena_get_profile(target_user_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_target uuid := coalesce(target_user_id,auth.uid());
  v_month date := date_trunc('month',(now() at time zone 'Asia/Tashkent'))::date;
  v_points bigint := 0;
  v_rank bigint;
  v_total bigint := 0;
  v_division text := 'bronze';
  v_badges jsonb := '[]'::jsonb;
begin
  if v_target is null then return jsonb_build_object('authenticated',false); end if;
  with totals as (
    select user_id,sum(score)::bigint points,min(completed_at) completed
    from public.daily_arena_progress
    where challenge_date>=v_month and challenge_date<(v_month+interval '1 month')::date
    group by user_id
  ), ranked as (
    select t.*,row_number() over(order by points desc,completed asc nulls last,user_id) place,count(*) over() total
    from totals t
  )
  select points,place,total into v_points,v_rank,v_total from ranked where user_id=v_target;
  v_division:=public.daily_arena_division(v_points);
  select coalesce(jsonb_agg(jsonb_build_object('badge',badge,'season',season_start,'earned_at',earned_at) order by season_start desc,badge),'[]'::jsonb)
    into v_badges from public.daily_arena_badges where user_id=v_target;
  return jsonb_build_object(
    'authenticated',true,'user_id',v_target,'month',v_month,'points',coalesce(v_points,0),
    'rank',v_rank,'participants',coalesce(v_total,0),'division',v_division,'badges',v_badges
  );
end
$$;

-- Old preview versions granted divisions by leaderboard position. Rebuild those souvenirs from monthly points.
delete from public.daily_arena_badges
where badge in ('silver','gold','platinum','diamond','legend');

with monthly_totals as (
  select user_id,date_trunc('month',challenge_date)::date season_start,sum(score)::bigint points
  from public.daily_arena_progress
  group by user_id,date_trunc('month',challenge_date)::date
)
insert into public.daily_arena_badges(user_id,season_start,badge)
select m.user_id,m.season_start,b.badge
from monthly_totals m
cross join (values ('silver',1000),('gold',2500),('platinum',5000),('diamond',9000),('legend',15000)) as b(badge,minimum_points)
where m.points>=b.minimum_points
on conflict do nothing;

revoke all on function public.daily_arena_division(bigint) from public, anon, authenticated;
revoke all on function public.daily_arena_submit_answer(smallint,text) from public, anon;
grant execute on function public.daily_arena_submit_answer(smallint,text) to authenticated;
revoke all on function public.daily_arena_leaderboard(text,text,integer) from public;
grant execute on function public.daily_arena_leaderboard(text,text,integer) to anon, authenticated;
revoke all on function public.daily_arena_get_profile(uuid) from public;
grant execute on function public.daily_arena_get_profile(uuid) to anon, authenticated;
