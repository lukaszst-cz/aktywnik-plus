-- Aktywnik+ migration 015 — school class invitations and join workflow

create table if not exists public.class_invites (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_class_invites_class
  on public.class_invites(class_id, created_at desc);

create table if not exists public.class_join_requests (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null
);

create unique index if not exists uq_class_join_requests_pending
  on public.class_join_requests(class_id, child_id)
  where status='pending';

create index if not exists idx_class_join_requests_class_status
  on public.class_join_requests(class_id, status, created_at desc);

alter table public.class_invites enable row level security;
alter table public.class_join_requests enable row level security;

revoke all on table public.class_invites from anon, authenticated;
revoke all on table public.class_join_requests from anon, authenticated;
grant select on table public.class_invites to authenticated;
grant select on table public.class_join_requests to authenticated;

drop policy if exists class_invites_select_staff on public.class_invites;
create policy class_invites_select_staff
on public.class_invites for select to authenticated
using (
  app_private.is_class_teacher(class_id)
  or exists (
    select 1 from public.classes c
    where c.id=class_id and app_private.is_school_admin(c.tenant_id)
  )
);

drop policy if exists class_join_requests_select_authorized on public.class_join_requests;
create policy class_join_requests_select_authorized
on public.class_join_requests for select to authenticated
using (
  requested_by = (select auth.uid())
  or app_private.is_guardian_of(child_id)
  or app_private.is_class_teacher(class_id)
  or exists (
    select 1 from public.classes c
    where c.id=class_id and app_private.is_school_admin(c.tenant_id)
  )
);

create or replace function public.create_class_invite(target_class uuid, valid_days integer default 14)
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

create or replace function public.request_class_join(invite_token uuid, target_child uuid)
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

create or replace function public.decide_class_join(target_request uuid, decision text)
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

revoke execute on function public.create_class_invite(uuid,integer) from public, anon;
revoke execute on function public.request_class_join(uuid,uuid) from public, anon;
revoke execute on function public.decide_class_join(uuid,text) from public, anon;

grant execute on function public.create_class_invite(uuid,integer) to authenticated;
grant execute on function public.request_class_join(uuid,uuid) to authenticated;
grant execute on function public.decide_class_join(uuid,text) to authenticated;
