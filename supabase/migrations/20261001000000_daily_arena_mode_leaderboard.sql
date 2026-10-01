-- Rejim bo‘yicha kunlik va oylik Arena reytingi.
-- Asosiy daily_arena_progress jadvalidan foydalanadi; yangi kontent yoki
-- foydalanuvchi ma’lumotlari nusxalanmaydi.

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
  v_rows jsonb;
  v_total bigint;
begin
  if v_mode not in ('all', 'pattern', 'logic', 'word', 'visual', 'matching', 'calculation', 'fact', 'cipher', 'attention') then
    raise exception 'INVALID_ARENA_MODE';
  end if;

  with period_totals as (
    select p.user_id, sum(p.score)::bigint points, min(p.completed_at) completed
    from public.daily_arena_progress p
    where ((v_period = 'day' and p.challenge_date = v_today)
        or (v_period = 'month' and p.challenge_date >= v_month and p.challenge_date < (v_month + interval '1 month')::date)
      )
      and (v_mode = 'all' or public.daily_arena_build_challenge(p.challenge_date)->>'mode' = v_mode)
    group by p.user_id
  )
  select count(*) into v_total from period_totals;

  with period_totals as (
    select p.user_id, sum(p.score)::bigint points, min(p.completed_at) completed
    from public.daily_arena_progress p
    where ((v_period = 'day' and p.challenge_date = v_today)
        or (v_period = 'month' and p.challenge_date >= v_month and p.challenge_date < (v_month + interval '1 month')::date)
      )
      and (v_mode = 'all' or public.daily_arena_build_challenge(p.challenge_date)->>'mode' = v_mode)
    group by p.user_id
  ), monthly_totals as (
    -- Divizion foydalanuvchining umumiy oylik Arena tajribasiga bog‘liq,
    -- faqat tanlangan rejimdagi ballga emas.
    select p.user_id, sum(p.score)::bigint season_points
    from public.daily_arena_progress p
    where p.challenge_date >= v_month
      and p.challenge_date < (v_month + interval '1 month')::date
    group by p.user_id
  ), ranked as (
    select t.*, row_number() over (order by t.points desc, t.completed asc nulls last, t.user_id) place
    from period_totals t
  ), visible as (
    select r.*, public.daily_arena_division(coalesce(m.season_points, 0)) division
    from ranked r
    left join monthly_totals m on m.user_id = r.user_id
    where p_division is null
       or public.daily_arena_division(coalesce(m.season_points, 0)) = p_division
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'rank', v.place,
    'user_id', v.user_id,
    'division', v.division,
    'points', v.points,
    'name', coalesce(nullif(pr.username, ''), nullif(trim(concat_ws(' ', pr.first_name, pr.last_name)), ''), 'Arena ishtirokchisi')
  ) order by v.place), '[]'::jsonb)
  into v_rows
  from (select * from visible order by place limit least(greatest(coalesce(p_limit, 100), 1), 100)) v
  left join public.profiles pr on pr.id = v.user_id;

  return jsonb_build_object(
    'period', v_period,
    'mode', v_mode,
    'month', v_month,
    'participants', coalesce(v_total, 0),
    'rows', v_rows
  );
end
$$;

revoke all on function public.daily_arena_mode_leaderboard(text, text, integer, text) from public;
grant execute on function public.daily_arena_mode_leaderboard(text, text, integer, text) to anon, authenticated;
