-- Aktywnik+ migration 019 — School audit coverage + retention mechanism
-- Retention policy is NOT scheduled here. School/IOD must choose the period.
-- The private prune function defaults to dry-run and is not callable by anon/authenticated.

create or replace function app_private.audit_school_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  payload jsonb;
  tenant uuid;
  class_uuid uuid;
  resource uuid;
  event_name text;
  resource_name text;
  verb text;
begin
  if actor is null then
    return coalesce(new, old);
  end if;

  verb := case tg_op
    when 'INSERT' then 'created'
    when 'UPDATE' then 'updated'
    when 'DELETE' then 'deleted'
    else lower(tg_op)
  end;

  if tg_op='DELETE' then payload := to_jsonb(old);
  else payload := to_jsonb(new);
  end if;

  if tg_table_name='activities' then
    tenant := nullif(payload->>'tenant_id','')::uuid;
    if tenant is null then return coalesce(new,old); end if;
    resource := nullif(payload->>'id','')::uuid;
    resource_name := 'school_activity';
    event_name := 'school_activity_'||verb;

  elsif tg_table_name='reports' then
    class_uuid := nullif(payload->>'class_id','')::uuid;
    if class_uuid is null then return coalesce(new,old); end if;
    select c.tenant_id into tenant from public.classes c where c.id=class_uuid;
    if tenant is null then return coalesce(new,old); end if;
    resource := nullif(payload->>'id','')::uuid;
    resource_name := 'school_report';
    event_name := 'school_report_'||verb;

  elsif tg_table_name='rewards' then
    class_uuid := nullif(payload->>'class_id','')::uuid;
    if class_uuid is null then return coalesce(new,old); end if;
    select c.tenant_id into tenant from public.classes c where c.id=class_uuid;
    if tenant is null then return coalesce(new,old); end if;
    resource := nullif(payload->>'id','')::uuid;
    resource_name := 'school_reward';
    event_name := 'school_reward_'||verb;

  elsif tg_table_name='class_children' then
    class_uuid := nullif(payload->>'class_id','')::uuid;
    select c.tenant_id into tenant from public.classes c where c.id=class_uuid;
    if tenant is null then return coalesce(new,old); end if;
    resource := nullif(payload->>'child_id','')::uuid;
    resource_name := 'class_membership';
    event_name := 'class_membership_'||verb;

  elsif tg_table_name='class_teachers' then
    class_uuid := nullif(payload->>'class_id','')::uuid;
    select c.tenant_id into tenant from public.classes c where c.id=class_uuid;
    if tenant is null then return coalesce(new,old); end if;
    resource := nullif(payload->>'teacher_id','')::uuid;
    resource_name := 'class_teacher';
    event_name := 'class_teacher_'||verb;

  elsif tg_table_name='classes' then
    tenant := nullif(payload->>'tenant_id','')::uuid;
    resource := nullif(payload->>'id','')::uuid;
    resource_name := 'class';
    event_name := 'class_'||verb;

  elsif tg_table_name='memberships' then
    tenant := nullif(payload->>'tenant_id','')::uuid;
    resource := nullif(payload->>'user_id','')::uuid;
    resource_name := 'tenant_membership';
    event_name := 'tenant_membership_'||verb;

  elsif tg_table_name='support_access_grants' then
    tenant := nullif(payload->>'tenant_id','')::uuid;
    resource := nullif(payload->>'id','')::uuid;
    resource_name := 'support_access';
    event_name := 'support_access_'||verb;

  else
    return coalesce(new,old);
  end if;

  insert into public.audit_events(tenant_id,actor_id,event_type,resource_type,resource_id)
  values (tenant,actor,event_name,resource_name,resource);

  return coalesce(new,old);
end;
$$;

revoke execute on function app_private.audit_school_change() from public, anon, authenticated;

drop trigger if exists audit_school_activities on public.activities;
create trigger audit_school_activities
after insert or update or delete on public.activities
for each row execute function app_private.audit_school_change();

drop trigger if exists audit_school_reports on public.reports;
create trigger audit_school_reports
after insert or update or delete on public.reports
for each row execute function app_private.audit_school_change();

drop trigger if exists audit_school_rewards on public.rewards;
create trigger audit_school_rewards
after insert or update or delete on public.rewards
for each row execute function app_private.audit_school_change();

drop trigger if exists audit_school_class_children on public.class_children;
create trigger audit_school_class_children
after insert or update or delete on public.class_children
for each row execute function app_private.audit_school_change();

drop trigger if exists audit_school_class_teachers on public.class_teachers;
create trigger audit_school_class_teachers
after insert or delete on public.class_teachers
for each row execute function app_private.audit_school_change();

drop trigger if exists audit_school_classes on public.classes;
create trigger audit_school_classes
after update or delete on public.classes
for each row execute function app_private.audit_school_change();

drop trigger if exists audit_school_memberships on public.memberships;
create trigger audit_school_memberships
after insert or update or delete on public.memberships
for each row execute function app_private.audit_school_change();

drop trigger if exists audit_support_access_grants on public.support_access_grants;
create trigger audit_support_access_grants
after insert or update or delete on public.support_access_grants
for each row execute function app_private.audit_school_change();

create or replace function app_private.prune_audit_events(
  cutoff timestamptz,
  dry_run boolean default true
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected bigint;
begin
  if cutoff is null then raise exception 'cutoff_required'; end if;
  if cutoff >= now() then raise exception 'cutoff_must_be_in_past'; end if;

  if coalesce(dry_run,true) then
    select count(*) into affected
    from public.audit_events
    where created_at < cutoff;
    return affected;
  end if;

  delete from public.audit_events where created_at < cutoff;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke execute on function app_private.prune_audit_events(timestamptz,boolean)
  from public, anon, authenticated;
grant execute on function app_private.prune_audit_events(timestamptz,boolean)
  to service_role;
