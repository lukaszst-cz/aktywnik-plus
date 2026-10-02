-- Aktywnik+ migration 008 — tenant RLS hardening
-- Preflight wykrył brak RLS na tabeli tenants.

alter table tenants enable row level security;

drop policy if exists tenants_select_member on tenants;

create policy tenants_select_member
on tenants for select
using (
  exists (
    select 1
    from memberships m
    where m.tenant_id = tenants.id
      and m.user_id = auth.uid()
      and m.active = true
  )
);

grant select on table tenants to authenticated;
revoke all on table tenants from anon;
