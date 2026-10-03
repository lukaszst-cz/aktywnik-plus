-- Aktywnik+ database security preflight
-- Read-only verification for the current Supabase schema.
-- Any exception means: do not enable or expand cloud sync.

do $$
declare
  missing_rls text;
  anon_grants text;
  missing_policy text;
  personal_policy_count integer;
  public_authenticated_definer text;
  invoker_wrapper_count integer;
  private_lifecycle_helper_count integer;
  idempotent_invoker_count integer;
  idempotent_private_count integer;
  idempotency_direct_grants text;
  unsafe_auth_helper text;
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

  -- Public API RPCs must not run with SECURITY DEFINER privileges.
  select string_agg(
           p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
           ', ' order by p.proname
         )
    into public_authenticated_definer
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.prosecdef
    and has_function_privilege('authenticated',p.oid,'EXECUTE');

  if public_authenticated_definer is not null then
    raise exception 'SECURITY PREFLIGHT FAIL: public authenticated SECURITY DEFINER RPC(s): %',
      public_authenticated_definer;
  end if;

  with expected(name,args) as (
    values
      ('create_class_invite','target_class uuid, valid_days integer'),
      ('create_guardian_child','child_name text'),
      ('create_school_class','target_tenant uuid, target_school_year uuid, class_name text'),
      ('decide_class_join','target_request uuid, decision text'),
      ('request_class_join','invite_token uuid, target_child uuid')
  )
  select count(*)
    into invoker_wrapper_count
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  join expected e
    on e.name=p.proname
   and e.args=pg_get_function_identity_arguments(p.oid)
  where n.nspname='public'
    and not p.prosecdef
    and has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not has_function_privilege('anon',p.oid,'EXECUTE')
    and not has_function_privilege('public',p.oid,'EXECUTE')
    and coalesce(p.proconfig @> array['search_path=""']::text[],false)
    and position('app_private.' in pg_get_functiondef(p.oid))>0;

  if invoker_wrapper_count <> 5 then
    raise exception 'SECURITY PREFLIGHT FAIL: public SECURITY INVOKER wrapper set mismatch (%)',
      invoker_wrapper_count;
  end if;

  with expected(name,args) as (
    values
      ('create_class_invite_secure','target_class uuid, valid_days integer'),
      ('create_guardian_child_secure','child_name text'),
      ('create_school_class_secure','target_tenant uuid, target_school_year uuid, class_name text'),
      ('decide_class_join_secure','target_request uuid, decision text'),
      ('request_class_join_secure','invite_token uuid, target_child uuid')
  )
  select count(*)
    into private_lifecycle_helper_count
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  join expected e
    on e.name=p.proname
   and e.args=pg_get_function_identity_arguments(p.oid)
  where n.nspname='app_private'
    and p.prosecdef
    and has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not has_function_privilege('anon',p.oid,'EXECUTE')
    and not has_function_privilege('public',p.oid,'EXECUTE')
    and coalesce(p.proconfig @> array['search_path=""']::text[],false)
    and position('auth.uid()' in pg_get_functiondef(p.oid))>0;

  if private_lifecycle_helper_count <> 5 then
    raise exception 'SECURITY PREFLIGHT FAIL: private lifecycle helper set mismatch (%)',
      private_lifecycle_helper_count;
  end if;

  with expected(name,args) as (
    values
      ('create_class_invite_idempotent','target_class uuid, operation_key uuid, valid_days integer'),
      ('create_guardian_child_idempotent','child_name text, operation_key uuid'),
      ('create_school_class_idempotent','target_tenant uuid, target_school_year uuid, class_name text, operation_key uuid')
  )
  select count(*)
    into idempotent_invoker_count
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  join expected e
    on e.name=p.proname
   and e.args=pg_get_function_identity_arguments(p.oid)
  where n.nspname='public'
    and not p.prosecdef
    and has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not has_function_privilege('anon',p.oid,'EXECUTE')
    and not has_function_privilege('public',p.oid,'EXECUTE')
    and coalesce(p.proconfig @> array['search_path=""']::text[],false)
    and position('app_private.' in pg_get_functiondef(p.oid))>0;

  if idempotent_invoker_count <> 3 then
    raise exception 'SECURITY PREFLIGHT FAIL: idempotent public wrapper set mismatch (%)',
      idempotent_invoker_count;
  end if;

  with expected(name,args) as (
    values
      ('create_class_invite_idempotent_secure','target_class uuid, operation_key uuid, valid_days integer'),
      ('create_guardian_child_idempotent_secure','child_name text, operation_key uuid'),
      ('create_school_class_idempotent_secure','target_tenant uuid, target_school_year uuid, class_name text, operation_key uuid')
  )
  select count(*)
    into idempotent_private_count
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  join expected e
    on e.name=p.proname
   and e.args=pg_get_function_identity_arguments(p.oid)
  where n.nspname='app_private'
    and p.prosecdef
    and has_function_privilege('authenticated',p.oid,'EXECUTE')
    and not has_function_privilege('anon',p.oid,'EXECUTE')
    and not has_function_privilege('public',p.oid,'EXECUTE')
    and coalesce(p.proconfig @> array['search_path=""']::text[],false)
    and position('idempotency_begin' in pg_get_functiondef(p.oid))>0
    and position('idempotency_finish' in pg_get_functiondef(p.oid))>0;

  if idempotent_private_count <> 3 then
    raise exception 'SECURITY PREFLIGHT FAIL: idempotent private helper set mismatch (%)',
      idempotent_private_count;
  end if;

  select string_agg(grantee||':'||privilege_type, ', ' order by grantee,privilege_type)
    into idempotency_direct_grants
  from information_schema.role_table_grants
  where table_schema='app_private'
    and table_name='idempotency_keys'
    and grantee in ('PUBLIC','anon','authenticated');

  if idempotency_direct_grants is not null then
    raise exception 'SECURITY PREFLIGHT FAIL: idempotency ledger direct grants remain: %',
      idempotency_direct_grants;
  end if;

  select string_agg(p.proname, ', ' order by p.proname)
    into unsafe_auth_helper
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='app_private'
    and p.proname in ('is_class_teacher','is_guardian_of','is_school_admin')
    and (
      not has_function_privilege('authenticated',p.oid,'EXECUTE')
      or has_function_privilege('anon',p.oid,'EXECUTE')
      or has_function_privilege('public',p.oid,'EXECUTE')
    );

  if unsafe_auth_helper is not null then
    raise exception 'SECURITY PREFLIGHT FAIL: private authorization helper grants changed: %',
      unsafe_auth_helper;
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
  'RLS enabled; anon blocked; profile role protected; public RPCs are invoker-only; idempotency ledger private; lifecycle helpers guarded; personal+School audit present; private retention guarded' as check_summary;
