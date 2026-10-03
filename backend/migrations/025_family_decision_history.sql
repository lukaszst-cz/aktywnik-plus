-- Aktywnik+ migration 025 — family decision history sync identity
-- Keep approval/decision history append-only and addressable from local-first clients.

alter table public.activity_approval_events
  add column if not exists client_event_id uuid,
  add column if not exists client_entry_id uuid;

update public.activity_approval_events e
set client_entry_id=a.client_entry_id
from public.activities a
where e.activity_id=a.id
  and e.client_entry_id is null
  and a.client_entry_id is not null;

alter table public.activity_approval_events
  alter column activity_id drop not null;

alter table public.activity_approval_events
  drop constraint if exists activity_approval_events_activity_id_fkey;

alter table public.activity_approval_events
  add constraint activity_approval_events_activity_id_fkey
  foreign key (activity_id)
  references public.activities(id)
  on delete set null;

alter table public.activity_approval_events
  drop constraint if exists activity_approval_events_decision_check;

alter table public.activity_approval_events
  add constraint activity_approval_events_decision_check
  check (
    decision in (
      'created','edited','resubmitted',
      'approved','approved_auto','rejected','corrected','deleted'
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname='activity_approval_events_client_identity_check'
      and conrelid='public.activity_approval_events'::regclass
  ) then
    alter table public.activity_approval_events
      add constraint activity_approval_events_client_identity_check
      check (client_event_id is null or client_entry_id is not null);
  end if;
end $$;

create unique index if not exists uq_approval_events_child_client_event
  on public.activity_approval_events(child_id,client_event_id);

create index if not exists idx_approval_events_child_client_entry_time
  on public.activity_approval_events(child_id,client_entry_id,decided_at desc)
  where client_event_id is not null;

-- No new table grants and no new RLS policies are added here.
-- Existing policy approval_events_insert_guardian remains the only client INSERT path.
-- Existing approval_events_select_family remains the family SELECT boundary.
