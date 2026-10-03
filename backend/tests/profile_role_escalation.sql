-- Aktywnik+ profile role escalation regression test
-- Synthetic data only. Entire test is rolled back.
-- Run after migration 018.

begin;

insert into public.profiles(id,display_name,profile_type)
values
  ('96000000-0000-4000-8000-000000000001','Role Test Child','child'),
  ('96000000-0000-4000-8000-000000000002','Role Test Adult','adult');

select set_config(
  'request.jwt.claims',
  '{"sub":"96000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
begin
  begin
    update public.profiles
    set profile_type='adult'
    where id='96000000-0000-4000-8000-000000000001';

    raise exception 'PROFILE ROLE FAIL: child self-promotion unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end $$;

update public.profiles
set display_name='Role Test Child Renamed'
where id='96000000-0000-4000-8000-000000000001';

reset role;

do $$
begin
  if (select profile_type from public.profiles where id='96000000-0000-4000-8000-000000000001') <> 'child'
  then raise exception 'PROFILE ROLE FAIL: child profile_type changed'; end if;

  if (select display_name from public.profiles where id='96000000-0000-4000-8000-000000000001') <> 'Role Test Child Renamed'
  then raise exception 'PROFILE ROLE FAIL: allowed display_name update failed'; end if;
end $$;

rollback;

select 'PASS' as status, 'profile_type self-escalation blocked; display_name update preserved' as summary;
