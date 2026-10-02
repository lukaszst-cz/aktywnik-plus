-- Aktywnik+ database security preflight
-- Read-only checks after migrations 001-007.
-- Any exception means: DO NOT enable cloud sync.

do $$
declare
  missing_rls text;
  anon_grants text;
  missing_policy text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
    into missing_rls
  from pg_class c
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public'
    and c.relkind='r'
    and c.relname in (
      'tenants','profiles','memberships','school_years','classes','class_teachers',
      'children','guardians','class_children','activities','activity_approvals',
      'reports','rewards','audit_events','support_access_grants','child_accounts',
      'activity_approval_events','pairing_codes','report_items'
    )
    and not c.relrowsecurity;

  if missing_rls is not null then
    raise exception 'SECURITY PREFLIGHT FAIL: RLS disabled on %', missing_rls;
  end if;

  select string_agg(table_name||':'||privilege_type, ', ' order by table_name,privilege_type)
    into anon_grants
  from information_schema.role_table_grants
  where grantee='anon'
    and table_schema='public'
    and table_name in (
      'tenants','profiles','memberships','school_years','classes','class_teachers',
      'children','guardians','class_children','activities','activity_approvals',
      'reports','rewards','audit_events','support_access_grants','child_accounts',
      'activity_approval_events','pairing_codes','report_items'
    );

  if anon_grants is not null then
    raise exception 'SECURITY PREFLIGHT FAIL: anon grants remain: %', anon_grants;
  end if;

  select string_agg(t.table_name, ', ' order by t.table_name)
    into missing_policy
  from (values
    ('profiles'),('memberships'),('classes'),('children'),('guardians'),
    ('class_children'),('activities'),('reports'),('report_items'),
    ('child_accounts'),('activity_approval_events'),('pairing_codes')
  ) as t(table_name)
  where not exists (
    select 1
    from pg_policies p
    where p.schemaname='public' and p.tablename=t.table_name
  );

  if missing_policy is not null then
    raise exception 'SECURITY PREFLIGHT FAIL: no RLS policy on %', missing_policy;
  end if;
end $$;

select
  'PASS' as status,
  'RLS enabled, anon blocked, key policies present' as check_summary;
