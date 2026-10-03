-- Aktywnik+ migration 013 — personal activity delete tombstones

create table if not exists personal_activity_tombstones (
  owner_id uuid not null references profiles(id) on delete cascade,
  client_entry_id uuid not null,
  deleted_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, client_entry_id)
);

create index if not exists idx_personal_activity_tombstones_owner_deleted
  on personal_activity_tombstones(owner_id, deleted_at desc);

alter table personal_activity_tombstones enable row level security;

revoke all on table personal_activity_tombstones from anon;
grant select, insert, update, delete on table personal_activity_tombstones to authenticated;

drop policy if exists personal_activity_tombstones_select_own on personal_activity_tombstones;
create policy personal_activity_tombstones_select_own
on personal_activity_tombstones for select to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists personal_activity_tombstones_insert_own on personal_activity_tombstones;
create policy personal_activity_tombstones_insert_own
on personal_activity_tombstones for insert to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists personal_activity_tombstones_update_own on personal_activity_tombstones;
create policy personal_activity_tombstones_update_own
on personal_activity_tombstones for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists personal_activity_tombstones_delete_own on personal_activity_tombstones;
create policy personal_activity_tombstones_delete_own
on personal_activity_tombstones for delete to authenticated
using (owner_id = (select auth.uid()));
