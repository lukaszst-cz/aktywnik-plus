-- Aktywnik+ migration 012 — personal activity sync
-- Separate cloud storage for the Universal "Dla siebie" mode.
-- Personal users are not modeled as children.

create table if not exists personal_activities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  client_entry_id uuid not null,
  activity_date date not null,
  activity_type text not null check (char_length(activity_type) between 1 and 80),
  minutes integer not null check (minutes > 0 and minutes <= 600),
  effort smallint check (effort between 1 and 5),
  note text check (note is null or char_length(note) <= 120),
  source text not null default 'manual' check (source in ('manual','timer')),
  client_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, client_entry_id)
);

create index if not exists idx_personal_activities_owner_date
  on personal_activities(owner_id, activity_date desc);

create index if not exists idx_personal_activities_owner_updated
  on personal_activities(owner_id, updated_at desc);

alter table personal_activities enable row level security;

revoke all on table personal_activities from anon;
grant select, insert, update, delete on table personal_activities to authenticated;

drop policy if exists personal_activities_select_own on personal_activities;
create policy personal_activities_select_own
on personal_activities for select to authenticated
using (owner_id = (select auth.uid()));

drop policy if exists personal_activities_insert_own on personal_activities;
create policy personal_activities_insert_own
on personal_activities for insert to authenticated
with check (owner_id = (select auth.uid()));

drop policy if exists personal_activities_update_own on personal_activities;
create policy personal_activities_update_own
on personal_activities for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

drop policy if exists personal_activities_delete_own on personal_activities;
create policy personal_activities_delete_own
on personal_activities for delete to authenticated
using (owner_id = (select auth.uid()));

create or replace function app_private.touch_personal_activity_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function app_private.touch_personal_activity_updated_at() from public, anon, authenticated;

drop trigger if exists personal_activities_touch_updated_at on personal_activities;
create trigger personal_activities_touch_updated_at
before update on personal_activities
for each row execute function app_private.touch_personal_activity_updated_at();
