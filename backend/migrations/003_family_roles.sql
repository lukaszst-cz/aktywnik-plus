-- Aktywnik+ migration 003 — family roles and multi-child accounts
-- Uruchamiać po 001_core.sql i 002_supabase_rls.sql.
-- Dane testowe wyłącznie syntetyczne.

alter table profiles
  add column if not exists profile_type text not null default 'adult';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname='profiles_profile_type_check'
  ) then
    alter table profiles
      add constraint profiles_profile_type_check
      check (profile_type in ('adult','child'));
  end if;
end $$;

alter table children
  add column if not exists require_parent_approval boolean not null default true;

alter table guardians
  add column if not exists guardian_role text not null default 'guardian',
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname='guardians_guardian_role_check'
  ) then
    alter table guardians
      add constraint guardians_guardian_role_check
      check (guardian_role in ('guardian','manager'));
  end if;
end $$;

create table if not exists child_accounts (
  child_id uuid not null references children(id) on delete cascade,
  user_id uuid not null unique references profiles(id) on delete cascade,
  active boolean not null default true,
  paired_at timestamptz,
  revoked_at timestamptz,
  primary key (child_id,user_id)
);

alter table activities
  add column if not exists source text not null default 'manual',
  add column if not exists rejection_reason text,
  add column if not exists updated_at timestamptz,
  add column if not exists approved_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname='activities_source_check'
  ) then
    alter table activities
      add constraint activities_source_check
      check (source in ('manual','timer'));
  end if;
end $$;

create table if not exists activity_approval_events (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  guardian_id uuid references profiles(id) on delete set null,
  actor_type text not null check (actor_type in ('child','guardian','system')),
  decision text not null check (decision in ('created','edited','resubmitted','approved','approved_auto','rejected','corrected')),
  reason text,
  before_state jsonb,
  after_state jsonb,
  decided_at timestamptz not null default now()
);

create table if not exists pairing_codes (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  guardian_id uuid not null references profiles(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index if not exists idx_child_accounts_user on child_accounts(user_id);
create index if not exists idx_approval_events_activity_time on activity_approval_events(activity_id,decided_at desc);
create index if not exists idx_approval_events_child_time on activity_approval_events(child_id,decided_at desc);
create index if not exists idx_pairing_codes_child_expiry on pairing_codes(child_id,expires_at);
