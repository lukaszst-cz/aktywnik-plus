-- Aktywnik+ database security preflight
-- Read-only verification for the current Supabase schema.
-- Any exception means: do not enable or expand cloud sync.

do $$
declare
  missing_rls text;
  anon_grants text;
  missing_policy text;
  personal_policy_count integer;
begin
  select string_agg(c.relname, ', ' order by c.relname)
    into missing_rls
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relkind='r'
    and not c.relrowsecurity;

  if missing_rls is not null then
    raise exception 'SECURITY PREFLIGHT FAIL: RLS disabled on %', missing_rls;
  end if;

  select string_agg(table_name||':'||privilege_type, ', ' order by table_name,privilege_type)
    into anon_grants
  from information_schema.role_table_grants
  where grantee='anon'
    and table_schema='public';

  if anon_grants is not null then
    raise exception 'SECURITY PREFLIGHT FAIL: anon grants remain: %', anon_grants;
  end if;

  select string_agg(c.relname, ', ' order by c.relname)
    into missing_policy
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relkind='r'
    and not exists (
      select 1
      from pg_policies p
      where p.schemaname='public' and p.tablename=c.relname
    );

  if missing_policy is not null then
    raise exception 'SECURITY PREFLIGHT FAIL: no RLS policy on %', missing_policy;
  end if;

  select count(*)
    into personal_policy_count
  from pg_policies
  where schemaname='public'
    and tablename='personal_activities'
    and roles @> array['authenticated']::name[];

  if personal_policy_count < 4 then
    raise exception 'SECURITY PREFLIGHT FAIL: personal_activities policies incomplete (%)', personal_policy_count;
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname='audit_personal_activity_insert_update' and not tgisinternal
  ) then
    raise exception 'SECURITY PREFLIGHT FAIL: personal activity audit trigger missing';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname='audit_personal_activity_tombstone' and not tgisinternal
  ) then
    raise exception 'SECURITY PREFLIGHT FAIL: personal delete audit trigger missing';
  end if;
end $$;

select
  'PASS' as status,
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r') as public_tables,
  'RLS enabled on every public table; anon blocked; policies present' as check_summary;
