-- Show a learner's real name in Arena leaderboards, with username as fallback.
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
    'name', coalesce(nullif(trim(concat_ws(' ', pr.first_name, pr.last_name)), ''), nullif(pr.username, ''), 'Arena ishtirokchisi')
  ) order by v.place),'[]'::jsonb)
  into v_rows
  from (select * from visible order by place limit least(greatest(coalesce(p_limit,100),1),100)) v
  left join public.profiles pr on pr.id=v.user_id;
  return jsonb_build_object('period',v_period,'month',v_month,'participants',coalesce(v_total,0),'rows',v_rows);
end
$$;

create or replace function public.daily_arena_mode_leaderboard(
  p_period text default 'day',
  p_division text default null,
  p_limit integer default 100,
  p_mode text default 'all'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_today date := (now() at time zone 'Asia/Tashkent')::date;
  v_month date := date_trunc('month', (now() at time zone 'Asia/Tashkent'))::date;
  v_period text := case when p_period = 'day' then 'day' else 'month' end;
  v_mode text := lower(coalesce(nullif(trim(p_mode), ''), 'all'));
  v_rollout date;
  v_rows jsonb;
  v_total bigint;
begin
  if v_mode not in ('all', 'pattern', 'logic', 'word', 'visual', 'matching', 'calculation', 'fact', 'cipher', 'attention') then
    raise exception 'INVALID_ARENA_MODE';
  end if;

  select extended_modes_from into v_rollout
  from public.daily_arena_config where id = true;

  with period_totals as materialized (
    select p.user_id, sum(p.score)::bigint points, min(p.completed_at) completed
    from public.daily_arena_progress p
    where ((v_period = 'day' and p.challenge_date = v_today)
        or (v_period = 'month' and p.challenge_date >= v_month and p.challenge_date < (v_month + interval '1 month')::date)
      )
      and (
        v_mode = 'all'
        or case
          when v_rollout is not null and p.challenge_date >= v_rollout then
            (array['pattern','logic','word','visual','matching','calculation','fact','cipher','attention'])[
              mod(p.challenge_date - v_rollout, 9) + 1
            ]
          else
            (array['pattern','logic','word','visual','matching'])[
              mod(greatest(p.challenge_date - date '2026-09-30', 0), 5) + 1
            ]
        end = v_mode
      )
    group by p.user_id
  ), monthly_totals as materialized (
    select p.user_id, sum(p.score)::bigint season_points
    from public.daily_arena_progress p
    where p.challenge_date >= v_month
      and p.challenge_date < (v_month + interval '1 month')::date
    group by p.user_id
  ), ranked as (
    select t.*, row_number() over (order by t.points desc, t.completed asc nulls last, t.user_id) place,
      public.daily_arena_division(coalesce(m.season_points, 0)) division
    from period_totals t
    left join monthly_totals m on m.user_id = t.user_id
  ), visible as (
    select r.* from ranked r
    where p_division is null or r.division = p_division
  ), leaderboard_rows as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'rank', v.place,
      'user_id', v.user_id,
      'division', v.division,
      'points', v.points,
      'name', coalesce(nullif(trim(concat_ws(' ', pr.first_name, pr.last_name)), ''), nullif(pr.username, ''), 'Arena ishtirokchisi')
    ) order by v.place), '[]'::jsonb) rows
    from (select * from visible order by place limit least(greatest(coalesce(p_limit, 100), 1), 100)) v
    left join public.profiles pr on pr.id = v.user_id
  )
  select (select count(*) from period_totals), leaderboard_rows.rows
    into v_total, v_rows
  from leaderboard_rows;

  return jsonb_build_object(
    'period', v_period,
    'mode', v_mode,
    'month', v_month,
    'participants', coalesce(v_total, 0),
    'rows', coalesce(v_rows, '[]'::jsonb)
  );
end
$$;

revoke all on function public.daily_arena_leaderboard(text, text, integer) from public;
grant execute on function public.daily_arena_leaderboard(text, text, integer) to anon, authenticated;
revoke all on function public.daily_arena_mode_leaderboard(text, text, integer, text) from public;
grant execute on function public.daily_arena_mode_leaderboard(text, text, integer, text) to anon, authenticated;
