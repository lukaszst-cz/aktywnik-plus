-- Aktywnik+ class lifecycle test
-- Synthetic data only. Entire test is rolled back.

begin;

insert into tenants(id,name,deployment_mode)
values ('93000000-0000-4000-8000-000000000001','Lifecycle Test School','school_saas');

insert into profiles(id,display_name,profile_type) values
('93000000-0000-4000-8000-000000000002','Lifecycle Admin','adult'),
('93000000-0000-4000-8000-000000000003','Lifecycle Parent','adult');

insert into memberships(tenant_id,user_id,role,active)
values ('93000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000002','school_admin',true);

insert into school_years(id,tenant_id,label)
values ('93000000-0000-4000-8000-000000000004','93000000-0000-4000-8000-000000000001','2026/2027');

insert into children(id,display_name,require_parent_approval)
values ('93000000-0000-4000-8000-000000000005','Lifecycle Child',true);

insert into guardians(child_id,guardian_id,guardian_role)
values (
  '93000000-0000-4000-8000-000000000005',
  '93000000-0000-4000-8000-000000000003',
  'manager'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"93000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

create temporary table lifecycle_result(
  class_id uuid,
  invite_token uuid,
  request_id uuid
) on commit drop;

insert into lifecycle_result(class_id)
select public.create_school_class(
  '93000000-0000-4000-8000-000000000001',
  '93000000-0000-4000-8000-000000000004',
  '5 TEST'
);

update lifecycle_result
set invite_token=public.create_class_invite(class_id,7);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"93000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);
set local role authenticated;

update lifecycle_result
set request_id=public.request_class_join(
  invite_token,
  '93000000-0000-4000-8000-000000000005'
);

reset role;

select set_config(
  'request.jwt.claims',
  '{"sub":"93000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select public.decide_class_join(
  (select request_id from lifecycle_result),
  'accepted'
);

reset role;

do $$
begin
  if not exists (
    select 1 from class_children cc
    where cc.class_id=(select class_id from lifecycle_result)
      and cc.child_id='93000000-0000-4000-8000-000000000005'
      and cc.status='active'
  ) then raise exception 'LIFECYCLE FAIL: child not active in class'; end if;

  if not exists (
    select 1 from class_teachers ct
    where ct.class_id=(select class_id from lifecycle_result)
      and ct.teacher_id='93000000-0000-4000-8000-000000000002'
  ) then raise exception 'LIFECYCLE FAIL: creator not assigned to class'; end if;

  if (select count(*) from audit_events a
      where a.tenant_id='93000000-0000-4000-8000-000000000001'
        and a.event_type in (
          'class_created',
          'class_invite_created',
          'class_join_requested',
          'class_join_accepted'
        )) <> 4
  then raise exception 'LIFECYCLE FAIL: audit trail incomplete'; end if;
end $$;

rollback;

select 'PASS' as status, 'class create/invite/request/accept lifecycle verified' as summary;
