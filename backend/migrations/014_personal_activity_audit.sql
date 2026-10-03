-- Aktywnik+ migration 014 — automatic audit events for personal activity sync

create or replace function app_private.audit_personal_activity_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  event_name text;
  resource uuid;
begin
  if tg_table_name = 'personal_activities' then
    resource := coalesce(new.id, old.id);
    if tg_op = 'INSERT' then
      event_name := 'personal_activity_created';
    elsif tg_op = 'UPDATE' then
      event_name := 'personal_activity_updated';
    else
      return coalesce(new, old);
    end if;
  elsif tg_table_name = 'personal_activity_tombstones' then
    resource := coalesce(new.client_entry_id, old.client_entry_id);
    event_name := 'personal_activity_deleted';
  else
    return coalesce(new, old);
  end if;

  insert into public.audit_events(
    tenant_id,
    actor_id,
    event_type,
    resource_type,
    resource_id
  ) values (
    null,
    actor,
    event_name,
    'personal_activity',
    resource
  );

  return coalesce(new, old);
end;
$$;

revoke execute on function app_private.audit_personal_activity_change() from public, anon, authenticated;

drop trigger if exists audit_personal_activity_insert_update on personal_activities;
create trigger audit_personal_activity_insert_update
after insert or update on personal_activities
for each row execute function app_private.audit_personal_activity_change();

drop trigger if exists audit_personal_activity_tombstone on personal_activity_tombstones;
create trigger audit_personal_activity_tombstone
after insert or update on personal_activity_tombstones
for each row execute function app_private.audit_personal_activity_change();
