-- Allow a signed-in learner to update their own saved quiz preferences.
-- This is intentionally column-scoped; quiz answers/preferences remain private to the owner.
grant update (test_prefs) on table public.profiles to authenticated;

drop policy if exists "profiles_owner_update_test_prefs" on public.profiles;
create policy "profiles_owner_update_test_prefs"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
