-- Aktywnik+: teacher class creation permissions. Uses synthetic data, rolled back.
-- Run only on test/isolated DB after migration 026.

begin;

insert into public.tenants(id,name,deployment_mode) values
  ('96000000-0000-4000-8000-000000000001','Teacher Test A','school_saas'),
  ('96000000-0000-4000-8000-000000000002','Teacher Test B','school_saas');

insert into public.profiles(id,display_name,profile_type) values
  ('96000000-0000-4000-8000-000000000011','Teacher A','adult'),
  ('96000000-0000-4000-8000-000000000012','Inactive teacher','adult'),
  ('96000000-0000-4000-8000-000000000013','Unassigned adult','adult');

insert into public.memberships(tenant_id,user_id,role,active) values
  ('96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000011','teacher',true),
  ('96000000-0000-4000-8000-000000000001','96000000-0000-4000-8000-000000000012','teacher',false);

insert into public.school_years(id,tenant_id,label) values
  ('96000000-0000-4000-8000-000000000021','96000000-0000-4000-8000-000000000001','2026/2027'),
  ('96000000-0000-4000-8000-000000000022','96000000-0000-4000-8000-000000000002','2026/2027');

select set_config('request.jwt.claims',
  '{"sub":"96000000-0000-4000-8000-000000000011","role":"authenticated"}',true);
set local role authenticated;

create temporary table teacher_result(class_id uuid) on commit drop;
insert into teacher_result(class_id)
select public.create_school_class_idempotent(
  '96000000-0000-4000-8000-000000000001',
  '96000000-0000-4000-8000-000000000021',
  '6A WF','96000000-0000-4000-8000-000000000031'
);

do $$
begin
  if not exists (
    select 1 from public.class_teachers ct
    where ct.class_id=(select class_id from teacher_result)
      and ct.teacher_id='96000000-0000-4000-8000-000000000011'
  ) then raise exception 'Teacher not assigned to created class'; end if;

  begin
    perform public.create_school_class_idempotent(
      '96000000-0000-4000-8000-000000000002',
      '96000000-0000-4000-8000-000000000022',
      'Forbidden Class','96000000-0000-4000-8000-000000000032');
    raise exception 'Unauthorized cross-school create allowed';
  exception
    when others then
      if sqlerrm='Unauthorized cross-school create allowed' then raise; end if;
      if sqlerrm not like '%forbidden%' then raise; end if;
  end;

  begin
    perform public.create_school_class(
      '96000000-0000-4000-8000-000000000001',
      '96000000-0000-4000-8000-000000000022','Wrong Year');
    raise exception 'Cross-school year accepted';
  exception
    when others then
      if sqlerrm='Cross-school year accepted' then raise; end if;
      if sqlerrm not like '%school_year_not_found%' then raise; end if;
  end;
end;
$$;

reset role;

select set_config('request.jwt.claims',
  '{"sub":"96000000-0000-4000-8000-000000000012","role":"authenticated"}',true);
set local role authenticated;

do $$
begin
  begin
    perform public.create_school_class(
      '96000000-0000-4000-8000-000000000001',
      '96000000-0000-4000-8000-000000000021','Inactive');
    raise exception 'Inactive teacher create allowed';
  exception when others then
    if sqlerrm='Inactive teacher create allowed' then raise; end if;
    if sqlerrm not like '%forbidden%' then raise; end if;
  end;
end;
$$;

reset role;
rollback;
select 'PASS' as status, 'teacher class creation isolated by school membership' as summary;
