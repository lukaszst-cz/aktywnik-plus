-- Aktywnik+ migration 019 — school lifecycle foreign-key indexes
-- Performance hardening based on Supabase Performance Advisor.
-- Adds covering indexes only; no data, RLS or API behavior changes.

create index if not exists idx_class_invites_created_by
  on public.class_invites(created_by);

create index if not exists idx_class_join_requests_child
  on public.class_join_requests(child_id);

create index if not exists idx_class_join_requests_requested_by
  on public.class_join_requests(requested_by);

create index if not exists idx_class_join_requests_decided_by
  on public.class_join_requests(decided_by);
