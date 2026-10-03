-- Aktywnik+ migration 018 — prevent profile role self-escalation
-- Authenticated users may edit only their own display_name.
-- profile_type is assigned by trusted onboarding/pairing flows and must not be self-editable.

revoke update on table public.profiles from authenticated;
grant update(display_name) on table public.profiles to authenticated;
