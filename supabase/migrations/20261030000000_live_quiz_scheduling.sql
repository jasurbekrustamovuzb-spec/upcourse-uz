-- Let live quiz rooms start at their scheduled time without requiring the host
-- to keep the page open. Supabase Cron runs this small update once a minute;
-- active clients also attempt the same start so the room can begin promptly.
alter table public.live_rooms
  add column if not exists scheduled_at timestamptz;

create extension if not exists pg_cron with schema pg_catalog;

do $migration$
declare
  existing_job record;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'upcourse-start-scheduled-live-rooms'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'upcourse-start-scheduled-live-rooms',
    '* * * * *',
    $job$
      update public.live_rooms
      set status = 'active',
          starts_at = now(),
          scheduled_at = null,
          phase = case when mode = 'sync' then 'question' else phase end,
          current_index = case when mode = 'sync' then 0 else current_index end,
          phase_started_at = case when mode = 'sync' then now() else phase_started_at end
      where status = 'waiting'
        and scheduled_at is not null
        and scheduled_at <= now();
    $job$
  );
end;
$migration$;

