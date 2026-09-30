-- UpCourse Arena: kunlik, AI ishlatmaydigan, server tekshiradigan aqliy mini-o'yin.
-- Supabase SQL Editor orqali bir marta ishga tushiring.
create table if not exists public.daily_arena_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_date date not null,
  score integer not null default 0 check (score >= 0),
  current_stage smallint not null default 1 check (current_stage between 1 and 6),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, challenge_date)
);
create table if not exists public.daily_arena_stage_attempts (
  user_id uuid not null,
  challenge_date date not null,
  stage smallint not null check (stage between 1 and 5),
  attempts smallint not null default 0 check (attempts between 0 and 3),
  resolved boolean not null default false,
  solved boolean not null default false,
  points integer not null default 0 check (points >= 0),
  primary key (user_id, challenge_date, stage),
  foreign key (user_id, challenge_date) references public.daily_arena_progress(user_id, challenge_date) on delete cascade
);
create table if not exists public.daily_arena_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  season_start date not null,
  badge text not null check (badge in ('debut','silver','gold','platinum','diamond','legend')),
  earned_at timestamptz not null default now(),
  primary key (user_id, season_start, badge)
);
alter table public.daily_arena_progress enable row level security;
alter table public.daily_arena_stage_attempts enable row level security;
alter table public.daily_arena_badges enable row level security;
revoke all on table public.daily_arena_progress, public.daily_arena_stage_attempts, public.daily_arena_badges from anon, authenticated;

create index if not exists daily_arena_progress_date_score_idx
  on public.daily_arena_progress(challenge_date, score desc, completed_at);

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
revoke all on function public.daily_arena_division(bigint) from public, anon, authenticated;
revoke all on function public.daily_arena_division(bigint) from public, anon, authenticated;

create or replace function public.daily_arena_options(p_correct text, p_decoys text[], p_offset integer)
returns jsonb language plpgsql immutable set search_path = public, pg_temp
as $$
declare
  v_items text[] := array[p_correct, p_decoys[1], p_decoys[2], p_decoys[3]];
  v_result jsonb := '[]'::jsonb;
  i integer;
begin
  for i in 0..3 loop
    v_result := v_result || jsonb_build_array(v_items[mod(i + p_offset, 4) + 1]);
  end loop;
  return v_result;
end
$$;
revoke all on function public.daily_arena_options(text, text[], integer) from public, anon, authenticated;

create or replace function public.daily_arena_scramble(p_word text, p_shift integer)
returns text language plpgsql immutable set search_path = public, pg_temp
as $$
declare
  v_len integer := length(p_word);
  v_result text;
begin
  if v_len < 2 then return p_word; end if;
  v_result := substring(p_word from (mod(p_shift, v_len) + 1)) ||
              substring(p_word from 1 for mod(p_shift, v_len));
  if v_result = p_word then v_result := reverse(p_word); end if;
  return v_result;
end
$$;
revoke all on function public.daily_arena_scramble(text, integer) from public, anon, authenticated;

-- Kunlik topshiriq sana urug'idan deterministik yaratiladi. Hamma bir xil kun
-- uchun bir xil bosqichlarni oladi; javob kaliti faqat server ichida qoladi.
create or replace function public.daily_arena_build_challenge(p_date date)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_day integer := greatest((p_date - date '2026-09-30'), 0);
  v_mode integer := mod(v_day, 5);
  v_variant integer := v_day / 5;
  v_title text;
  v_subtitle text;
  v_rounds jsonb := '[]'::jsonb;
  v_answers jsonb := '[]'::jsonb;
  v_stage integer;
  v_k integer;
  v_offset integer;
  v_correct_position integer;
  v_start integer;
  v_step integer;
  v_answer integer;
  v_terms integer[];
  v_term_text text;
  v_correct text;
  v_decoys text[];
  v_options jsonb;
  v_prompt text;
  v_explanation text;
  v_word text;
  v_words text[];
  v_symbols text[] := array['●','▲','■','◆','★','⬟','⬢','✚','⬣','◉'];
  v_visual jsonb;
  v_symbol_index integer;
  v_left text[];
  v_right text[];
  v_right_display text[];
  v_match_code text;
  v_display_index integer;
  v_logic_prompts text[] := array[
    'Barcha arxivchilar tartibli. Malika arxivchi. Qaysi xulosa shartlardan kelib chiqadi?',
    'Agar signal yoqilgan boʻlsa, chiroq yonadi. Chiroq yonmayapti. Nimani aniq xulosa qilish mumkin?',
    'Uch kishi — Vali, Ali va Zuhra — bittadan navbat bilan chiqadi. Vali Alidan oldin, Zuhra Alidan keyin chiqadi. Birinchi boʻlib kim chiqadi?',
    'Kalit A, B yoki C qutida. A yozuvi: “Kalit A da emas.” B yozuvi: “Kalit A da.” C yozuvi: “Kalit C da emas.” Yozuvlardan aynan bittasi rost. Kalit qaysi qutida?',
    'A, B, C navbat bilan chiqadi. A B dan oldin, C A dan keyin va B dan oldin. Qaysi tartib ikkala shartga ham mos?'
  ];
  v_logic_correct text[] := array[
    'Malika tartibli.',
    'Signal yoqilmagan.',
    'Vali.',
    'C qutida.',
    'A, C, B.'
  ];
  v_logic_d1 text[] := array[
    'Barcha tartibli odamlar arxivchi.',
    'Signal albatta yoqilgan.',
    'Ali.',
    'A qutida.',
    'B, A, C.'
  ];
  v_logic_d2 text[] := array[
    'Malika arxivchi emas.',
    'Chiroq buzilganini aniq bilamiz.',
    'Ali va Vali.',
    'B qutida.',
    'C, A, B.'
  ];
  v_logic_d3 text[] := array[
    'Malika ham arxivchi, ham tartibli emas.',
    'Signal yoqilgan, ammo chiroq ishlamayapti.',
    'Ali ham, Vali ham emas.',
    'Aniqlab boʻlmaydi.',
    'A, B, C.'
  ];
begin
  case v_mode
    when 0 then v_title := 'Naqsh laboratoriyasi'; v_subtitle := 'Ketma-ketlik ortidagi qoidani toping. Bosqichlar asta-sekin murakkablashadi.';
    when 1 then v_title := 'Deduksiya xonasi'; v_subtitle := 'Berilgan dalillardan faqat aniq kelib chiqadigan xulosani tanlang.';
    when 2 then v_title := 'Harflar aralashmasi'; v_subtitle := 'Aralashgan harflardan soʻzni toping. Har bosqichda soʻz murakkablashadi.';
    when 3 then v_title := 'Vizual signal'; v_subtitle := 'Belgilar tartibini kuzating va naqshning keyingi qismini toping.';
    else v_title := 'Moslik sinovi'; v_subtitle := 'Chap va oʻng tomondagi tushunchalarni mantiqan juftlang.';
  end case;

  for v_stage in 1..5 loop
    v_offset := mod(v_day + v_stage * 3, 4);
    v_correct_position := mod(4 - v_offset, 4);
    if v_mode = 0 then
      v_start := 3 + mod(v_variant + v_stage * 2, 11);
      v_step := 2 + mod(v_variant + v_stage, 5);
      v_terms := array[]::integer[];
      for v_k in 0..4 loop
        if v_stage = 1 then
          v_terms := array_append(v_terms, v_start + v_k * v_step);
        elsif v_stage = 2 then
          v_terms := array_append(v_terms, v_start + v_k * (v_k + 1));
        elsif v_stage = 3 then
          v_terms := array_append(v_terms, v_start * (2 ^ v_k));
        elsif v_stage = 4 then
          v_terms := array_append(v_terms, v_start + v_step * v_k * v_k + v_k);
        else
          if v_k = 0 then v_terms := array_append(v_terms, v_start);
          elsif v_k = 1 then v_terms := array_append(v_terms, v_start + v_step);
          else v_terms := array_append(v_terms, v_terms[v_k] + v_terms[v_k - 1]);
          end if;
        end if;
      end loop;
      if v_stage = 1 then v_answer := v_start + 5 * v_step;
      elsif v_stage = 2 then v_answer := v_start + 30;
      elsif v_stage = 3 then v_answer := v_start * 32;
      elsif v_stage = 4 then v_answer := v_start + 25 * v_step + 5;
      else v_answer := v_terms[5] + v_terms[4];
      end if;
      select string_agg(value::text, ' · ' order by ordinality) into v_term_text
        from unnest(v_terms) with ordinality as t(value, ordinality);
      v_correct := v_answer::text;
      v_decoys := array[(v_answer + v_stage)::text, (v_answer - v_stage - 1)::text, (v_answer + 2 * v_stage + 3)::text];
      v_options := public.daily_arena_options(v_correct, v_decoys, v_offset);
      v_prompt := 'Naqshni davom ettiring: ' || v_term_text || ' · ?';
      v_explanation := case v_stage
        when 1 then 'Har safar bir xil miqdor qoʻshiladi.'
        when 2 then 'Qoʻshilayotgan farqlar ketma-ket juft sonlar: 2, 4, 6, 8, 10.'
        when 3 then 'Har bir had avvalgisidan ikki baravar katta.'
        when 4 then 'Farqlar kvadratlar qoidasi boʻyicha ortadi.'
        else 'Har yangi had oldingi ikki hadning yigʻindisi.'
      end;
      v_rounds := v_rounds || jsonb_build_array(jsonb_build_object(
        'kind','choice','prompt',v_prompt,'options',v_options,'explanation',v_explanation,'level',v_stage
      ));
      v_answers := v_answers || jsonb_build_array(chr(65 + v_correct_position));

    elsif v_mode = 1 then
      v_correct := v_logic_correct[v_stage];
      v_decoys := array[v_logic_d1[v_stage], v_logic_d2[v_stage], v_logic_d3[v_stage]];
      v_options := public.daily_arena_options(v_correct, v_decoys, v_offset);
      v_rounds := v_rounds || jsonb_build_array(jsonb_build_object(
        'kind','choice','prompt',v_logic_prompts[v_stage],'options',v_options,
        'explanation','Shartlarni alohida tekshiring: toʻgʻri javob berilgan maʼlumotdan majburiy kelib chiqishi kerak.','level',v_stage
      ));
      v_answers := v_answers || jsonb_build_array(chr(65 + v_correct_position));

    elsif v_mode = 2 then
      case v_stage
        when 1 then v_words := array['kitob','qalam','daryo','meva','bulut'];
        when 2 then v_words := array['mantiq','fikrlar','tartib','sabab','dalil'];
        when 3 then v_words := array['tafakkur','ehtimol','muvozanat','xulosa','izlanish'];
        when 4 then v_words := array['tasavvur','munosabat','kuzatuv','qarorlar','tahlillar'];
        else v_words := array['muvaffaqiyat','mehnatsevar','mustaqillik','qonuniyat','muammolar'];
      end case;
      v_word := v_words[mod(v_variant + v_stage - 1, array_length(v_words,1)) + 1];
      v_correct := lower(v_word);
      v_prompt := 'Aralashgan harflar:  ' || public.daily_arena_scramble(v_word, v_variant + v_stage);
      v_rounds := v_rounds || jsonb_build_array(jsonb_build_object(
        'kind','text','prompt',v_prompt,'explanation','Harflarni oʻrniga qoʻyib, mazmunli soʻzni toping.','level',v_stage
      ));
      v_answers := v_answers || jsonb_build_array(v_correct);

    elsif v_mode = 3 then
      v_symbol_index := mod(v_day + v_stage, 10);
      v_step := v_stage;
      v_visual := '[]'::jsonb;
      for v_k in 0..4 loop
        v_visual := v_visual || jsonb_build_array(v_symbols[mod(v_symbol_index + v_k * v_step, 10) + 1]);
      end loop;
      v_correct := v_symbols[mod(v_symbol_index + 5 * v_step, 10) + 1];
      v_decoys := array[
        v_symbols[mod(v_symbol_index + 5 * v_step + 1,10)+1],
        v_symbols[mod(v_symbol_index + 5 * v_step + 3,10)+1],
        v_symbols[mod(v_symbol_index + 5 * v_step + 6,10)+1]
      ];
      v_options := public.daily_arena_options(v_correct, v_decoys, v_offset);
      v_rounds := v_rounds || jsonb_build_array(jsonb_build_object(
        'kind','visual','prompt','Belgilar qatorida qaysi belgi keyingi keladi?','visual',v_visual,
        'options',v_options,'explanation','Ketma-ketlik har bosqichda bir xil qadam bilan siljiydi.','level',v_stage
      ));
      v_answers := v_answers || jsonb_build_array(chr(65 + v_correct_position));

    else
      case v_stage
        when 1 then v_left := array['Italiya','Yaponiya','Misr','Kanada']; v_right := array['Ottava','Tokio','Rim','Qohira'];
        when 2 then v_left := array['km','kg','litr','sekund']; v_right := array['vaqt','hajm','massa','masofa'];
        when 3 then v_left := array['Kompas','Termometr','Barometr','Sekstant']; v_right := array['havo bosimi','yoʻnalish','harorat','burchak balandligi'];
        when 4 then v_left := array['Metafora','Ironiya','Paradoks','Analogiya']; v_right := array['oʻxshashlik asosidagi taqqos','zid koʻrinadigan haqiqat','yashirin kinoya','koʻchma maʼnoli ifoda'];
        else v_left := array['Korrelatsiya','Sababiyat','Namuna xatosi','Tasdiqlash ogʻishi']; v_right := array['faqat mos oʻzgarish birga kuzatilishi','qarshi dalilni eʼtiborsiz qoldirish','kichik guruhdan umumlashtirish','bir hodisa boshqasini yuzaga keltirishi'];
      end case;
      v_right_display := array[]::text[];
      v_match_code := '';
      for v_k in 1..4 loop
        v_display_index := mod(v_k - 1 + v_offset, 4) + 1;
        v_right_display := array_append(v_right_display, v_right[v_display_index]);
      end loop;
      for v_k in 1..4 loop
        v_display_index := mod(v_k - 1 - v_offset + 4, 4) + 1;
        v_match_code := v_match_code || v_display_index::text;
      end loop;
      v_rounds := v_rounds || jsonb_build_array(jsonb_build_object(
        'kind','match','prompt','Har bir tushunchani mos taʼrif yoki javob bilan juftlang.',
        'left',to_jsonb(v_left),'right',to_jsonb(v_right_display),
        'explanation','Har bir juftni alohida tekshiring; bir javob faqat bir marta ishlatiladi.','level',v_stage
      ));
      v_answers := v_answers || jsonb_build_array(v_match_code);
    end if;
  end loop;

  return jsonb_build_object(
    'date',p_date,'mode',case v_mode when 0 then 'pattern' when 1 then 'logic' when 2 then 'word' when 3 then 'visual' else 'matching' end,
    'title',v_title,'subtitle',v_subtitle,'rounds',v_rounds,'answer_key',v_answers
  );
end
$$;
revoke all on function public.daily_arena_build_challenge(date) from public, anon, authenticated;

create or replace function public.daily_arena_get_challenge()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_date date := (now() at time zone 'Asia/Tashkent')::date;
  v_user uuid := auth.uid();
  v_challenge jsonb := public.daily_arena_build_challenge(v_date);
  v_progress public.daily_arena_progress%rowtype;
  v_history jsonb := '[]'::jsonb;
begin
  if v_user is not null then
    select * into v_progress from public.daily_arena_progress
      where user_id = v_user and challenge_date = v_date;
    select coalesce(jsonb_agg(jsonb_build_object(
      'stage',a.stage,'attempts',a.attempts,'resolved',a.resolved,'solved',a.solved,
      'points',a.points,'answer',case when a.resolved then v_challenge->'answer_key'->(a.stage-1) else null end
    ) order by a.stage),'[]'::jsonb)
    into v_history from public.daily_arena_stage_attempts a
    where a.user_id = v_user and a.challenge_date = v_date;
  end if;
  return jsonb_build_object(
    'date',v_date,'mode',v_challenge->'mode','title',v_challenge->'title','subtitle',v_challenge->'subtitle',
    'rounds',v_challenge->'rounds','authenticated',v_user is not null,
    'progress',jsonb_build_object(
      'score',coalesce(v_progress.score,0),
      'stage',case when v_progress.user_id is null then 1 else v_progress.current_stage end,
      'completed',v_progress.completed_at is not null,
      'history',v_history
    )
  );
end
$$;
revoke all on function public.daily_arena_get_challenge() from public;
grant execute on function public.daily_arena_get_challenge() to anon, authenticated;

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
revoke all on function public.daily_arena_submit_answer(smallint,text) from public, anon;
grant execute on function public.daily_arena_submit_answer(smallint,text) to authenticated;
revoke all on function public.daily_arena_submit_answer(smallint,text) from public, anon;
grant execute on function public.daily_arena_submit_answer(smallint,text) to authenticated;

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
revoke all on function public.daily_arena_leaderboard(text,text,integer) from public;
grant execute on function public.daily_arena_leaderboard(text,text,integer) to anon, authenticated;
revoke all on function public.daily_arena_leaderboard(text,text,integer) from public;
grant execute on function public.daily_arena_leaderboard(text,text,integer) to anon, authenticated;

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
revoke all on function public.daily_arena_get_profile(uuid) from public;
grant execute on function public.daily_arena_get_profile(uuid) to anon, authenticated;
revoke all on function public.daily_arena_get_profile(uuid) from public;
grant execute on function public.daily_arena_get_profile(uuid) to anon, authenticated;
