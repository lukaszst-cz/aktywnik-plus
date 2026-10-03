-- Aktywnik+ database security preflight
-- Read-only verification for the current Supabase schema.
-- Any exception means: do not enable or expand cloud sync.

do $$
declare
  missing_rls text;
  anon_grants text;
  missing_policy text;
  personal_policy_count integer;
  allowed_definer_count integer;
  unexpected_authenticated_definer text;
  unsafe_allowlisted_definer text;
  profile_update_columns text;
  school_audit_trigger_count integer;
  retention_auth_exec boolean;
  retention_anon_exec boolean;
  retention_service_exec boolean;
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

  select string_agg(column_name, ',' order by column_name)
    into profile_update_columns
  from information_schema.column_privileges
  where grantee='authenticated'
    and table_schema='public'
    and table_name='profiles'
    and privilege_type='UPDATE';

  if profile_update_columns is distinct from 'display_name' then
    raise exception 'SECURITY PREFLIGHT FAIL: authenticated profile UPDATE columns must be display_name only (got %)',
      coalesce(profile_update_columns,'none');
  end if;

  -- Public SECURITY DEFINER RPCs are a temporary, reviewed exception for the
  -- school lifecycle. Keep the allowlist exact and fail closed if the surface grows.
  with allowed(name,args) as (
    values
      ('create_class_invite','target_class uuid, valid_days integer'),
      ('create_guardian_child','child_name text'),
      ('create_school_class','target_tenant uuid, target_school_year uuid, class_name text'),
      ('decide_class_join','target_request uuid, decision text'),
      ('request_class_join','invite_token uuid, target_child uuid')
  )
  select count(*)
    into allowed_definer_count
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  join allowed a
    on a.name=p.proname
   and a.args=pg_get_function_identity_arguments(p.oid)
  where n.nspname='public';

  if allowed_definer_count <> 5 then
    raise exception 'SECURITY PREFLIGHT FAIL: reviewed SECURITY DEFINER RPC allowlist mismatch (%)', allowed_definer_count;
  end if;

  with allowed(name,args) as (
    values
      ('create_class_invite','target_class uuid, valid_days integer'),
      ('create_guardian_child','child_name text'),
      ('create_school_class','target_tenant uuid, target_school_year uuid, class_name text'),
      ('decide_class_join','target_request uuid, decision text'),
      ('request_class_join','invite_token uuid, target_child uuid')
  )
  select string_agg(
           p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
           ', ' order by p.proname
         )
    into unexpected_authenticated_definer
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.prosecdef
    and has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not exists (
      select 1
      from allowed a
      where a.name=p.proname
        and a.args=pg_get_function_identity_arguments(p.oid)
    );

  if unexpected_authenticated_definer is not null then
    raise exception 'SECURITY PREFLIGHT FAIL: unreviewed authenticated SECURITY DEFINER RPC(s): %',
      unexpected_authenticated_definer;
  end if;

  with allowed(name,args) as (
    values
      ('create_class_invite','target_class uuid, valid_days integer'),
      ('create_guardian_child','child_name text'),
      ('create_school_class','target_tenant uuid, target_school_year uuid, class_name text'),
      ('decide_class_join','target_request uuid, decision text'),
      ('request_class_join','invite_token uuid, target_child uuid')
  )
  select string_agg(
           p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
           ', ' order by p.proname
         )
    into unsafe_allowlisted_definer
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  join allowed a
    on a.name=p.proname
   and a.args=pg_get_function_identity_arguments(p.oid)
  where n.nspname='public'
    and (
      not p.prosecdef
      or not has_function_privilege('authenticated',p.oid,'EXECUTE')
      or has_function_privilege('anon',p.oid,'EXECUTE')
      or has_function_privilege('public',p.oid,'EXECUTE')
      or not coalesce(p.proconfig @> array['search_path=""']::text[],false)
      or position('auth.uid()' in pg_get_functiondef(p.oid))=0
    );

  if unsafe_allowlisted_definer is not null then
    raise exception 'SECURITY PREFLIGHT FAIL: reviewed SECURITY DEFINER RPC hardening changed: %',
      unsafe_allowlisted_definer;
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

  select count(*)
    into school_audit_trigger_count
  from pg_trigger
  where tgname in (
    'audit_school_activities',
    'audit_school_reports',
    'audit_school_rewards',
    'audit_school_class_children',
    'audit_school_class_teachers',
    'audit_school_classes',
    'audit_school_memberships',
    'audit_support_access_grants'
  )
    and not tgisinternal;

  if school_audit_trigger_count <> 8 then
    raise exception 'SECURITY PREFLIGHT FAIL: SCHOOL audit trigger coverage incomplete (%)',
      school_audit_trigger_count;
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='app_private'
      and p.proname='audit_school_change'
      and p.prosecdef
  ) then
    raise exception 'SECURITY PREFLIGHT FAIL: private School audit function missing';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='app_private'
      and p.proname='prune_audit_events'
      and p.prosecdef
  ) then
    raise exception 'SECURITY PREFLIGHT FAIL: private audit retention function missing';
  end if;

  select
    has_function_privilege('authenticated','app_private.prune_audit_events(timestamptz,boolean)'::regprocedure,'EXECUTE'),
    has_function_privilege('anon','app_private.prune_audit_events(timestamptz,boolean)'::regprocedure,'EXECUTE'),
    has_function_privilege('service_role','app_private.prune_audit_events(timestamptz,boolean)'::regprocedure,'EXECUTE')
  into retention_auth_exec,retention_anon_exec,retention_service_exec;

  if retention_auth_exec or retention_anon_exec or not retention_service_exec then
    raise exception 'SECURITY PREFLIGHT FAIL: audit retention privileges invalid auth=% anon=% service=%',
      retention_auth_exec,retention_anon_exec,retention_service_exec;
  end if;
end $$;

select
  'PASS' as status,
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r') as public_tables,
  'RLS enabled; anon blocked; profile role protected; personal+School audit present; private retention guarded; SECURITY DEFINER surface allowlisted' as check_summary;
