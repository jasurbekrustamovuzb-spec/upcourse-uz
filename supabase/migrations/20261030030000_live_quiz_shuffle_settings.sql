-- Store the creator's shuffle choices with the live room. Existing rooms keep
-- their current shared question order and retain the old option order.
alter table public.live_rooms
  add column if not exists shuffle_questions boolean not null default true,
  add column if not exists shuffle_options boolean not null default false;

-- New live rooms shuffle answer options by default. Question order is still
-- stored once per room and therefore remains identical for every attendee.
alter table public.live_rooms
  alter column shuffle_options set default true;
