-- Aktywnik+ migration 010 — RLS policy role/performance hardening
-- Ogranicza polityki aplikacji do authenticated i optymalizuje bezpośrednie auth.uid().

-- Najpierw role: żadna polityka aplikacyjna nie powinna działać jako PUBLIC.
alter policy activities_insert_child on activities to authenticated;
alter policy activities_insert_guardian on activities to authenticated;
alter policy activities_select_child_account on activities to authenticated;
alter policy activities_select_guardian on activities to authenticated;
alter policy activities_update_child_pending on activities to authenticated;
alter policy activities_update_guardian on activities to authenticated;

alter policy approval_events_insert_guardian on activity_approval_events to authenticated
  with check (
    guardian_id = (select auth.uid())
    and app_private.is_guardian_of(child_id)
    and actor_type = 'guardian'
  );
alter policy approval_events_select_family on activity_approval_events to authenticated;

alter policy approvals_manage_guardian on activity_approvals to authenticated
  using (guardian_id = (select auth.uid()))
  with check (guardian_id = (select auth.uid()));
alter policy approvals_select on activity_approvals to authenticated
  using (
    guardian_id = (select auth.uid())
    or exists (
      select 1 from activities a
      where a.id = activity_approvals.activity_id
        and app_private.is_guardian_of(a.child_id)
    )
  );

alter policy audit_select_admin on audit_events to authenticated;

alter policy child_accounts_select on child_accounts to authenticated
  using (
    user_id = (select auth.uid())
    or app_private.is_guardian_of(child_id)
  );

alter policy children_select on children to authenticated;
alter policy children_select_child_account on children to authenticated;

alter policy class_children_select on class_children to authenticated;

alter policy class_teachers_select on class_teachers to authenticated
  using (
    teacher_id = (select auth.uid())
    or exists (
      select 1 from classes c
      where c.id = class_teachers.class_id
        and app_private.is_school_admin(c.tenant_id)
    )
  );

alter policy classes_manage_admin on classes to authenticated;
alter policy classes_select on classes to authenticated;

alter policy guardians_select on guardians to authenticated
  using (
    guardian_id = (select auth.uid())
    or app_private.is_guardian_of(child_id)
  );
alter policy guardians_select_child_account on guardians to authenticated;

alter policy memberships_select on memberships to authenticated
  using (
    user_id = (select auth.uid())
    or app_private.is_school_admin(tenant_id)
  );

alter policy pairing_codes_insert_guardian on pairing_codes to authenticated
  with check (
    guardian_id = (select auth.uid())
    and app_private.is_guardian_of(child_id)
  );
alter policy pairing_codes_select_guardian on pairing_codes to authenticated
  using (
    guardian_id = (select auth.uid())
    and app_private.is_guardian_of(child_id)
  );
alter policy pairing_codes_update_guardian on pairing_codes to authenticated
  using (
    guardian_id = (select auth.uid())
    and app_private.is_guardian_of(child_id)
  )
  with check (
    guardian_id = (select auth.uid())
    and app_private.is_guardian_of(child_id)
  );

alter policy profiles_select_own on profiles to authenticated
  using (id = (select auth.uid()));
alter policy profiles_update_own on profiles to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter policy report_items_select_child on report_items to authenticated;
alter policy report_items_select_guardian on report_items to authenticated;
alter policy report_items_select_teacher_submitted on report_items to authenticated;

alter policy reports_select_child_account on reports to authenticated;
alter policy reports_select_guardian on reports to authenticated;
alter policy reports_select_teacher_submitted on reports to authenticated;

alter policy rewards_insert_teacher on rewards to authenticated
  with check (
    class_id is not null
    and app_private.is_class_teacher(class_id)
    and teacher_id = (select auth.uid())
  );
alter policy rewards_select on rewards to authenticated;
alter policy rewards_select_child_account on rewards to authenticated;

alter policy school_years_select on school_years to authenticated
  using (
    exists (
      select 1 from memberships m
      where m.tenant_id = school_years.tenant_id
        and m.user_id = (select auth.uid())
        and m.active = true
    )
  );

alter policy support_access_select_admin on support_access_grants to authenticated;

alter policy tenants_select_member on tenants to authenticated
  using (
    exists (
      select 1 from memberships m
      where m.tenant_id = tenants.id
        and m.user_id = (select auth.uid())
        and m.active = true
    )
  );
