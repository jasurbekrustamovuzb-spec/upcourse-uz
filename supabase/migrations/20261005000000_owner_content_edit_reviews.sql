-- Keep approved content live while an author submits an edit for review.
-- Pending/private items remain editable in place; approved items use these drafts.
create or replace function public.is_upcourse_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
  );
$$;

revoke all on function public.is_upcourse_admin() from public;
grant execute on function public.is_upcourse_admin() to authenticated;

create table if not exists public.course_revisions (
  course_id text primary key references public.courses(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  draft jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.test_revisions (
  test_id text primary key references public.tests(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  draft jsonb not null,
  updated_at timestamptz not null default now()
);

-- Repair either table if an earlier partial attempt created its key as uuid.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'course_revisions'
      and column_name = 'course_id' and data_type <> 'text'
  ) then
    alter table public.course_revisions drop constraint if exists course_revisions_course_id_fkey;
    alter table public.course_revisions alter column course_id type text using course_id::text;
    alter table public.course_revisions
      add constraint course_revisions_course_id_fkey
      foreign key (course_id) references public.courses(id) on delete cascade;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'test_revisions'
      and column_name = 'test_id' and data_type <> 'text'
  ) then
    alter table public.test_revisions drop constraint if exists test_revisions_test_id_fkey;
    alter table public.test_revisions alter column test_id type text using test_id::text;
    alter table public.test_revisions
      add constraint test_revisions_test_id_fkey
      foreign key (test_id) references public.tests(id) on delete cascade;
  end if;
end;
$$;

create index if not exists course_revisions_owner_idx on public.course_revisions(owner_id);
create index if not exists test_revisions_owner_idx on public.test_revisions(owner_id);

alter table public.course_revisions enable row level security;
alter table public.test_revisions enable row level security;

revoke all on public.course_revisions from anon;
revoke all on public.test_revisions from anon;
grant select, insert, update, delete on public.course_revisions to authenticated;
grant select, insert, update, delete on public.test_revisions to authenticated;

drop policy if exists "course revisions owner or admin read" on public.course_revisions;
create policy "course revisions owner or admin read"
on public.course_revisions for select to authenticated
using (owner_id = auth.uid() or public.is_upcourse_admin());

drop policy if exists "course revisions owner or admin write" on public.course_revisions;
create policy "course revisions owner or admin write"
on public.course_revisions for all to authenticated
using (owner_id = auth.uid() or public.is_upcourse_admin())
with check (
  public.is_upcourse_admin()
  or (
    owner_id = auth.uid()
    and exists (
      select 1 from public.courses c
      where c.id = course_id and c.author_id = auth.uid() and c.status = 'approved'
    )
  )
);

drop policy if exists "test revisions owner or admin read" on public.test_revisions;
create policy "test revisions owner or admin read"
on public.test_revisions for select to authenticated
using (owner_id = auth.uid() or public.is_upcourse_admin());

drop policy if exists "test revisions owner or admin write" on public.test_revisions;
create policy "test revisions owner or admin write"
on public.test_revisions for all to authenticated
using (owner_id = auth.uid() or public.is_upcourse_admin())
with check (
  public.is_upcourse_admin()
  or (
    owner_id = auth.uid()
    and exists (
      select 1 from public.tests t
      where t.id = test_id and t.author_id = auth.uid() and t.status = 'approved'
    )
  )
);

-- Owners may update their own not-yet-published material in place.
-- The check prevents turning a pending/private row into approved content.
drop policy if exists "authors update own unpublished courses" on public.courses;
create policy "authors update own unpublished courses"
on public.courses for update to authenticated
using (author_id = auth.uid() and status in ('pending', 'private'))
with check (author_id = auth.uid() and status in ('pending', 'private'));

drop policy if exists "authors update own unpublished tests" on public.tests;
create policy "authors update own unpublished tests"
on public.tests for update to authenticated
using (author_id = auth.uid() and status in ('pending', 'private'))
with check (author_id = auth.uid() and status in ('pending', 'private'));

-- A category can be renamed by its creator. Existing admin policies remain intact.
drop policy if exists "authors update own categories" on public.categories;
create policy "authors update own categories"
on public.categories for update to authenticated
using (author_id = auth.uid())
with check (author_id = auth.uid());
