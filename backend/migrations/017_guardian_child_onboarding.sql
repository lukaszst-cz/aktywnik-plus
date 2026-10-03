-- Aktywnik+ migration 017 — guardian child cloud onboarding

create or replace function public.create_guardian_child(child_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  new_child uuid;
  clean_name text := btrim(coalesce(child_name,''));
begin
  if actor is null then raise exception 'authentication_required'; end if;
  if char_length(clean_name)<1 or char_length(clean_name)>60 then raise exception 'invalid_child_name'; end if;

  if not exists (
    select 1 from public.profiles p
    where p.id=actor and p.profile_type='adult'
  ) then raise exception 'adult_account_required'; end if;

  insert into public.children(display_name,require_parent_approval)
  values (clean_name,true)
  returning id into new_child;

  insert into public.guardians(child_id,guardian_id,guardian_role)
  values (new_child,actor,'manager');

  insert into public.audit_events(tenant_id,actor_id,event_type,resource_type,resource_id)
  values (null,actor,'family_child_created','child',new_child);

  return new_child;
end;
$$;

revoke execute on function public.create_guardian_child(text) from public, anon;
grant execute on function public.create_guardian_child(text) to authenticated;
