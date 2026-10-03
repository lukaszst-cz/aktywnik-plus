-- Aktywnik+ family delete sync regression test
-- Run after migration 024. Synthetic data only. Entire test is rolled back.

begin;

insert into public.profiles(id,display_name,profile_type)
values
  ('99000000-0000-4000-8000-000000000001','Family Delete Guardian','adult'),
  ('99000000-0000-4000-8000-000000000006','Family Delete Stranger','adult');

insert into public.children(id,display_name,require_parent_approval)
values ('99000000-0000-4000-8000-000000000002','Family Delete Child',true);

insert into public.guardians(child_id,guardian_id,guardian_role)
values (
  '99000000-0000-4000-8000-000000000002',
  '99000000-0000-4000-8000-000000000001',
  'manager'
);

insert into public.tenants(id,name,deployment_mode)
values ('99000000-0000-4000-8000-000000000003','Family Delete School','school_saas');

insert into public.activities(
  child_id,tenant_id,client_entry_id,client_updated_at,
  activity_date,activity_type,minutes,status,source,updated_at
) values
(
  '99000000-0000-4000-8000-000000000002',
  null,
  '99000000-0000-4000-8000-000000000004',
  '2026-10-03T11:00:00Z',
  '2026-10-03','Family row',20,'pending','manual','2026-10-03T11:00:00Z'
),
(
  '99000000-0000-4000-8000-000000000002',
  null,
  '99000000-0000-4000-8000-000000000005',
  '2026-10-03T11:01:00Z',
  '2026-10-03','Family row for stranger test',25,'pending','manual','2026-10-03T11:01:00Z'
),
(
  '99000000-0000-4000-8000-000000000002',
  '99000000-0000-4000-8000-000000000003',
  '99000000-0000-4000-8000-000000000007',
  '2026-10-03T11:02:00Z',
  '2026-10-03','School row',30,'pending','manual','2026-10-03T11:02:00Z'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"99000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

insert into public.family_activity_tombstones(child_id,client_entry_id,deleted_at)
values (
  '99000000-0000-4000-8000-000000000002',
  '99000000-0000-4000-8000-000000000004',
  '2026-10-03T11:05:00Z'
);

do $$
declare
  deleted_family integer;
  deleted_school integer;
begin
  with gone as (
    delete from public.activities
    where child_id='99000000-0000-4000-8000-000000000002'
      and client_entry_id='99000000-0000-4000-8000-000000000004'
    returning 1
  )
  select count(*) into deleted_family from gone;

  if deleted_family <> 1 then
    raise exception 'FAMILY DELETE FAIL: guardian could not delete tenant-neutral family row';
  end if;

  with gone as (
    delete from public.activities
    where child_id='99000000-0000-4000-8000-000000000002'
      and client_entry_id='99000000-0000-4000-8000-000000000007'
    returning 1
  )
  select count(*) into deleted_school from gone;

  if deleted_school <> 0 then
    raise exception 'FAMILY DELETE FAIL: guardian could delete school-owned row';
  end if;
end $$;

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"99000000-0000-4000-8000-000000000006","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  visible_tombstones integer;
  deleted_other integer;
  blocked_insert boolean := false;
begin
  select count(*) into visible_tombstones
  from public.family_activity_tombstones
  where child_id='99000000-0000-4000-8000-000000000002';

  if visible_tombstones <> 0 then
    raise exception 'FAMILY DELETE FAIL: unrelated adult could read tombstones';
  end if;

  with gone as (
    delete from public.activities
    where child_id='99000000-0000-4000-8000-000000000002'
      and client_entry_id='99000000-0000-4000-8000-000000000005'
    returning 1
  )
  select count(*) into deleted_other from gone;

  if deleted_other <> 0 then
    raise exception 'FAMILY DELETE FAIL: unrelated adult could delete family row';
  end if;

  begin
    insert into public.family_activity_tombstones(child_id,client_entry_id,deleted_at)
    values (
      '99000000-0000-4000-8000-000000000002',
      '99000000-0000-4000-8000-000000000005',
      now()
    );
  exception
    when insufficient_privilege then blocked_insert := true;
  end;

  if not blocked_insert then
    raise exception 'FAMILY DELETE FAIL: unrelated adult could create tombstone';
  end if;
end $$;

reset role;

do $$
begin
  if has_table_privilege('authenticated','public.family_activity_tombstones','DELETE') then
    raise exception 'FAMILY DELETE FAIL: authenticated may delete tombstones directly';
  end if;

  if has_table_privilege('anon','public.family_activity_tombstones','SELECT')
     or has_table_privilege('anon','public.family_activity_tombstones','INSERT')
     or has_table_privilege('anon','public.family_activity_tombstones','UPDATE')
     or has_table_privilege('anon','public.family_activity_tombstones','DELETE')
  then
    raise exception 'FAMILY DELETE FAIL: anon has tombstone privileges';
  end if;
end $$;

rollback;

select 'PASS' as status,
       'guardian delete + school isolation + unrelated-adult isolation + tombstone retention verified' as summary;
