-- Coin ledger, two existing collectible store items, promo redemption.
-- All balance changes happen inside SECURITY DEFINER functions or the score trigger.
create table if not exists public.daily_arena_coin_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount <> 0),
  source text not null,
  created_at timestamptz not null default now(),
  unique(user_id, source)
);
create index if not exists daily_arena_coin_ledger_user_idx on public.daily_arena_coin_ledger(user_id, created_at desc);
alter table public.daily_arena_coin_ledger enable row level security;
revoke all on public.daily_arena_coin_ledger from anon, authenticated;

create table if not exists public.daily_arena_store (
  collectible_id text primary key,
  price integer not null check (price > 0),
  active boolean not null default true
);
alter table public.daily_arena_store enable row level security;
revoke all on public.daily_arena_store from anon, authenticated;
insert into public.daily_arena_store(collectible_id, price)
select c.id, case when c.id = 'kashfiyotchi-1' then 120 else 180 end
from public.collectibles c
where c.id in ('kashfiyotchi-1', 'mustaqillik-35')
on conflict (collectible_id) do nothing;

create table if not exists public.daily_arena_promos (
  code text primary key,
  coin_amount integer not null check (coin_amount between 1 and 10000),
  max_uses integer not null default 1 check (max_uses > 0),
  uses integer not null default 0 check (uses >= 0),
  expires_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.daily_arena_promo_redemptions (
  code text not null references public.daily_arena_promos(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key(code, user_id)
);
alter table public.daily_arena_promos enable row level security;
alter table public.daily_arena_promo_redemptions enable row level security;
revoke all on public.daily_arena_promos, public.daily_arena_promo_redemptions from anon, authenticated;

create or replace function public.daily_arena_award_coins()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare v_gain integer;
begin
  v_gain := greatest(0, floor((new.score - old.score)::numeric / 10)::integer);
  if v_gain > 0 then
    insert into public.daily_arena_coin_ledger(user_id, amount, source)
    values(new.user_id, v_gain, 'score:' || new.challenge_date::text || ':' || greatest(1,new.current_stage-1)::text)
    on conflict(user_id, source) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists daily_arena_coin_award on public.daily_arena_progress;
create trigger daily_arena_coin_award after update of score on public.daily_arena_progress
for each row when (new.score > old.score) execute function public.daily_arena_award_coins();

create or replace function public.daily_arena_wallet()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  return jsonb_build_object('coins', coalesce((select sum(amount) from public.daily_arena_coin_ledger where user_id=v_user),0));
end $$;
revoke all on function public.daily_arena_wallet() from public, anon;
grant execute on function public.daily_arena_wallet() to authenticated;

create or replace function public.daily_arena_store_catalog()
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_items jsonb;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'subtitle',c.subtitle,'price',s.price,
      'owned',exists(select 1 from public.user_collectibles uc where uc.user_id=v_user and uc.collectible_id=c.id)) order by s.price), '[]'::jsonb)
  into v_items from public.daily_arena_store s join public.collectibles c on c.id=s.collectible_id where s.active;
  return jsonb_build_object('coins',coalesce((select sum(amount) from public.daily_arena_coin_ledger where user_id=v_user),0),'items',v_items);
end $$;
revoke all on function public.daily_arena_store_catalog() from public, anon;
grant execute on function public.daily_arena_store_catalog() to authenticated;

create or replace function public.daily_arena_store_purchase(p_collectible_id text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_price integer; v_balance bigint;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));
  select price into v_price from public.daily_arena_store where collectible_id=p_collectible_id and active for update;
  if v_price is null then raise exception 'ITEM_UNAVAILABLE'; end if;
  if exists(select 1 from public.user_collectibles where user_id=v_user and collectible_id=p_collectible_id) then raise exception 'ALREADY_OWNED'; end if;
  select coalesce(sum(amount),0) into v_balance from public.daily_arena_coin_ledger where user_id=v_user;
  if v_balance < v_price then raise exception 'NOT_ENOUGH_COINS'; end if;
  insert into public.daily_arena_coin_ledger(user_id,amount,source) values(v_user,-v_price,'purchase:'||p_collectible_id||':'||gen_random_uuid()::text);
  insert into public.user_collectibles(user_id,collectible_id,equipped) values(v_user,p_collectible_id,false);
  return jsonb_build_object('ok',true,'coins',v_balance-v_price);
end $$;
revoke all on function public.daily_arena_store_purchase(text) from public, anon;
grant execute on function public.daily_arena_store_purchase(text) to authenticated;

create or replace function public.daily_arena_redeem_promo(p_code text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_code text := upper(regexp_replace(btrim(coalesce(p_code,'')),'[^A-Za-z0-9_-]','','g')); v_p public.daily_arena_promos%rowtype;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_p from public.daily_arena_promos where code=v_code for update;
  if not found or (v_p.expires_at is not null and v_p.expires_at <= now()) or v_p.uses >= v_p.max_uses then raise exception 'PROMO_INVALID'; end if;
  insert into public.daily_arena_promo_redemptions(code,user_id) values(v_code,v_user) on conflict do nothing;
  if not found then raise exception 'PROMO_USED'; end if;
  update public.daily_arena_promos set uses=uses+1 where code=v_code;
  insert into public.daily_arena_coin_ledger(user_id,amount,source) values(v_user,v_p.coin_amount,'promo:'||v_code);
  return jsonb_build_object('ok',true,'coins',coalesce((select sum(amount) from public.daily_arena_coin_ledger where user_id=v_user),0),'earned',v_p.coin_amount);
end $$;
revoke all on function public.daily_arena_redeem_promo(text) from public, anon;
grant execute on function public.daily_arena_redeem_promo(text) to authenticated;

create or replace function public.daily_arena_create_promo(p_code text, p_coins integer, p_max_uses integer default 1, p_expires_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_code text := upper(regexp_replace(btrim(coalesce(p_code,'')),'[^A-Za-z0-9_-]','','g'));
begin
  if v_user is null or not exists(select 1 from public.profiles where id=v_user and is_admin=true) then raise exception 'ADMIN_REQUIRED'; end if;
  if length(v_code)<4 or p_coins not between 1 and 10000 or p_max_uses not between 1 and 100000 then raise exception 'INVALID_PROMO'; end if;
  insert into public.daily_arena_promos(code,coin_amount,max_uses,expires_at,created_by) values(v_code,p_coins,p_max_uses,p_expires_at,v_user);
  return jsonb_build_object('ok',true,'code',v_code);
end $$;
revoke all on function public.daily_arena_create_promo(text,integer,integer,timestamptz) from public, anon;
grant execute on function public.daily_arena_create_promo(text,integer,integer,timestamptz) to authenticated;
