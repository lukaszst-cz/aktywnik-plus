-- Aktywnik+ family decision history regression test
-- Run after migration 025. Synthetic data only. Entire test is rolled back.

begin;

insert into public.profiles(id,display_name,profile_type)
values
  ('9a000000-0000-4000-8000-000000000001','Decision Guardian','adult'),
  ('9a000000-0000-4000-8000-000000000006','Decision Stranger','adult');

insert into public.children(id,display_name,require_parent_approval)
values ('9a000000-0000-4000-8000-000000000002','Decision Child',true);

insert into public.guardians(child_id,guardian_id,guardian_role)
values (
  '9a000000-0000-4000-8000-000000000002',
  '9a000000-0000-4000-8000-000000000001',
  'manager'
);

insert into public.activities(
  id,child_id,tenant_id,client_entry_id,client_updated_at,
  activity_date,activity_type,minutes,status,source,updated_at
) values (
  '9a000000-0000-4000-8000-000000000003',
  '9a000000-0000-4000-8000-000000000002',
  null,
  '9a000000-0000-4000-8000-000000000004',
  '2026-10-03T11:40:00Z',
  '2026-10-03','Spacer',30,'pending','manual','2026-10-03T11:40:00Z'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"9a000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

insert into public.activity_approval_events(
  activity_id,child_id,guardian_id,actor_type,decision,reason,
  before_state,after_state,decided_at,client_event_id,client_entry_id
) values (
  '9a000000-0000-4000-8000-000000000003',
  '9a000000-0000-4000-8000-000000000002',
  '9a000000-0000-4000-8000-000000000001',
  'guardian','approved','test approval',
  '{"status":"pending"}'::jsonb,
  '{"status":"approved"}'::jsonb,
  '2026-10-03T11:41:00Z',
  '9a000000-0000-4000-8000-000000000005',
  '9a000000-0000-4000-8000-000000000004'
);

do $$
declare
  duplicate_blocked boolean := false;
begin
  begin
    insert into public.activity_approval_events(
      activity_id,child_id,guardian_id,actor_type,decision,reason,
      decided_at,client_event_id,client_entry_id
    ) values (
      '9a000000-0000-4000-8000-000000000003',
      '9a000000-0000-4000-8000-000000000002',
      '9a000000-0000-4000-8000-000000000001',
      'guardian','approved','duplicate',
      now(),
      '9a000000-0000-4000-8000-000000000005',
      '9a000000-0000-4000-8000-000000000004'
    );
  exception
    when unique_violation then duplicate_blocked := true;
  end;

  if not duplicate_blocked then
    raise exception 'DECISION HISTORY FAIL: duplicate client_event_id was accepted';
  end if;
end $$;

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"9a000000-0000-4000-8000-000000000006","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  visible_count integer;
  insert_blocked boolean := false;
begin
  select count(*) into visible_count
  from public.activity_approval_events
  where child_id='9a000000-0000-4000-8000-000000000002';

  if visible_count <> 0 then
    raise exception 'DECISION HISTORY FAIL: unrelated adult could read family decision history';
  end if;

  begin
    insert into public.activity_approval_events(
      activity_id,child_id,guardian_id,actor_type,decision,
      decided_at,client_event_id,client_entry_id
    ) values (
      '9a000000-0000-4000-8000-000000000003',
      '9a000000-0000-4000-8000-000000000002',
      '9a000000-0000-4000-8000-000000000006',
      'guardian','rejected',now(),
      '9a000000-0000-4000-8000-000000000007',
      '9a000000-0000-4000-8000-000000000004'
    );
  exception
    when insufficient_privilege then insert_blocked := true;
  end;

  if not insert_blocked then
    raise exception 'DECISION HISTORY FAIL: unrelated adult could insert decision history';
  end if;
end $$;

reset role;

delete from public.activities
where id='9a000000-0000-4000-8000-000000000003';

do $$
begin
  if not exists (
    select 1
    from public.activity_approval_events
    where child_id='9a000000-0000-4000-8000-000000000002'
      and client_event_id='9a000000-0000-4000-8000-000000000005'
      and client_entry_id='9a000000-0000-4000-8000-000000000004'
      and activity_id is null
      and decision='approved'
  ) then
    raise exception 'DECISION HISTORY FAIL: history did not survive activity deletion';
  end if;
end $$;

rollback;

select 'PASS' as status,
       'guardian-only append history + stable client identity + delete retention verified' as summary;
