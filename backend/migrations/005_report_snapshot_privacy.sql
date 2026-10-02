-- Aktywnik+ migration 005 — report snapshot privacy
-- Cel: nauczyciel widzi wyłącznie raport świadomie przekazany przez rodzinę,
-- a nie pełną surową historię aktywności dziecka.

alter table reports
  add column if not exists submitted_at timestamptz,
  add column if not exists submitted_by uuid references profiles(id) on delete set null;

create table if not exists report_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  position integer not null check (position > 0),
  activity_date date not null,
  activity_type text not null,
  minutes integer not null check (minutes > 0 and minutes <= 600),
  effort smallint check (effort between 1 and 5),
  note text,
  source text check (source in ('manual','timer','paper_import')),
  created_at timestamptz not null default now(),
  unique (report_id, position)
);

create index if not exists idx_report_items_report on report_items(report_id,position);

alter table report_items enable row level security;

-- Usuń wcześniejszą politykę, która pozwalała nauczycielowi czytać
-- surową tabelę activities przez sam fakt przypisania dziecka do klasy.
drop policy if exists activities_select on activities;

create policy activities_select_guardian
on activities for select
using (app_private.is_guardian_of(child_id));

-- Polityka child-account z migracji 004 pozostaje osobno aktywna.

-- Raporty: nauczyciel widzi tylko raport oddany lub sprawdzony.
drop policy if exists reports_select on reports;

create policy reports_select_guardian
on reports for select
using (app_private.is_guardian_of(child_id));

create policy reports_select_teacher_submitted
on reports for select
using (
  class_id is not null
  and status in ('submitted','reviewed')
  and app_private.is_class_teacher(class_id)
);

-- Konto dziecka nadal korzysta z reports_select_child_account z migracji 004.

create policy report_items_select_guardian
on report_items for select
using (
  exists (
    select 1 from reports r
    where r.id = report_items.report_id
      and app_private.is_guardian_of(r.child_id)
  )
);

create policy report_items_select_child
on report_items for select
using (
  exists (
    select 1 from reports r
    where r.id = report_items.report_id
      and app_private.is_child_account(r.child_id)
  )
);

create policy report_items_select_teacher_submitted
on report_items for select
using (
  exists (
    select 1 from reports r
    where r.id = report_items.report_id
      and r.class_id is not null
      and r.status in ('submitted','reviewed')
      and app_private.is_class_teacher(r.class_id)
  )
);

-- Zapisy raportu i snapshotu powinny przechodzić przez kontrolowany backend/RPC.
-- Service role musi każdorazowo walidować guardian -> child -> class oraz status raportu.
