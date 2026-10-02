-- Aktywnik+ — szkic Row Level Security dla Supabase/PostgreSQL
-- Do uruchomienia dopiero po podpięciu profiles.id do tożsamości auth.uid().
-- Przed produkcją wymaga testów integracyjnych w osobnym projekcie Supabase.

alter table profiles enable row level security;
alter table children enable row level security;
alter table guardians enable row level security;
alter table child_accounts enable row level security;
alter table activities enable row level security;
alter table activity_approval_events enable row level security;
alter table reports enable row level security;
alter table rewards enable row level security;
alter table memberships enable row level security;
alter table classes enable row level security;
alter table class_teachers enable row level security;
alter table class_children enable row level security;
alter table pairing_codes enable row level security;

create or replace function is_guardian(p_child uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from guardians g
    where g.child_id=p_child and g.guardian_id=auth.uid()
  );
$$;

create or replace function is_child_account(p_child uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from child_accounts ca
    where ca.child_id=p_child and ca.user_id=auth.uid() and ca.active
  );
$$;

create or replace function is_teacher_for_child(p_child uuid, p_tenant uuid default null)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1
    from class_children cc
    join classes c on c.id=cc.class_id
    join class_teachers ct on ct.class_id=c.id
    where cc.child_id=p_child
      and cc.status='active'
      and ct.teacher_id=auth.uid()
      and (p_tenant is null or c.tenant_id=p_tenant)
  );
$$;

create policy profiles_self_read on profiles
for select using (id=auth.uid());

create policy profiles_self_update on profiles
for update using (id=auth.uid()) with check (id=auth.uid());

create policy children_family_or_teacher_read on children
for select using (
  is_guardian(id) or is_child_account(id) or is_teacher_for_child(id)
);

create policy guardians_own_links_read on guardians
for select using (
  guardian_id=auth.uid() or is_child_account(child_id)
);

create policy child_accounts_family_read on child_accounts
for select using (
  user_id=auth.uid() or is_guardian(child_id)
);

create policy activities_family_read on activities
for select using (
  is_guardian(child_id)
  or is_child_account(child_id)
  or (status='approved' and is_teacher_for_child(child_id,tenant_id))
);

create policy activities_child_insert on activities
for insert with check (
  is_child_account(child_id) and status='pending'
);

create policy activities_guardian_insert on activities
for insert with check (is_guardian(child_id));

create policy activities_child_update_pending on activities
for update
using (is_child_account(child_id) and status in ('pending','rejected'))
with check (is_child_account(child_id) and status in ('pending','rejected'));

create policy activities_guardian_update on activities
for update
using (is_guardian(child_id))
with check (is_guardian(child_id));

create policy approval_events_family_read on activity_approval_events
for select using (
  is_guardian(child_id) or is_child_account(child_id)
);

create policy approval_events_guardian_insert on activity_approval_events
for insert with check (
  guardian_id=auth.uid() and is_guardian(child_id)
);

create policy reports_family_read on reports
for select using (
  is_guardian(child_id) or is_child_account(child_id) or is_teacher_for_child(child_id)
);

create policy rewards_family_read on rewards
for select using (
  is_guardian(child_id) or is_child_account(child_id) or is_teacher_for_child(child_id)
);

create policy pairing_codes_guardian_manage on pairing_codes
for all
using (guardian_id=auth.uid() and is_guardian(child_id))
with check (guardian_id=auth.uid() and is_guardian(child_id));

create policy memberships_self_read on memberships
for select using (user_id=auth.uid());

create policy classes_member_read on classes
for select using (
  exists(select 1 from memberships m where m.tenant_id=classes.tenant_id and m.user_id=auth.uid() and m.active)
);

create policy class_teachers_self_read on class_teachers
for select using (
  teacher_id=auth.uid()
  or exists (
    select 1 from classes c
    join memberships m on m.tenant_id=c.tenant_id
    where c.id=class_teachers.class_id and m.user_id=auth.uid() and m.role='school_admin' and m.active
  )
);

create policy class_children_teacher_read on class_children
for select using (
  exists(select 1 from class_teachers ct where ct.class_id=class_children.class_id and ct.teacher_id=auth.uid())
  or is_guardian(child_id)
  or is_child_account(child_id)
);

-- Brak polityki INSERT/UPDATE dla konfiguracji szkoły oznacza brak dostępu z klienta.
-- Operacje administracyjne powinny przechodzić przez jawne funkcje/endpointy z dodatkową kontrolą roli.
