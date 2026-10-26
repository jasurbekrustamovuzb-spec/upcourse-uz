-- Keep an approved subject visible whenever it contains approved public content.
-- Also repair categories left pending by older/manual approval flows.
create or replace function public.approve_category_for_public_content()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'approved' and new.category_id is not null then
    update public.categories
      set status = 'approved'
      where id = new.category_id
        and status is distinct from 'approved';
  end if;
  return new;
end;
$$;

revoke all on function public.approve_category_for_public_content() from public, anon, authenticated;

drop trigger if exists courses_approve_category_for_public_content on public.courses;
create trigger courses_approve_category_for_public_content
  after insert or update on public.courses
  for each row execute function public.approve_category_for_public_content();

drop trigger if exists tests_approve_category_for_public_content on public.tests;
create trigger tests_approve_category_for_public_content
  after insert or update on public.tests
  for each row execute function public.approve_category_for_public_content();

update public.categories c
set status = 'approved'
where c.status is distinct from 'approved'
  and (
    exists (
      select 1 from public.courses co
      where co.category_id = c.id and co.status = 'approved'
    )
    or exists (
      select 1 from public.tests t
      where t.category_id = c.id and t.status = 'approved'
    )
  );

