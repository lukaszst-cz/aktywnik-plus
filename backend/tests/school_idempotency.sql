-- Aktywnik+ School Cloud idempotency regression test
-- Synthetic data only. Entire test is rolled back.
-- Run after migration 023.

begin;

insert into public.profiles(id,display_name,profile_type)
values ('98000000-0000-4000-8000-000000000001','Idempotency Test Adult','adult');

insert into public.tenants(id,name,deployment_mode)
values ('98000000-0000-4000-8000-000000000010','Idempotency School','school_saas');

insert into public.memberships(tenant_id,user_id,role,active)
values (
  '98000000-0000-4000-8000-000000000010',
  '98000000-0000-4000-8000-000000000001',
  'school_admin',
  true
);

insert into public.school_years(id,tenant_id,label)
values (
  '98000000-0000-4000-8000-000000000020',
  '98000000-0000-4000-8000-000000000010',
  '2098/2099'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"98000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  child_a uuid;
  child_b uuid;
  class_a uuid;
  class_b uuid;
  invite_a uuid;
  invite_b uuid;
  blocked boolean := false;
begin
  child_a := public.create_guardian_child_idempotent(
    'Idempotency Child',
    '98000000-0000-4000-8000-000000000101'
  );
  child_b := public.create_guardian_child_idempotent(
    'Idempotency Child',
    '98000000-0000-4000-8000-000000000101'
  );

  if child_a is distinct from child_b then
    raise exception 'IDEMPOTENCY FAIL: child retry returned different result';
  end if;

  if (
    select count(*) from public.guardians
    where guardian_id='98000000-0000-4000-8000-000000000001'
      and child_id=child_a
  ) <> 1 then
    raise exception 'IDEMPOTENCY FAIL: child guardian relation duplicated/missing';
  end if;

  begin
    perform public.create_guardian_child_idempotent(
      'Different Child',
      '98000000-0000-4000-8000-000000000101'
    );
  exception
    when others then
      if sqlerrm='idempotency_key_reused_with_different_payload' then
        blocked := true;
      else
        raise;
      end if;
  end;

  if not blocked then
    raise exception 'IDEMPOTENCY FAIL: reused child key with different payload was accepted';
  end if;

  class_a := public.create_school_class_idempotent(
    '98000000-0000-4000-8000-000000000010',
    '98000000-0000-4000-8000-000000000020',
    'Retry Class',
    '98000000-0000-4000-8000-000000000102'
  );
  class_b := public.create_school_class_idempotent(
    '98000000-0000-4000-8000-000000000010',
    '98000000-0000-4000-8000-000000000020',
    'Retry Class',
    '98000000-0000-4000-8000-000000000102'
  );

  if class_a is distinct from class_b then
    raise exception 'IDEMPOTENCY FAIL: class retry returned different result';
  end if;

  if (
    select count(*) from public.classes
    where id=class_a
  ) <> 1 then
    raise exception 'IDEMPOTENCY FAIL: class duplicated/missing';
  end if;

  invite_a := public.create_class_invite_idempotent(
    class_a,
    '98000000-0000-4000-8000-000000000103',
    14
  );
  invite_b := public.create_class_invite_idempotent(
    class_a,
    '98000000-0000-4000-8000-000000000103',
    14
  );

  if invite_a is distinct from invite_b then
    raise exception 'IDEMPOTENCY FAIL: invite retry returned different token';
  end if;

  if (
    select count(*) from public.class_invites
    where class_id=class_a
      and token=invite_a
  ) <> 1 then
    raise exception 'IDEMPOTENCY FAIL: invite duplicated/missing';
  end if;
end $$;

reset role;

do $$
begin
  if (
    select count(*) from public.audit_events
    where actor_id='98000000-0000-4000-8000-000000000001'
      and event_type='family_child_created'
  ) <> 1 then
    raise exception 'IDEMPOTENCY FAIL: child audit duplicated/missing';
  end if;
end $$;

do $$
begin
  if has_table_privilege('authenticated','app_private.idempotency_keys','SELECT')
     or has_table_privilege('authenticated','app_private.idempotency_keys','INSERT')
     or has_table_privilege('authenticated','app_private.idempotency_keys','UPDATE')
     or has_table_privilege('anon','app_private.idempotency_keys','SELECT')
  then
    raise exception 'IDEMPOTENCY FAIL: private ledger has direct client grants';
  end if;
end $$;

rollback;

select 'PASS' as status, 'School Cloud create retries are idempotent and ledger stays private' as summary;
