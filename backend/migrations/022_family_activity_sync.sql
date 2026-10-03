-- Aktywnik+ migration 022 — family activity sync identity and RLS hardening
-- Family PWA rows remain tenant-neutral (tenant_id IS NULL).
-- School-owned rows keep their existing model and are not written by family sync.

alter table public.activities
  add column if not exists client_entry_id uuid,
  add column if not exists client_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='activities_client_sync_fields_check'
  ) then
    alter table public.activities
      add constraint activities_client_sync_fields_check
      check (client_entry_id is null or client_updated_at is not null);
  end if;
end $$;

create unique index if not exists uq_activities_child_client_entry
  on public.activities(child_id,client_entry_id);

create index if not exists idx_activities_child_client_updated
  on public.activities(child_id,client_updated_at desc)
  where client_entry_id is not null;

drop policy if exists activities_insert_family on public.activities;
create policy activities_insert_family
on public.activities for insert to authenticated
with check (
  tenant_id is null
  and (
    app_private.is_guardian_of(child_id)
    or (
      app_private.is_child_account(child_id)
      and status='pending'
    )
  )
);

drop policy if exists activities_update_family on public.activities;
create policy activities_update_family
on public.activities for update to authenticated
using (
  tenant_id is null
  and (
    app_private.is_guardian_of(child_id)
    or (
      app_private.is_child_account(child_id)
      and status in ('pending','rejected')
    )
  )
)
with check (
  tenant_id is null
  and (
    app_private.is_guardian_of(child_id)
    or (
      app_private.is_child_account(child_id)
      and status in ('pending','rejected')
    )
  )
);
