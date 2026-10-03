begin;

-- Aktywnik+ School audit + retention regression test
-- Synthetic data only. Entire test is rolled back.

insert into public.profiles(id,display_name,profile_type)
values ('97000000-0000-4000-8000-000000000001','Audit Retention Admin','adult');

insert into public.tenants(id,name,deployment_mode)
values ('97000000-0000-4000-8000-000000000002','Audit Retention School','school_saas');

insert into public.school_years(id,tenant_id,label)
values ('97000000-0000-4000-8000-000000000003','97000000-0000-4000-8000-000000000002','2026/2027');

insert into public.classes(id,tenant_id,school_year_id,name,join_code)
values (
 '97000000-0000-4000-8000-000000000004',
 '97000000-0000-4000-8000-000000000002',
 '97000000-0000-4000-8000-000000000003',
 'AUDIT TEST','AUDIT9700'
);

insert into public.children(id,display_name)
values ('97000000-0000-4000-8000-000000000005','Audit Child');

select set_config(
  'request.jwt.claims',
  '{"sub":"97000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

insert into public.memberships(tenant_id,user_id,role,active)
values (
 '97000000-0000-4000-8000-000000000002',
 '97000000-0000-4000-8000-000000000001',
 'school_admin',true
);

insert into public.class_teachers(class_id,teacher_id)
values ('97000000-0000-4000-8000-000000000004','97000000-0000-4000-8000-000000000001');

insert into public.class_children(class_id,child_id,participation_mode,status,report_status)
values (
 '97000000-0000-4000-8000-000000000004',
 '97000000-0000-4000-8000-000000000005',
 'digital','active','missing'
);

insert into public.activities(
 id,child_id,tenant_id,activity_date,activity_type,minutes,status,source
) values (
 '97000000-0000-4000-8000-000000000006',
 '97000000-0000-4000-8000-000000000005',
 '97000000-0000-4000-8000-000000000002',
 '2026-10-03','Spacer',30,'approved','manual'
);

update public.activities
set minutes=35,updated_at=now()
where id='97000000-0000-4000-8000-000000000006';

insert into public.reports(
 id,child_id,class_id,period_type,period_start,period_end,status,submitted_by
) values (
 '97000000-0000-4000-8000-000000000007',
 '97000000-0000-4000-8000-000000000005',
 '97000000-0000-4000-8000-000000000004',
 'month','2026-10-01','2026-10-31','submitted',
 '97000000-0000-4000-8000-000000000001'
);

insert into public.rewards(
 id,child_id,class_id,teacher_id,kind,value,issued_at
) values (
 '97000000-0000-4000-8000-000000000008',
 '97000000-0000-4000-8000-000000000005',
 '97000000-0000-4000-8000-000000000004',
 '97000000-0000-4000-8000-000000000001',
 'plus','+','2026-10-03'
);

delete from public.rewards
where id='97000000-0000-4000-8000-000000000008';

insert into public.audit_events(
 id,tenant_id,actor_id,event_type,resource_type,resource_id,created_at
) values (
 '97000000-0000-4000-8000-000000000009',
 '97000000-0000-4000-8000-000000000002',
 '97000000-0000-4000-8000-000000000001',
 'retention_test_old','test',null,'2000-01-01T00:00:00Z'
);

do $$
declare
  dry_count bigint;
  deleted_count bigint;
begin
  if not exists (
    select 1 from public.audit_events
    where actor_id='97000000-0000-4000-8000-000000000001'
      and event_type='school_activity_created'
  ) then raise exception 'SCHOOL AUDIT FAIL: activity create'; end if;

  if not exists (
    select 1 from public.audit_events
    where actor_id='97000000-0000-4000-8000-000000000001'
      and event_type='school_activity_updated'
  ) then raise exception 'SCHOOL AUDIT FAIL: activity update'; end if;

  if not exists (
    select 1 from public.audit_events
    where actor_id='97000000-0000-4000-8000-000000000001'
      and event_type='school_report_created'
  ) then raise exception 'SCHOOL AUDIT FAIL: report'; end if;

  if not exists (
    select 1 from public.audit_events
    where actor_id='97000000-0000-4000-8000-000000000001'
      and event_type='school_reward_created'
  ) then raise exception 'SCHOOL AUDIT FAIL: reward create'; end if;

  if not exists (
    select 1 from public.audit_events
    where actor_id='97000000-0000-4000-8000-000000000001'
      and event_type='school_reward_deleted'
  ) then raise exception 'SCHOOL AUDIT FAIL: reward delete'; end if;

  if not exists (
    select 1 from public.audit_events
    where actor_id='97000000-0000-4000-8000-000000000001'
      and event_type='class_membership_created'
  ) then raise exception 'SCHOOL AUDIT FAIL: class membership'; end if;

  if not exists (
    select 1 from public.audit_events
    where actor_id='97000000-0000-4000-8000-000000000001'
      and event_type='class_teacher_created'
  ) then raise exception 'SCHOOL AUDIT FAIL: class teacher'; end if;

  if not exists (
    select 1 from public.audit_events
    where actor_id='97000000-0000-4000-8000-000000000001'
      and event_type='tenant_membership_created'
  ) then raise exception 'SCHOOL AUDIT FAIL: tenant membership'; end if;

  dry_count := app_private.prune_audit_events('2000-01-02T00:00:00Z',true);
  if dry_count <> 1 then raise exception 'RETENTION FAIL: dry-run expected 1 got %',dry_count; end if;

  if not exists(select 1 from public.audit_events where id='97000000-0000-4000-8000-000000000009')
  then raise exception 'RETENTION FAIL: dry-run deleted row'; end if;

  deleted_count := app_private.prune_audit_events('2000-01-02T00:00:00Z',false);
  if deleted_count <> 1 then raise exception 'RETENTION FAIL: delete expected 1 got %',deleted_count; end if;

  if exists(select 1 from public.audit_events where id='97000000-0000-4000-8000-000000000009')
  then raise exception 'RETENTION FAIL: row not deleted'; end if;

  if has_function_privilege('authenticated','app_private.prune_audit_events(timestamptz,boolean)'::regprocedure,'EXECUTE')
  then raise exception 'RETENTION FAIL: authenticated can execute prune'; end if;
end $$;

rollback;

select 'PASS' as status, 'school audit triggers + private dry-run retention mechanism verified' as summary;
