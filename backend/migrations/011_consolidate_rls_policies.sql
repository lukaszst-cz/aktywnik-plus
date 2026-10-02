-- Aktywnik+ migration 011 — consolidate equivalent RLS policies
-- Reduces multiple permissive policy warnings without broadening access.

-- ACTIVITIES
drop policy if exists activities_select_child_account on activities;
drop policy if exists activities_select_guardian on activities;
create policy activities_select_family
on activities for select to authenticated
using (
  app_private.is_guardian_of(child_id)
  or app_private.is_child_account(child_id)
);

drop policy if exists activities_insert_child on activities;
drop policy if exists activities_insert_guardian on activities;
create policy activities_insert_family
on activities for insert to authenticated
with check (
  app_private.is_guardian_of(child_id)
  or (
    app_private.is_child_account(child_id)
    and status = 'pending'
  )
);

drop policy if exists activities_update_child_pending on activities;
drop policy if exists activities_update_guardian on activities;
create policy activities_update_family
on activities for update to authenticated
using (
  app_private.is_guardian_of(child_id)
  or (
    app_private.is_child_account(child_id)
    and status in ('pending','rejected')
  )
)
with check (
  app_private.is_guardian_of(child_id)
  or (
    app_private.is_child_account(child_id)
    and status in ('pending','rejected')
  )
);

-- ACTIVITY APPROVALS
drop policy if exists approvals_select on activity_approvals;
drop policy if exists approvals_manage_guardian on activity_approvals;
create policy approvals_select_guardian
on activity_approvals for select to authenticated
using (
  guardian_id = (select auth.uid())
  or exists (
    select 1 from activities a
    where a.id = activity_approvals.activity_id
      and app_private.is_guardian_of(a.child_id)
  )
);
create policy approvals_insert_guardian
on activity_approvals for insert to authenticated
with check (guardian_id = (select auth.uid()));
create policy approvals_update_guardian
on activity_approvals for update to authenticated
using (guardian_id = (select auth.uid()))
with check (guardian_id = (select auth.uid()));
create policy approvals_delete_guardian
on activity_approvals for delete to authenticated
using (guardian_id = (select auth.uid()));

-- CHILDREN
drop policy if exists children_select on children;
drop policy if exists children_select_child_account on children;
create policy children_select_authorized
on children for select to authenticated
using (
  app_private.is_guardian_of(id)
  or app_private.is_child_account(id)
  or exists (
    select 1 from class_children cc
    where cc.child_id = children.id
      and app_private.is_class_teacher(cc.class_id)
  )
);

-- CLASSES
drop policy if exists classes_select on classes;
drop policy if exists classes_manage_admin on classes;
create policy classes_select_authorized
on classes for select to authenticated
using (
  app_private.is_school_admin(tenant_id)
  or app_private.is_class_teacher(id)
);
create policy classes_insert_admin
on classes for insert to authenticated
with check (app_private.is_school_admin(tenant_id));
create policy classes_update_admin
on classes for update to authenticated
using (app_private.is_school_admin(tenant_id))
with check (app_private.is_school_admin(tenant_id));
create policy classes_delete_admin
on classes for delete to authenticated
using (app_private.is_school_admin(tenant_id));

-- GUARDIANS
drop policy if exists guardians_select on guardians;
drop policy if exists guardians_select_child_account on guardians;
create policy guardians_select_family
on guardians for select to authenticated
using (
  guardian_id = (select auth.uid())
  or app_private.is_guardian_of(child_id)
  or app_private.is_child_account(child_id)
);

-- REPORTS
drop policy if exists reports_select_child_account on reports;
drop policy if exists reports_select_guardian on reports;
drop policy if exists reports_select_teacher_submitted on reports;
create policy reports_select_authorized
on reports for select to authenticated
using (
  app_private.is_guardian_of(child_id)
  or app_private.is_child_account(child_id)
  or (
    class_id is not null
    and status in ('submitted','reviewed')
    and app_private.is_class_teacher(class_id)
  )
);

-- REPORT ITEMS
drop policy if exists report_items_select_child on report_items;
drop policy if exists report_items_select_guardian on report_items;
drop policy if exists report_items_select_teacher_submitted on report_items;
create policy report_items_select_authorized
on report_items for select to authenticated
using (
  exists (
    select 1 from reports r
    where r.id = report_items.report_id
      and (
        app_private.is_guardian_of(r.child_id)
        or app_private.is_child_account(r.child_id)
        or (
          r.class_id is not null
          and r.status in ('submitted','reviewed')
          and app_private.is_class_teacher(r.class_id)
        )
      )
  )
);

-- REWARDS
drop policy if exists rewards_select on rewards;
drop policy if exists rewards_select_child_account on rewards;
create policy rewards_select_authorized
on rewards for select to authenticated
using (
  app_private.is_guardian_of(child_id)
  or app_private.is_child_account(child_id)
  or (
    class_id is not null
    and app_private.is_class_teacher(class_id)
  )
);
