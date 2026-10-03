-- Aktywnik+ migration 016 — create school class RPC

create or replace function public.create_school_class(
  target_tenant uuid,
  target_school_year uuid,
  class_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  new_class uuid;
  code text;
  clean_name text := btrim(coalesce(class_name,''));
begin
  if actor is null then raise exception 'authentication_required'; end if;
  if not app_private.is_school_admin(target_tenant) then raise exception 'forbidden'; end if;
  if char_length(clean_name)<1 or char_length(clean_name)>80 then raise exception 'invalid_class_name'; end if;

  if not exists (
    select 1 from public.school_years sy
    where sy.id=target_school_year
      and sy.tenant_id=target_tenant
      and sy.archived_at is null
  ) then raise exception 'school_year_not_found'; end if;

  code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));

  insert into public.classes(tenant_id,school_year_id,name,join_code)
  values (target_tenant,target_school_year,clean_name,code)
  returning id into new_class;

  insert into public.class_teachers(class_id,teacher_id)
  values (new_class,actor)
  on conflict do nothing;

  insert into public.audit_events(tenant_id,actor_id,event_type,resource_type,resource_id)
  values (target_tenant,actor,'class_created','class',new_class);

  return new_class;
end;
$$;

revoke execute on function public.create_school_class(uuid,uuid,text) from public, anon;
grant execute on function public.create_school_class(uuid,uuid,text) to authenticated;
