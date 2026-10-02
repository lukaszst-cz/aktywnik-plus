-- Aktywnik+ migration 004 — family/child RLS extension
-- Wymaga migracji 003 i Supabase Auth.

create or replace function app_private.is_child_account(target_child uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from child_accounts ca
    where ca.child_id = target_child
      and ca.user_id = auth.uid()
      and ca.active = true
      and ca.revoked_at is null
  );
$$;

alter table child_accounts enable row level security;
alter table activity_approval_events enable row level security;
alter table pairing_codes enable row level security;

create policy child_accounts_select
on child_accounts for select
using (
  user_id = auth.uid()
  or app_private.is_guardian_of(child_id)
);

create policy children_select_child_account
on children for select
using (app_private.is_child_account(id));

create policy guardians_select_child_account
on guardians for select
using (app_private.is_child_account(child_id));

create policy activities_select_child_account
on activities for select
using (app_private.is_child_account(child_id));

create policy activities_insert_child
on activities for insert
with check (
  app_private.is_child_account(child_id)
  and status = 'pending'
);

create policy activities_update_child_pending
on activities for update
using (
  app_private.is_child_account(child_id)
  and status in ('pending','rejected')
)
with check (
  app_private.is_child_account(child_id)
  and status in ('pending','rejected')
);

create policy approval_events_select_family
on activity_approval_events for select
using (
  app_private.is_guardian_of(child_id)
  or app_private.is_child_account(child_id)
);

create policy approval_events_insert_guardian
on activity_approval_events for insert
with check (
  guardian_id = auth.uid()
  and app_private.is_guardian_of(child_id)
  and actor_type = 'guardian'
);

create policy reports_select_child_account
on reports for select
using (app_private.is_child_account(child_id));

create policy rewards_select_child_account
on rewards for select
using (app_private.is_child_account(child_id));

create policy pairing_codes_select_guardian
on pairing_codes for select
using (
  guardian_id = auth.uid()
  and app_private.is_guardian_of(child_id)
);

create policy pairing_codes_insert_guardian
on pairing_codes for insert
with check (
  guardian_id = auth.uid()
  and app_private.is_guardian_of(child_id)
);

create policy pairing_codes_update_guardian
on pairing_codes for update
using (
  guardian_id = auth.uid()
  and app_private.is_guardian_of(child_id)
)
with check (
  guardian_id = auth.uid()
  and app_private.is_guardian_of(child_id)
);

-- Operacja realizacji kodu parowania powinna odbywać się przez kontrolowany
-- endpoint / RPC, który porównuje hash tokenu, termin ważności i used_at.
-- Nie udostępniać token_hash anonimowemu klientowi.
