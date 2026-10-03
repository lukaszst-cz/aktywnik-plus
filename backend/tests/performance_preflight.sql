-- Aktywnik+ FK index regression test
-- Read-only verification when run after migration 021.

do $$
declare
  missing text;
begin
  with expected(index_name) as (
    values
      ('idx_class_invites_created_by'),
      ('idx_class_join_requests_child'),
      ('idx_class_join_requests_decided_by'),
      ('idx_class_join_requests_requested_by')
  )
  select string_agg(e.index_name, ', ' order by e.index_name)
    into missing
  from expected e
  where not exists (
    select 1
    from pg_indexes p
    where p.schemaname='public'
      and p.indexname=e.index_name
  );

  if missing is not null then
    raise exception 'PERFORMANCE PREFLIGHT FAIL: missing FK indexes: %', missing;
  end if;
end $$;

select 'PASS' as status, 'foreign-key covering indexes present' as summary;
