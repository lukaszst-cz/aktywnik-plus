-- Aktywnik+ migration 001 — core schema
-- Dane testowe wyłącznie syntetyczne.

-- Aktywnik+ — szkic modelu PostgreSQL/Supabase
-- Dane przykładowe/testowe wyłącznie syntetyczne.

create extension if not exists pgcrypto;

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  deployment_mode text not null check (deployment_mode in ('school_saas','school_self_hosted')),
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('teacher','school_admin')),
  active boolean not null default true,
  primary key (tenant_id,user_id)
);

create table if not exists school_years (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  label text not null,
  archived_at timestamptz,
  unique (tenant_id,label)
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  school_year_id uuid not null references school_years(id) on delete cascade,
  name text not null,
  join_code text not null,
  archived_at timestamptz,
  unique (tenant_id,join_code)
);

create table if not exists class_teachers (
  class_id uuid not null references classes(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  primary key (class_id,teacher_id)
);

create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists guardians (
  child_id uuid not null references children(id) on delete cascade,
  guardian_id uuid not null references profiles(id) on delete cascade,
  primary key (child_id,guardian_id)
);

create table if not exists class_children (
  class_id uuid not null references classes(id) on delete cascade,
  child_id uuid not null references children(id) on delete cascade,
  participation_mode text not null check (participation_mode in ('digital','hybrid','paper')),
  status text not null default 'pending' check (status in ('pending','active','rejected','archived')),
  report_status text not null default 'missing' check (report_status in ('missing','preparing','submitted','reviewed')),
  joined_at timestamptz,
  primary key (class_id,child_id)
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  activity_date date not null,
  activity_type text not null,
  minutes integer not null check (minutes > 0 and minutes <= 600),
  effort smallint check (effort between 1 and 5),
  note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists activity_approvals (
  activity_id uuid primary key references activities(id) on delete cascade,
  guardian_id uuid not null references profiles(id),
  decision text not null check (decision in ('approved','rejected','corrected')),
  decided_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  period_type text not null check (period_type in ('month','quarter','half_year','year')),
  period_start date not null,
  period_end date not null,
  status text not null default 'preparing' check (status in ('preparing','submitted','reviewed','archived')),
  created_at timestamptz not null default now()
);

create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references children(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  teacher_id uuid references profiles(id) on delete set null,
  kind text not null check (kind in ('plus','grade','note')),
  value text,
  note text,
  issued_at date not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  event_type text not null,
  resource_type text not null,
  resource_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists support_access_grants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  granted_to uuid not null references profiles(id),
  reason text not null,
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index if not exists idx_activities_child_date on activities(child_id,activity_date);
create index if not exists idx_classes_tenant on classes(tenant_id);
create index if not exists idx_audit_tenant_time on audit_events(tenant_id,created_at desc);

-- Produkcja: włączyć Row Level Security dla tabel tenantowych
-- i egzekwować tenant_id / class membership po stronie bazy.

