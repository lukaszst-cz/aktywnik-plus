-- Aktywnik+ family activity sync regression test
-- Run after migration 022. Synthetic data only. Entire test is rolled back.

begin;

insert into public.profiles(id,display_name,profile_type)
values ('98000000-0000-4000-8000-000000000001','Family Sync Parent','adult');

insert into public.children(id,display_name,require_parent_approval)
values ('98000000-0000-4000-8000-000000000002','Family Sync Child',true);

insert into public.guardians(child_id,guardian_id,guardian_role)
values (
  '98000000-0000-4000-8000-000000000002',
  '98000000-0000-4000-8000-000000000001',
  'manager'
);

insert into public.tenants(id,name,deployment_mode)
values ('98000000-0000-4000-8000-000000000003','Forbidden Tenant','school_saas');

select set_config(
  'request.jwt.claims',
  '{"sub":"98000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

insert into public.activities(
  child_id,tenant_id,client_entry_id,client_updated_at,
  activity_date,activity_type,minutes,effort,note,status,source,updated_at
) values (
  '98000000-0000-4000-8000-000000000002',
  null,
  '98000000-0000-4000-8000-000000000004',
  '2026-10-03T10:30:00Z',
  '2026-10-03','Spacer',30,2,'family sync','pending','manual','2026-10-03T10:30:00Z'
);

update public.activities
set status='approved',
    approved_at='2026-10-03T10:31:00Z',
    client_updated_at='2026-10-03T10:31:00Z',
    updated_at='2026-10-03T10:31:00Z'
where child_id='98000000-0000-4000-8000-000000000002'
  and client_entry_id='98000000-0000-4000-8000-000000000004';

do $$
declare
  blocked boolean := false;
begin
  begin
    insert into public.activities(
      child_id,tenant_id,client_entry_id,client_updated_at,
      activity_date,activity_type,minutes,status,source,updated_at
    ) values (
      '98000000-0000-4000-8000-000000000002',
      '98000000-0000-4000-8000-000000000003',
      '98000000-0000-4000-8000-000000000005',
      now(),
      '2026-10-03','Nie powinno wejść',10,'pending','manual',now()
    );
  exception
    when insufficient_privilege then blocked := true;
  end;

  if not blocked then
    raise exception 'FAMILY SYNC FAIL: guardian could inject tenant_id into family activity';
  end if;

  if not exists (
    select 1 from public.activities
    where child_id='98000000-0000-4000-8000-000000000002'
      and client_entry_id='98000000-0000-4000-8000-000000000004'
      and tenant_id is null
      and status='approved'
      and minutes=30
  ) then
    raise exception 'FAMILY SYNC FAIL: guardian insert/update round-trip missing';
  end if;
end $$;

reset role;

insert into public.profiles(id,display_name,profile_type)
values ('98000000-0000-4000-8000-000000000006','Family Sync Stranger','adult');

select set_config(
  'request.jwt.claims',
  '{"sub":"98000000-0000-4000-8000-000000000006","role":"authenticated"}',
  true
);
set local role authenticated;

do $
declare
  visible_count integer;
  blocked boolean := false;
begin
  select count(*)
    into visible_count
  from public.activities
  where child_id='98000000-0000-4000-8000-000000000002';

  if visible_count <> 0 then
    raise exception 'FAMILY SYNC FAIL: unrelated adult could read child activity';
  end if;

  begin
    insert into public.activities(
      child_id,tenant_id,client_entry_id,client_updated_at,
      activity_date,activity_type,minutes,status,source,updated_at
    ) values (
      '98000000-0000-4000-8000-000000000002',
      null,
      '98000000-0000-4000-8000-000000000007',
      now(),
      '2026-10-03','Unauthorized write',10,'pending','manual',now()
    );
  exception
    when insufficient_privilege then blocked := true;
  end;

  if not blocked then
    raise exception 'FAMILY SYNC FAIL: unrelated adult could write child activity';
  end if;
end $;

reset role;
rollback;

select 'PASS' as status,
       'family activity identity + guardian write + tenant injection + unrelated-adult isolation verified' as summary;
