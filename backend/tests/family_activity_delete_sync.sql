-- Aktywnik+ family activity delete sync regression test
-- Run after migration 023. Synthetic data only. Entire test is rolled back.

begin;

insert into public.profiles(id,display_name,profile_type)
values
  ('98100000-0000-4000-8000-000000000001','Family Delete Parent','adult'),
  ('98100000-0000-4000-8000-000000000003','Family Delete Child Account','child');

insert into public.children(id,display_name,require_parent_approval)
values ('98100000-0000-4000-8000-000000000002','Family Delete Child',true);

insert into public.guardians(child_id,guardian_id,guardian_role)
values (
  '98100000-0000-4000-8000-000000000002',
  '98100000-0000-4000-8000-000000000001',
  'manager'
);

insert into public.child_accounts(child_id,user_id,active,paired_at)
values (
  '98100000-0000-4000-8000-000000000002',
  '98100000-0000-4000-8000-000000000003',
  true,
  now()
);

insert into public.activities(
  child_id,tenant_id,client_entry_id,client_updated_at,
  activity_date,activity_type,minutes,effort,note,status,source,updated_at
) values
(
  '98100000-0000-4000-8000-000000000002',
  null,
  '98100000-0000-4000-8000-000000000004',
  '2026-10-03T12:00:00Z',
  '2026-10-03','Spacer',30,2,'guardian delete test','approved','manual','2026-10-03T12:00:00Z'
),
(
  '98100000-0000-4000-8000-000000000002',
  null,
  '98100000-0000-4000-8000-000000000005',
  '2026-10-03T12:05:00Z',
  '2026-10-03','Rower',25,3,'child delete must fail','pending','manual','2026-10-03T12:05:00Z'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"98100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

insert into public.family_activity_tombstones(child_id,client_entry_id,deleted_at)
values (
  '98100000-0000-4000-8000-000000000002',
  '98100000-0000-4000-8000-000000000004',
  '2026-10-03T12:10:00Z'
);

delete from public.activities
where child_id='98100000-0000-4000-8000-000000000002'
  and tenant_id is null
  and client_entry_id='98100000-0000-4000-8000-000000000004';

do $$
begin
  if exists (
    select 1 from public.activities
    where child_id='98100000-0000-4000-8000-000000000002'
      and client_entry_id='98100000-0000-4000-8000-000000000004'
  ) then
    raise exception 'FAMILY DELETE FAIL: guardian could not delete tenant-neutral family activity';
  end if;

  if not exists (
    select 1 from public.family_activity_tombstones
    where child_id='98100000-0000-4000-8000-000000000002'
      and client_entry_id='98100000-0000-4000-8000-000000000004'
      and deleted_at='2026-10-03T12:10:00Z'
  ) then
    raise exception 'FAMILY DELETE FAIL: guardian tombstone missing';
  end if;
end $$;

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"98100000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);
set local role authenticated;

delete from public.activities
where child_id='98100000-0000-4000-8000-000000000002'
  and tenant_id is null
  and client_entry_id='98100000-0000-4000-8000-000000000005';

do $$
declare
  tombstone_blocked boolean := false;
begin
  if not exists (
    select 1 from public.activities
    where child_id='98100000-0000-4000-8000-000000000002'
      and client_entry_id='98100000-0000-4000-8000-000000000005'
  ) then
    raise exception 'FAMILY DELETE FAIL: child account deleted family activity';
  end if;

  begin
    insert into public.family_activity_tombstones(child_id,client_entry_id,deleted_at)
    values (
      '98100000-0000-4000-8000-000000000002',
      '98100000-0000-4000-8000-000000000005',
      now()
    );
  exception
    when insufficient_privilege then tombstone_blocked := true;
  end;

  if not tombstone_blocked then
    raise exception 'FAMILY DELETE FAIL: child account created delete tombstone';
  end if;
end $$;

reset role;
rollback;

select 'PASS' as status,
       'guardian family delete + tombstone allowed; child delete/tombstone blocked' as summary;
