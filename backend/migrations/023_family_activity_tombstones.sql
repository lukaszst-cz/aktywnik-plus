-- Aktywnik+ migration 023 — family activity delete tombstones
-- Only guardians may delete tenant-neutral family activities.
-- Child accounts do not receive DELETE privilege.

create table if not exists public.family_activity_tombstones (
  child_id uuid not null references public.children(id) on delete cascade,
  client_entry_id uuid not null,
  deleted_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (child_id, client_entry_id)
);

create index if not exists idx_family_activity_tombstones_child_deleted
  on public.family_activity_tombstones(child_id, deleted_at desc);

alter table public.family_activity_tombstones enable row level security;

revoke all on table public.family_activity_tombstones from anon;
revoke all on table public.family_activity_tombstones from authenticated;
grant select, insert, update on table public.family_activity_tombstones to authenticated;

drop policy if exists family_activity_tombstones_select_guardian on public.family_activity_tombstones;
create policy family_activity_tombstones_select_guardian
on public.family_activity_tombstones for select to authenticated
using (app_private.is_guardian_of(child_id));

drop policy if exists family_activity_tombstones_insert_guardian on public.family_activity_tombstones;
create policy family_activity_tombstones_insert_guardian
on public.family_activity_tombstones for insert to authenticated
with check (app_private.is_guardian_of(child_id));

drop policy if exists family_activity_tombstones_update_guardian on public.family_activity_tombstones;
create policy family_activity_tombstones_update_guardian
on public.family_activity_tombstones for update to authenticated
using (app_private.is_guardian_of(child_id))
with check (app_private.is_guardian_of(child_id));

grant delete on table public.activities to authenticated;

drop policy if exists activities_delete_family_guardian on public.activities;
create policy activities_delete_family_guardian
on public.activities for delete to authenticated
using (
  tenant_id is null
  and app_private.is_guardian_of(child_id)
  and client_entry_id is not null
);
