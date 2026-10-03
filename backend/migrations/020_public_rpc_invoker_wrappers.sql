-- Aktywnik+ migration 020 — remove public SECURITY DEFINER RPC surface
-- Public RPC names stay stable for the API, but become SECURITY INVOKER wrappers.
-- Privileged write logic lives in non-exposed app_private helpers with the same auth checks.

create or replace function app_private.create_class_invite_secure(
  target_class uuid,
  valid_days integer default 14
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  tenant uuid;
  invite_id uuid;
  invite_token uuid;
  days_count integer := greatest(1,least(coalesce(valid_days,14),30));
begin
  if actor is null then raise exception 'authentication_required'; end if;

  select c.tenant_id into tenant
  from public.classes c
  where c.id=target_class and c.archived_at is null;

  if tenant is null then raise exception 'class_not_found'; end if;
  if not (app_private.is_class_teacher(target_class) or app_private.is_school_admin(tenant)) then
    raise exception 'forbidden';
  end if;

  insert into public.class_invites(class_id,created_by,expires_at)
  values (target_class,actor,now()+make_interval(days=>days_count))
  returning id,token into invite_id,invite_token;

  insert into public.audit_events(tenant_id,actor_id,event_type,resource_type,resource_id)
  values (tenant,actor,'class_invite_created','class_invite',invite_id);

  return invite_token;
end;
$$;

create or replace function app_private.create_guardian_child_secure(child_name text)
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

create or replace function app_private.create_school_class_secure(
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

create or replace function app_private.decide_class_join_secure(
  target_request uuid,
  decision text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  req public.class_join_requests%rowtype;
  tenant uuid;
begin
  if actor is null then raise exception 'authentication_required'; end if;
  if decision not in ('accepted','rejected') then raise exception 'invalid_decision'; end if;

  select * into req
  from public.class_join_requests
  where id=target_request and status='pending'
  for update;

  if req.id is null then raise exception 'request_not_found'; end if;

  select c.tenant_id into tenant
  from public.classes c
  where c.id=req.class_id;

  if not (app_private.is_class_teacher(req.class_id) or app_private.is_school_admin(tenant)) then
    raise exception 'forbidden';
  end if;

  update public.class_join_requests
  set status=decision,decided_at=now(),decided_by=actor
  where id=req.id;

  if decision='accepted' then
    insert into public.class_children(
      class_id,child_id,participation_mode,status,report_status,joined_at
    ) values (
      req.class_id,req.child_id,'digital','active','missing',now()
    )
    on conflict (class_id,child_id)
    do update set status='active',joined_at=excluded.joined_at;
  end if;

  insert into public.audit_events(tenant_id,actor_id,event_type,resource_type,resource_id)
  values (
    tenant,
    actor,
    case when decision='accepted' then 'class_join_accepted' else 'class_join_rejected' end,
    'class_join_request',
    req.id
  );

  return true;
end;
$$;

create or replace function app_private.request_class_join_secure(
  invite_token uuid,
  target_child uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_class uuid;
  tenant uuid;
  request_id uuid;
begin
  if actor is null then raise exception 'authentication_required'; end if;
  if not app_private.is_guardian_of(target_child) then raise exception 'forbidden'; end if;

  select ci.class_id,c.tenant_id
    into target_class,tenant
  from public.class_invites ci
  join public.classes c on c.id=ci.class_id
  where ci.token=invite_token
    and ci.revoked_at is null
    and ci.expires_at>now()
    and c.archived_at is null;

  if target_class is null then raise exception 'invite_invalid_or_expired'; end if;

  if exists (
    select 1 from public.class_children cc
    where cc.class_id=target_class
      and cc.child_id=target_child
      and cc.status in ('pending','active')
  ) then
    raise exception 'child_already_joined';
  end if;

  select r.id into request_id
  from public.class_join_requests r
  where r.class_id=target_class and r.child_id=target_child and r.status='pending'
  order by r.created_at desc
  limit 1;

  if request_id is null then
    insert into public.class_join_requests(class_id,child_id,requested_by)
    values (target_class,target_child,actor)
    returning id into request_id;

    insert into public.audit_events(tenant_id,actor_id,event_type,resource_type,resource_id)
    values (tenant,actor,'class_join_requested','class_join_request',request_id);
  end if;

  return request_id;
end;
$$;

revoke execute on function app_private.create_class_invite_secure(uuid,integer) from public, anon;
revoke execute on function app_private.create_guardian_child_secure(text) from public, anon;
revoke execute on function app_private.create_school_class_secure(uuid,uuid,text) from public, anon;
revoke execute on function app_private.decide_class_join_secure(uuid,text) from public, anon;
revoke execute on function app_private.request_class_join_secure(uuid,uuid) from public, anon;

grant execute on function app_private.create_class_invite_secure(uuid,integer) to authenticated;
grant execute on function app_private.create_guardian_child_secure(text) to authenticated;
grant execute on function app_private.create_school_class_secure(uuid,uuid,text) to authenticated;
grant execute on function app_private.decide_class_join_secure(uuid,text) to authenticated;
grant execute on function app_private.request_class_join_secure(uuid,uuid) to authenticated;

create or replace function public.create_class_invite(
  target_class uuid,
  valid_days integer default 14
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select app_private.create_class_invite_secure(target_class,valid_days);
$$;

create or replace function public.create_guardian_child(child_name text)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select app_private.create_guardian_child_secure(child_name);
$$;

create or replace function public.create_school_class(
  target_tenant uuid,
  target_school_year uuid,
  class_name text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select app_private.create_school_class_secure(target_tenant,target_school_year,class_name);
$$;

create or replace function public.decide_class_join(
  target_request uuid,
  decision text
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select app_private.decide_class_join_secure(target_request,decision);
$$;

create or replace function public.request_class_join(
  invite_token uuid,
  target_child uuid
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select app_private.request_class_join_secure(invite_token,target_child);
$$;

revoke execute on function public.create_class_invite(uuid,integer) from public, anon;
revoke execute on function public.create_guardian_child(text) from public, anon;
revoke execute on function public.create_school_class(uuid,uuid,text) from public, anon;
revoke execute on function public.decide_class_join(uuid,text) from public, anon;
revoke execute on function public.request_class_join(uuid,uuid) from public, anon;

grant execute on function public.create_class_invite(uuid,integer) to authenticated;
grant execute on function public.create_guardian_child(text) to authenticated;
grant execute on function public.create_school_class(uuid,uuid,text) to authenticated;
grant execute on function public.decide_class_join(uuid,text) to authenticated;
grant execute on function public.request_class_join(uuid,uuid) to authenticated;

-- Existing private authorization helpers are needed by RLS, but should not
-- retain default PUBLIC/anon EXECUTE grants.
revoke execute on function app_private.is_class_teacher(uuid) from public, anon;
revoke execute on function app_private.is_guardian_of(uuid) from public, anon;
revoke execute on function app_private.is_school_admin(uuid) from public, anon;
grant execute on function app_private.is_class_teacher(uuid) to authenticated;
grant execute on function app_private.is_guardian_of(uuid) to authenticated;
grant execute on function app_private.is_school_admin(uuid) to authenticated;
