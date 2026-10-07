-- Align each generated matching answer with its actual left-hand concept.
-- This generator is date deterministic; existing progress and scores are unchanged.
do $arena_match_answer_fix$
declare
  v_definition text;
  v_updated text;
  v_old_fragments text[] := array[
    'v_a := 50 + 25 * mod(v_day + v_variant, 7);',
    'v_right := array[''Ottava'',''Tokio'',''Rim'',''Qohira''];',
    'v_right := array[''vaqt'',''hajm'',''massa'',''masofa''];',
    'v_right := array[''havo bosimi'',''yoʻnalish'',''harorat'',''burchak balandligi''];',
    'v_right := array[''oʻxshashlik asosidagi taqqos'',''zid koʻrinadigan haqiqat'',''yashirin kinoya'',''koʻchma maʼnoli ifoda''];',
    'v_right := array[''faqat mos oʻzgarish birga kuzatilishi'',''qarshi dalilni eʼtiborsiz qoldirish'',''kichik guruhdan umumlashtirish'',''bir hodisa boshqasini yuzaga keltirishi''];'
  ];
  v_new_fragments text[] := array[
    'v_a := 40 + 20 * mod(v_day + v_variant, 9);',
    'v_right := array[''Rim'',''Tokio'',''Qohira'',''Ottava''];',
    'v_right := array[''masofa'',''massa'',''hajm'',''vaqt''];',
    'v_right := array[''yoʻnalish'',''harorat'',''havo bosimi'',''burchak balandligi''];',
    'v_right := array[''koʻchma maʼnoli ifoda'',''yashirin kinoya'',''zid koʻrinadigan haqiqat'',''oʻxshashlik asosidagi taqqos''];',
    'v_right := array[''faqat mos oʻzgarish birga kuzatilishi'',''bir hodisa boshqasini yuzaga keltirishi'',''kichik guruhdan umumlashtirish'',''qarshi dalilni eʼtiborsiz qoldirish''];'
  ];
  v_i integer;
begin
  if to_regprocedure('public.daily_arena_build_generated_challenge(date)') is null then
    raise exception 'Generated Daily Arena challenge function not found';
  end if;
  v_definition := pg_get_functiondef('public.daily_arena_build_generated_challenge(date)'::regprocedure);
  v_updated := v_definition;
  for v_i in 1..array_length(v_old_fragments, 1) loop
    if position(v_new_fragments[v_i] in v_updated) > 0 then
      continue;
    end if;
    if position(v_old_fragments[v_i] in v_updated) = 0 then
      raise exception 'Daily Arena fix fragment % was not found', v_i;
    end if;
    v_updated := replace(v_updated, v_old_fragments[v_i], v_new_fragments[v_i]);
  end loop;
  if v_updated <> v_definition then
    execute v_updated;
  end if;
end
$arena_match_answer_fix$;
