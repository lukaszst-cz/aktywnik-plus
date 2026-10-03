-- Aktywnik+ migration 022 — idempotent School Cloud create operations
-- Prevent duplicate child/class/invite creation when a client retries after a timeout.
-- The idempotency ledger stays in app_private and is not directly exposed to clients.

create table if not exists app_private.idempotency_keys (
  actor_id uuid not null references public.profiles(id) on delete cascade,
  operation_type text not null,
  operation_key uuid not null,
  request_hash text not null,
  result_uuid uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (actor_id,operation_type,operation_key)
);

create index if not exists idx_idempotency_keys_created_at
  on app_private.idempotency_keys(created_at);

revoke all on table app_private.idempotency_keys from public, anon, authenticated;

create or replace function app_private.idempotency_begin(
  target_operation text,
  target_key uuid,
  target_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  claimed uuid;
  existing_hash text;
  existing_result uuid;
begin
  if actor is null then raise exception 'authentication_required'; end if;
  if target_key is null then raise exception 'idempotency_key_required'; end if;
  if nullif(btrim(coalesce(target_operation,'')),'') is null then raise exception 'idempotency_operation_required'; end if;
  if nullif(btrim(coalesce(target_hash,'')),'') is null then raise exception 'idempotency_hash_required'; end if;

  insert into app_private.idempotency_keys(
    actor_id,operation_type,operation_key,request_hash
  ) values (
    actor,btrim(target_operation),target_key,btrim(target_hash)
  )
  on conflict do nothing
  returning operation_key into claimed;

  if claimed is not null then
    return null;
  end if;

  select request_hash,result_uuid
    into existing_hash,existing_result
  from app_private.idempotency_keys
  where actor_id=actor
    and operation_type=btrim(target_operation)
    and operation_key=target_key;

  if existing_hash is distinct from btrim(target_hash) then
    raise exception 'idempotency_key_reused_with_different_payload';
  end if;
  if existing_result is null then
    raise exception 'idempotency_result_missing';
  end if;

  return existing_result;
end;
$$;

create or replace function app_private.idempotency_finish(
  target_operation text,
  target_key uuid,
  target_result uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then raise exception 'authentication_required'; end if;
  if target_key is null or target_result is null then raise exception 'idempotency_finish_invalid'; end if;

  update app_private.idempotency_keys
  set result_uuid=target_result,
      completed_at=now()
  where actor_id=actor
    and operation_type=btrim(target_operation)
    and operation_key=target_key;

  if not found then raise exception 'idempotency_claim_missing'; end if;
end;
$$;

revoke execute on function app_private.idempotency_begin(text,uuid,text) from public, anon, authenticated;
revoke execute on function app_private.idempotency_finish(text,uuid,uuid) from public, anon, authenticated;

create or replace function app_private.create_guardian_child_idempotent_secure(
  child_name text,
  operation_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_hash text := encode(extensions.digest(convert_to(btrim(coalesce(child_name,'')),'UTF8'),'sha256'),'hex');
  existing_result uuid;
  created_result uuid;
begin
  existing_result := app_private.idempotency_begin('guardian_child_create',operation_key,request_hash);
  if existing_result is not null then return existing_result; end if;

  created_result := app_private.create_guardian_child_secure(child_name);
  perform app_private.idempotency_finish('guardian_child_create',operation_key,created_result);
  return created_result;
end;
$$;

create or replace function app_private.create_school_class_idempotent_secure(
  target_tenant uuid,
  target_school_year uuid,
  class_name text,
  operation_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_hash text := encode(
    extensions.digest(
      convert_to(
        coalesce(target_tenant::text,'')||'|'||
        coalesce(target_school_year::text,'')||'|'||
        btrim(coalesce(class_name,'')),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
  existing_result uuid;
  created_result uuid;
begin
  existing_result := app_private.idempotency_begin('school_class_create',operation_key,request_hash);
  if existing_result is not null then return existing_result; end if;

  created_result := app_private.create_school_class_secure(target_tenant,target_school_year,class_name);
  perform app_private.idempotency_finish('school_class_create',operation_key,created_result);
  return created_result;
end;
$$;

create or replace function app_private.create_class_invite_idempotent_secure(
  target_class uuid,
  operation_key uuid,
  valid_days integer default 14
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_days integer := greatest(1,least(coalesce(valid_days,14),30));
  request_hash text := encode(
    extensions.digest(
      convert_to(coalesce(target_class::text,'')||'|'||normalized_days::text,'UTF8'),
      'sha256'
    ),
    'hex'
  );
  existing_result uuid;
  created_result uuid;
begin
  existing_result := app_private.idempotency_begin('class_invite_create',operation_key,request_hash);
  if existing_result is not null then return existing_result; end if;

  created_result := app_private.create_class_invite_secure(target_class,normalized_days);
  perform app_private.idempotency_finish('class_invite_create',operation_key,created_result);
  return created_result;
end;
$$;

revoke execute on function app_private.create_guardian_child_idempotent_secure(text,uuid)
  from public, anon;
revoke execute on function app_private.create_school_class_idempotent_secure(uuid,uuid,text,uuid)
  from public, anon;
revoke execute on function app_private.create_class_invite_idempotent_secure(uuid,uuid,integer)
  from public, anon;

grant execute on function app_private.create_guardian_child_idempotent_secure(text,uuid)
  to authenticated;
grant execute on function app_private.create_school_class_idempotent_secure(uuid,uuid,text,uuid)
  to authenticated;
grant execute on function app_private.create_class_invite_idempotent_secure(uuid,uuid,integer)
  to authenticated;

create or replace function public.create_guardian_child_idempotent(
  child_name text,
  operation_key uuid
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select app_private.create_guardian_child_idempotent_secure(child_name,operation_key);
$$;

create or replace function public.create_school_class_idempotent(
  target_tenant uuid,
  target_school_year uuid,
  class_name text,
  operation_key uuid
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select app_private.create_school_class_idempotent_secure(
    target_tenant,target_school_year,class_name,operation_key
  );
$$;

create or replace function public.create_class_invite_idempotent(
  target_class uuid,
  operation_key uuid,
  valid_days integer default 14
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select app_private.create_class_invite_idempotent_secure(
    target_class,operation_key,valid_days
  );
$$;

revoke execute on function public.create_guardian_child_idempotent(text,uuid)
  from public, anon;
revoke execute on function public.create_school_class_idempotent(uuid,uuid,text,uuid)
  from public, anon;
revoke execute on function public.create_class_invite_idempotent(uuid,uuid,integer)
  from public, anon;

grant execute on function public.create_guardian_child_idempotent(text,uuid)
  to authenticated;
grant execute on function public.create_school_class_idempotent(uuid,uuid,text,uuid)
  to authenticated;
grant execute on function public.create_class_invite_idempotent(uuid,uuid,integer)
  to authenticated;
