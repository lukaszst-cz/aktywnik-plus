-- Aktywnik+ 027: separately scoped, optional motivation-goal sync.
-- Applied only after PR #94 / migration 026 is reviewed and deployed.
-- A user can read/write only goals in their own account. Never publish child activity data.

create table if not exists public.user_activity_goals (
  owner_id uuid not null references auth.users(id) on delete cascade,
  profile_key text not null
    check (profile_key='self'
       or profile_key ~ '^family:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'),
  period text not null check (period in ('7','14','21','month')),
  target_minutes integer not null check (target_minutes between 0 and 6000),
  changed_at timestamptz not null default now(),
  primary key (owner_id, profile_key, period)
);

alter table public.user_activity_goals enable row level security;
revoke all on table public.user_activity_goals from public, anon, authenticated;
grant select, insert, update on table public.user_activity_goals to authenticated;

create policy user_activity_goals_select_own
on public.user_activity_goals for select to authenticated
using (owner_id = (select auth.uid()));

create policy user_activity_goals_insert_own
on public.user_activity_goals for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy user_activity_goals_update_own
on public.user_activity_goals for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

-- A later device may sync an older queued change. Preserve the newer goal.
create or replace function app_private.prevent_stale_user_goal_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.changed_at <= old.changed_at then
    return old;
  end if;
  return new;
end;
$$;

revoke execute on function app_private.prevent_stale_user_goal_update()
from public, anon, authenticated;

create trigger user_activity_goals_guard_stale
before update on public.user_activity_goals
for each row execute function app_private.prevent_stale_user_goal_update();

-- No delete API: clearing a goal means setting target_minutes=0.
-- No service-role bypass and no access for anonymous clients.
