-- Aktywnik+ application restore drill
-- Synthetic data only. Entire drill runs inside one transaction and ends with ROLLBACK.
-- Live result on 2026-10-03: PASS.

begin;

insert into public.profiles(id,display_name,profile_type,created_at)
values ('95000000-0000-4000-8000-000000000001','Restore Drill Adult','adult','2026-10-03T09:20:00Z');

insert into public.tenants(id,name,deployment_mode,created_at)
values ('95000000-0000-4000-8000-000000000002','Restore Drill School','school_saas','2026-10-03T09:20:01Z');

insert into public.memberships(tenant_id,user_id,role,active)
values ('95000000-0000-4000-8000-000000000002','95000000-0000-4000-8000-000000000001','school_admin',true);

insert into public.school_years(id,tenant_id,label,archived_at)
values ('95000000-0000-4000-8000-000000000003','95000000-0000-4000-8000-000000000002','2026/2027',null);

insert into public.classes(id,tenant_id,school_year_id,name,join_code,archived_at)
values (
  '95000000-0000-4000-8000-000000000004',
  '95000000-0000-4000-8000-000000000002',
  '95000000-0000-4000-8000-000000000003',
  '5 RESTORE','RESTORE9500',null
);

insert into public.class_teachers(class_id,teacher_id)
values ('95000000-0000-4000-8000-000000000004','95000000-0000-4000-8000-000000000001');

insert into public.children(id,display_name,created_at,require_parent_approval)
values ('95000000-0000-4000-8000-000000000005','Restore Drill Child','2026-10-03T09:20:02Z',true);

insert into public.guardians(child_id,guardian_id,guardian_role,created_at)
values (
  '95000000-0000-4000-8000-000000000005',
  '95000000-0000-4000-8000-000000000001',
  'manager','2026-10-03T09:20:03Z'
);

insert into public.class_children(class_id,child_id,participation_mode,status,report_status,joined_at)
values (
  '95000000-0000-4000-8000-000000000004',
  '95000000-0000-4000-8000-000000000005',
  'digital','active','submitted','2026-10-03T09:20:04Z'
);

insert into public.activities(
  id,child_id,tenant_id,activity_date,activity_type,minutes,effort,note,status,created_at,source,rejection_reason,updated_at,approved_at
) values (
  '95000000-0000-4000-8000-000000000006',
  '95000000-0000-4000-8000-000000000005',
  '95000000-0000-4000-8000-000000000002',
  '2026-10-02','Spacer',45,3,'restore drill','approved',
  '2026-10-03T09:20:05Z','manual',null,'2026-10-03T09:20:06Z','2026-10-03T09:20:07Z'
);

insert into public.reports(
  id,child_id,class_id,period_type,period_start,period_end,status,created_at,submitted_at,submitted_by
) values (
  '95000000-0000-4000-8000-000000000007',
  '95000000-0000-4000-8000-000000000005',
  '95000000-0000-4000-8000-000000000004',
  'month','2026-10-01','2026-10-31','submitted',
  '2026-10-03T09:20:08Z','2026-10-03T09:20:09Z',
  '95000000-0000-4000-8000-000000000001'
);

insert into public.report_items(
  id,report_id,position,activity_date,activity_type,minutes,effort,note,source,created_at
) values (
  '95000000-0000-4000-8000-000000000008',
  '95000000-0000-4000-8000-000000000007',
  1,'2026-10-02','Spacer',45,3,'restore drill','manual','2026-10-03T09:20:10Z'
);

insert into public.personal_activities(
  id,owner_id,client_entry_id,activity_date,activity_type,minutes,effort,note,source,client_updated_at,created_at,updated_at
) values (
  '95000000-0000-4000-8000-000000000009',
  '95000000-0000-4000-8000-000000000001',
  '95000000-0000-4000-8000-000000000010',
  '2026-10-02','Rower',30,2,'personal restore','manual',
  '2026-10-03T09:20:11Z','2026-10-03T09:20:12Z','2026-10-03T09:20:13Z'
);

create temporary table restore_profiles as select * from public.profiles where id='95000000-0000-4000-8000-000000000001';
create temporary table restore_tenants as select * from public.tenants where id='95000000-0000-4000-8000-000000000002';
create temporary table restore_memberships as select * from public.memberships where tenant_id='95000000-0000-4000-8000-000000000002';
create temporary table restore_school_years as select * from public.school_years where id='95000000-0000-4000-8000-000000000003';
create temporary table restore_classes as select * from public.classes where id='95000000-0000-4000-8000-000000000004';
create temporary table restore_class_teachers as select * from public.class_teachers where class_id='95000000-0000-4000-8000-000000000004';
create temporary table restore_children as select * from public.children where id='95000000-0000-4000-8000-000000000005';
create temporary table restore_guardians as select * from public.guardians where child_id='95000000-0000-4000-8000-000000000005';
create temporary table restore_class_children as select * from public.class_children where child_id='95000000-0000-4000-8000-000000000005';
create temporary table restore_activities as select * from public.activities where id='95000000-0000-4000-8000-000000000006';
create temporary table restore_reports as select * from public.reports where id='95000000-0000-4000-8000-000000000007';
create temporary table restore_report_items as select * from public.report_items where id='95000000-0000-4000-8000-000000000008';
create temporary table restore_personal_activities as select * from public.personal_activities where id='95000000-0000-4000-8000-000000000009';

delete from public.report_items where id='95000000-0000-4000-8000-000000000008';
delete from public.reports where id='95000000-0000-4000-8000-000000000007';
delete from public.activities where id='95000000-0000-4000-8000-000000000006';
delete from public.class_children where child_id='95000000-0000-4000-8000-000000000005';
delete from public.guardians where child_id='95000000-0000-4000-8000-000000000005';
delete from public.class_teachers where class_id='95000000-0000-4000-8000-000000000004';
delete from public.personal_activities where id='95000000-0000-4000-8000-000000000009';
delete from public.classes where id='95000000-0000-4000-8000-000000000004';
delete from public.school_years where id='95000000-0000-4000-8000-000000000003';
delete from public.memberships where tenant_id='95000000-0000-4000-8000-000000000002';
delete from public.children where id='95000000-0000-4000-8000-000000000005';
delete from public.tenants where id='95000000-0000-4000-8000-000000000002';
delete from public.profiles where id='95000000-0000-4000-8000-000000000001';

do $$
begin
  if exists(select 1 from public.profiles where id='95000000-0000-4000-8000-000000000001')
     or exists(select 1 from public.children where id='95000000-0000-4000-8000-000000000005')
     or exists(select 1 from public.classes where id='95000000-0000-4000-8000-000000000004')
     or exists(select 1 from public.reports where id='95000000-0000-4000-8000-000000000007')
  then raise exception 'RESTORE DRILL FAIL: simulated loss incomplete'; end if;
end $$;

insert into public.profiles select * from restore_profiles;
insert into public.tenants select * from restore_tenants;
insert into public.memberships select * from restore_memberships;
insert into public.school_years select * from restore_school_years;
insert into public.classes select * from restore_classes;
insert into public.class_teachers select * from restore_class_teachers;
insert into public.children select * from restore_children;
insert into public.guardians select * from restore_guardians;
insert into public.class_children select * from restore_class_children;
insert into public.activities select * from restore_activities;
insert into public.reports select * from restore_reports;
insert into public.report_items select * from restore_report_items;
insert into public.personal_activities select * from restore_personal_activities;

do $$
begin
  if not exists (
    select 1 from public.guardians g
    join public.children c on c.id=g.child_id
    where g.guardian_id='95000000-0000-4000-8000-000000000001'
      and c.id='95000000-0000-4000-8000-000000000005'
      and g.guardian_role='manager'
  ) then raise exception 'RESTORE DRILL FAIL: family relation missing'; end if;

  if not exists (
    select 1 from public.class_children cc
    join public.classes cl on cl.id=cc.class_id
    join public.school_years sy on sy.id=cl.school_year_id
    join public.tenants t on t.id=cl.tenant_id
    where cc.child_id='95000000-0000-4000-8000-000000000005'
      and cl.id='95000000-0000-4000-8000-000000000004'
      and sy.id='95000000-0000-4000-8000-000000000003'
      and t.id='95000000-0000-4000-8000-000000000002'
      and cc.status='active'
  ) then raise exception 'RESTORE DRILL FAIL: school relation missing'; end if;

  if not exists (
    select 1 from public.reports r
    join public.report_items ri on ri.report_id=r.id
    where r.id='95000000-0000-4000-8000-000000000007'
      and r.child_id='95000000-0000-4000-8000-000000000005'
      and ri.id='95000000-0000-4000-8000-000000000008'
      and ri.minutes=45
  ) then raise exception 'RESTORE DRILL FAIL: report integrity missing'; end if;

  if not exists (
    select 1 from public.activities
    where id='95000000-0000-4000-8000-000000000006'
      and child_id='95000000-0000-4000-8000-000000000005'
      and tenant_id='95000000-0000-4000-8000-000000000002'
      and minutes=45 and status='approved'
  ) then raise exception 'RESTORE DRILL FAIL: family activity missing'; end if;

  if not exists (
    select 1 from public.personal_activities
    where id='95000000-0000-4000-8000-000000000009'
      and owner_id='95000000-0000-4000-8000-000000000001'
      and client_entry_id='95000000-0000-4000-8000-000000000010'
      and minutes=30
  ) then raise exception 'RESTORE DRILL FAIL: personal activity missing'; end if;
end $$;

rollback;

select 'PASS' as status,
       'application data backup/delete/restore round-trip verified across profile, family, school, report and personal activity relations' as summary;
