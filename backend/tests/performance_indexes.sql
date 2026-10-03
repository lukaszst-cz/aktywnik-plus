-- Aktywnik+ school lifecycle FK index preflight
-- Read-only. Run after migration 019.

do $$
declare
  missing text;
begin
  with required(index_name) as (
    values
      ('idx_class_invites_created_by'),
      ('idx_class_join_requests_child'),
      ('idx_class_join_requests_requested_by'),
      ('idx_class_join_requests_decided_by')
  )
  select string_agg(r.index_name, ', ' order by r.index_name)
    into missing
  from required r
  where not exists (
    select 1
    from pg_indexes i
    where i.schemaname='public'
      and i.indexname=r.index_name
  );

  if missing is not null then
    raise exception 'PERFORMANCE PREFLIGHT FAIL: missing school lifecycle FK indexes: %', missing;
  end if;
end $$;

select 'PASS' as status,
       'school lifecycle foreign-key indexes present' as summary;
