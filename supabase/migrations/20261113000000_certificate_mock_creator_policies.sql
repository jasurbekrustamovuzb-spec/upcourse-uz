-- Allow signed-in learners to create and schedule their own certificate mocks.
-- Apply this after 20261112000000_certificate_mock_system.sql in Supabase SQL Editor.

drop policy if exists certificate_mock_exams_admin_write on public.certificate_mock_exams;
drop policy if exists certificate_mock_exams_owner_insert on public.certificate_mock_exams;
create policy certificate_mock_exams_owner_insert
  on public.certificate_mock_exams for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (select 1 from public.tests t where t.id = test_id and t.status = 'approved')
  );

drop policy if exists certificate_mock_exams_owner_update on public.certificate_mock_exams;
create policy certificate_mock_exams_owner_update
  on public.certificate_mock_exams for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists certificate_mock_exams_owner_delete on public.certificate_mock_exams;
create policy certificate_mock_exams_owner_delete
  on public.certificate_mock_exams for delete to authenticated
  using (created_by = auth.uid());

drop policy if exists certificate_mock_sessions_admin_write on public.certificate_mock_sessions;
drop policy if exists certificate_mock_sessions_owner_insert on public.certificate_mock_sessions;
create policy certificate_mock_sessions_owner_insert
  on public.certificate_mock_sessions for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.certificate_mock_exams e
      where e.id = exam_id and e.created_by = auth.uid() and e.is_enabled
    )
  );

drop policy if exists certificate_mock_sessions_owner_update on public.certificate_mock_sessions;
create policy certificate_mock_sessions_owner_update
  on public.certificate_mock_sessions for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists certificate_mock_sessions_owner_delete on public.certificate_mock_sessions;
create policy certificate_mock_sessions_owner_delete
  on public.certificate_mock_sessions for delete to authenticated
  using (created_by = auth.uid());

-- Public catalog reads are needed for the certificate center before login.
drop policy if exists certificate_mock_exams_read on public.certificate_mock_exams;
create policy certificate_mock_exams_read
  on public.certificate_mock_exams for select to anon, authenticated
  using (is_enabled or created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

drop policy if exists certificate_mock_sessions_read on public.certificate_mock_sessions;
create policy certificate_mock_sessions_read
  on public.certificate_mock_sessions for select to anon, authenticated
  using (exists (select 1 from public.certificate_mock_exams e where e.id = exam_id and e.is_enabled)
    or created_by = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

grant select on public.certificate_mock_exams, public.certificate_mock_sessions to anon;
grant select, insert, update, delete on public.certificate_mock_exams, public.certificate_mock_sessions to authenticated;
