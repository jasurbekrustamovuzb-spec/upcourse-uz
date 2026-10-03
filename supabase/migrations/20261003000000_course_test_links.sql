-- Link approved tests to individual course lessons without fetching tests on the home page.
create table if not exists public.course_test_links (
  course_id text not null references public.courses(id) on delete cascade,
  test_id text not null references public.tests(id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (course_id, test_id)
);

create index if not exists course_test_links_test_idx
  on public.course_test_links(test_id);

alter table public.course_test_links enable row level security;
revoke all on public.course_test_links from anon, authenticated;
grant select on public.course_test_links to anon, authenticated;
grant insert, delete on public.course_test_links to authenticated;

drop policy if exists "course test links are readable" on public.course_test_links;
create policy "course test links are readable"
  on public.course_test_links for select
  using (true);

drop policy if exists "course owner or admin can link approved tests" on public.course_test_links;
create policy "course owner or admin can link approved tests"
  on public.course_test_links for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      exists (
        select 1 from public.courses c
        where c.id = course_id and c.author_id = auth.uid()
      )
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.is_admin = true
      )
    )
    and exists (
      select 1 from public.tests t
      where t.id = test_id
        and (
          t.status = 'approved'
          or t.author_id = auth.uid()
          or exists (
            select 1 from public.profiles p
            where p.id = auth.uid() and p.is_admin = true
          )
        )
    )
  );

drop policy if exists "course owner or admin can unlink tests" on public.course_test_links;
create policy "course owner or admin can unlink tests"
  on public.course_test_links for delete to authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_id and c.author_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

notify pgrst, 'reload schema';
