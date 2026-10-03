-- Aktywnik+ family cloud onboarding test
-- Synthetic data only. Entire test is rolled back.

begin;

insert into profiles(id,display_name,profile_type)
values ('94000000-0000-4000-8000-000000000001','Family Test Parent','adult');

select set_config(
  'request.jwt.claims',
  '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

create temporary table family_result(child_id uuid) on commit drop;

insert into family_result(child_id)
select public.create_guardian_child('Family Test Child');

do $$
begin
  if (select count(*) from children where id=(select child_id from family_result)) <> 1
  then raise exception 'FAMILY ONBOARDING FAIL: child not visible to guardian'; end if;

  if not exists (
    select 1 from guardians g
    where g.child_id=(select child_id from family_result)
      and g.guardian_id='94000000-0000-4000-8000-000000000001'
      and g.guardian_role='manager'
  ) then raise exception 'FAMILY ONBOARDING FAIL: guardian relation missing'; end if;
end $$;

reset role;

do $$
begin
  if not exists (
    select 1 from audit_events a
    where a.actor_id='94000000-0000-4000-8000-000000000001'
      and a.event_type='family_child_created'
      and a.resource_type='child'
      and a.resource_id=(select child_id from family_result)
  ) then raise exception 'FAMILY ONBOARDING FAIL: audit event missing'; end if;
end $$;

rollback;

select 'PASS' as status, 'guardian child cloud onboarding verified' as summary;
