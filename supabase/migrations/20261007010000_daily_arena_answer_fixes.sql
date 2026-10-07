-- Correct generated 25% questions so the displayed answer is exact for every date.
-- Keep the database-backed editor's published content and prior scores unchanged.
do $arena_math_fix$
declare
  v_definition text;
  v_updated text;
  v_old text := 'v_a := 50 + 25 * mod(v_day + v_variant, 7);';
  v_new text := 'v_a := 40 + 20 * mod(v_day + v_variant, 9);';
begin
  if to_regprocedure('public.daily_arena_build_generated_challenge(date)') is null then
    raise exception 'Generated Daily Arena challenge function not found';
  end if;

  v_definition := pg_get_functiondef('public.daily_arena_build_generated_challenge(date)'::regprocedure);
  if position(v_new in v_definition) > 0 then
    return;
  end if;
  v_updated := replace(v_definition, v_old, v_new);
  if v_updated = v_definition then
    raise exception 'Expected calculation question formula was not found';
  end if;

  execute v_updated;
end
$arena_math_fix$;
