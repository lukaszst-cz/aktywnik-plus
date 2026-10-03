-- Aktywnik+ migration 021 — cover foreign keys reported by Supabase Performance Advisor
-- Additive indexes only; no data rewrite.

create index if not exists idx_class_invites_created_by
  on public.class_invites(created_by);

create index if not exists idx_class_join_requests_child
  on public.class_join_requests(child_id);

create index if not exists idx_class_join_requests_decided_by
  on public.class_join_requests(decided_by);

create index if not exists idx_class_join_requests_requested_by
  on public.class_join_requests(requested_by);
