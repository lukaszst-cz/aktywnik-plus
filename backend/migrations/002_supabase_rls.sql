-- Aktywnik+ migration 002 — Supabase Row Level Security
-- Wymaga Supabase Auth (auth.uid()).
-- Uruchamiać dopiero po migracji 001_core.sql.

create schema if not exists app_private;

create or replace function app_private.is_school_admin(target_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships m
    where m.tenant_id = target_tenant
      and m.user_id = auth.uid()
      and m.role = 'school_admin'
      and m.active = true
  );
$$;

create or replace function app_private.is_class_teacher(target_class uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from class_teachers ct
    where ct.class_id = target_class
      and ct.teacher_id = auth.uid()
  );
$$;

create or replace function app_private.is_guardian_of(target_child uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from guardians g
    where g.child_id = target_child
      and g.guardian_id = auth.uid()
  );
$$;

alter table profiles enable row level security;
alter table memberships enable row level security;
alter table school_years enable row level security;
alter table classes enable row level security;
alter table class_teachers enable row level security;
alter table children enable row level security;
alter table guardians enable row level security;
alter table class_children enable row level security;
alter table activities enable row level security;
alter table activity_approvals enable row level security;
alter table reports enable row level security;
alter table rewards enable row level security;
alter table audit_events enable row level security;
alter table support_access_grants enable row level security;

-- Profil dorosłego: tylko własny rekord.
create policy profiles_select_own
on profiles for select
using (id = auth.uid());

create policy profiles_update_own
on profiles for update
using (id = auth.uid())
with check (id = auth.uid());

-- Członkostwa: użytkownik widzi własne; admin szkoły widzi tenant.
create policy memberships_select
on memberships for select
using (
  user_id = auth.uid()
  or app_private.is_school_admin(tenant_id)
);

-- Lata szkolne i klasy: aktywni członkowie tenant albo przypisany nauczyciel.
create policy school_years_select
on school_years for select
using (
  exists (
    select 1 from memberships m
    where m.tenant_id = school_years.tenant_id
      and m.user_id = auth.uid()
      and m.active = true
  )
);

create policy classes_select
on classes for select
using (
  app_private.is_school_admin(tenant_id)
  or app_private.is_class_teacher(id)
);

create policy classes_manage_admin
on classes for all
using (app_private.is_school_admin(tenant_id))
with check (app_private.is_school_admin(tenant_id));

create policy class_teachers_select
on class_teachers for select
using (
  teacher_id = auth.uid()
  or exists (
    select 1
    from classes c
    where c.id = class_teachers.class_id
      and app_private.is_school_admin(c.tenant_id)
  )
);

-- Relacje rodzic–dziecko.
create policy guardians_select
on guardians for select
using (
  guardian_id = auth.uid()
  or app_private.is_guardian_of(child_id)
);

create policy children_select
on children for select
using (
  app_private.is_guardian_of(id)
  or exists (
    select 1
    from class_children cc
    where cc.child_id = children.id
      and app_private.is_class_teacher(cc.class_id)
  )
);

-- Udział w klasie: rodzic widzi własne dziecko, nauczyciel własną klasę.
create policy class_children_select
on class_children for select
using (
  app_private.is_guardian_of(child_id)
  or app_private.is_class_teacher(class_id)
);

-- Aktywności: rodzic własnego dziecka; nauczyciel tylko przez przypisaną klasę.
create policy activities_select
on activities for select
using (
  app_private.is_guardian_of(child_id)
  or exists (
    select 1
    from class_children cc
    where cc.child_id = activities.child_id
      and app_private.is_class_teacher(cc.class_id)
  )
);

create policy activities_insert_guardian
on activities for insert
with check (app_private.is_guardian_of(child_id));

create policy activities_update_guardian
on activities for update
using (app_private.is_guardian_of(child_id))
with check (app_private.is_guardian_of(child_id));

-- Decyzje rodzica.
create policy approvals_select
on activity_approvals for select
using (
  guardian_id = auth.uid()
  or exists (
    select 1
    from activities a
    where a.id = activity_approvals.activity_id
      and app_private.is_guardian_of(a.child_id)
  )
);

create policy approvals_manage_guardian
on activity_approvals for all
using (guardian_id = auth.uid())
with check (guardian_id = auth.uid());

-- Raporty.
create policy reports_select
on reports for select
using (
  app_private.is_guardian_of(child_id)
  or (class_id is not null and app_private.is_class_teacher(class_id))
);

-- Plusy / oceny.
create policy rewards_select
on rewards for select
using (
  app_private.is_guardian_of(child_id)
  or (class_id is not null and app_private.is_class_teacher(class_id))
);

create policy rewards_insert_teacher
on rewards for insert
with check (
  class_id is not null
  and app_private.is_class_teacher(class_id)
  and teacher_id = auth.uid()
);

-- Audyt i dostęp serwisowy: tylko admin szkoły przez tenant.
create policy audit_select_admin
on audit_events for select
using (tenant_id is not null and app_private.is_school_admin(tenant_id));

create policy support_access_select_admin
on support_access_grants for select
using (app_private.is_school_admin(tenant_id));

-- Uwaga:
-- operacje administracyjne wykonywane przez backend z service role
-- muszą dodatkowo walidować tenant/role w kodzie serwera.
