-- Regression tests for migration 027; run on staging or local Supabase only.
-- Synthetic accounts and rows, all rolled back.
begin;

insert into auth.users(instance_id,id,aud,role,email,created_at,updated_at)
values
  ('00000000-0000-0000-0000-000000000000','97000000-0000-4000-8000-000000000001','authenticated','authenticated','goal-test-a@example.invalid',now(),now()),
  ('00000000-0000-0000-0000-000000000000','97000000-0000-4000-8000-000000000002','authenticated','authenticated','goal-test-b@example.invalid',now(),now());

select set_config('request.jwt.claims','{"sub":"97000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;

insert into public.user_activity_goals(owner_id,profile_key,period,target_minutes,changed_at)
values('97000000-0000-4000-8000-000000000001','self','7',120,'2026-11-02T10:00:00Z');

-- A stale sync cannot overwrite the already saved newer value.
insert into public.user_activity_goals(owner_id,profile_key,period,target_minutes,changed_at)
values('97000000-0000-4000-8000-000000000001','self','7',70,'2026-11-02T09:00:00Z')
on conflict (owner_id,profile_key,period)
do update set target_minutes=excluded.target_minutes,changed_at=excluded.changed_at;

do $$
begin
  if (select target_minutes from public.user_activity_goals where profile_key='self' and period='7') <> 120
  then raise exception 'GOAL SYNC FAIL: stale update overwrote newer value'; end if;
end $$;

-- Foreign account write must fail RLS.
do $$
begin
  begin
    insert into public.user_activity_goals(owner_id,profile_key,period,target_minutes)
    values('97000000-0000-4000-8000-000000000002','self','7',300);
    raise exception 'GOAL RLS FAIL: foreign insert allowed';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;
select set_config('request.jwt.claims','{"sub":"97000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;

do $$
begin
  if exists(select 1 from public.user_activity_goals where owner_id='97000000-0000-4000-8000-000000000001')
  then raise exception 'GOAL RLS FAIL: foreign goal visible'; end if;
end $$;
update public.user_activity_goals set target_minutes=999
where owner_id='97000000-0000-4000-8000-000000000001';

reset role;
do $$
begin
  if (select target_minutes from public.user_activity_goals
      where owner_id='97000000-0000-4000-8000-000000000001' and period='7') <> 120
  then raise exception 'GOAL RLS FAIL: foreign update mutated data'; end if;
end $$;

set local role anon;
do $$
begin
  begin
    perform count(*) from public.user_activity_goals;
    raise exception 'GOAL RLS FAIL: anon select allowed';
  exception
    when insufficient_privilege then null;
  end;
end $$;

reset role;
rollback;
select 'PASS: personal goal RLS, stale update and anonymous isolation' as result;
