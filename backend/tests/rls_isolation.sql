-- Aktywnik+ RLS isolation test
-- Uruchamiać dopiero po migracjach 001-005 w projekcie Supabase.
-- Wszystkie dane są syntetyczne. Całość działa w transakcji i kończy się ROLLBACK.

begin;

-- Stałe syntetyczne UUID-y.
-- tenant A/B
-- 100...001 / 100...002
-- teacher A/B
-- 200...001 / 200...002
-- parent A/B
-- 300...001 / 300...002
-- child-account A/B
-- 400...001 / 400...002
-- child A/B
-- 500...001 / 500...002

insert into tenants(id,name,deployment_mode) values
('10000000-0000-0000-0000-000000000001','TEST School A','school_saas'),
('10000000-0000-0000-0000-000000000002','TEST School B','school_saas');

insert into profiles(id,display_name,profile_type) values
('20000000-0000-0000-0000-000000000001','Teacher A','adult'),
('20000000-0000-0000-0000-000000000002','Teacher B','adult'),
('30000000-0000-0000-0000-000000000001','Parent A','adult'),
('30000000-0000-0000-0000-000000000002','Parent B','adult'),
('40000000-0000-0000-0000-000000000001','Child Account A','child'),
('40000000-0000-0000-0000-000000000002','Child Account B','child');

insert into memberships(tenant_id,user_id,role,active) values
('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','school_admin',true),
('10000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','school_admin',true);

insert into school_years(id,tenant_id,label) values
('11000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','2026/2027'),
('11000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','2026/2027');

insert into classes(id,tenant_id,school_year_id,name,join_code) values
('12000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','11000000-0000-0000-0000-000000000001','5A','TEST-A'),
('12000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','11000000-0000-0000-0000-000000000002','5B','TEST-B');

insert into class_teachers(class_id,teacher_id) values
('12000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001'),
('12000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002');

insert into children(id,display_name,require_parent_approval) values
('50000000-0000-0000-0000-000000000001','Child A',true),
('50000000-0000-0000-0000-000000000002','Child B',true);

insert into guardians(child_id,guardian_id,guardian_role) values
('50000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','manager'),
('50000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','manager');

insert into child_accounts(child_id,user_id,active,paired_at) values
('50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',true,now()),
('50000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002',true,now());

insert into class_children(class_id,child_id,participation_mode,status,report_status,joined_at) values
('12000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','digital','active','submitted',now()),
('12000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002','digital','active','submitted',now());

insert into activities(id,child_id,tenant_id,activity_date,activity_type,minutes,status,source) values
('60000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','2026-10-01','Judo',90,'approved','manual'),
('60000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','2026-10-01','Basen',60,'approved','manual');

insert into reports(id,child_id,class_id,period_type,period_start,period_end,status,submitted_at,submitted_by) values
('70000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','12000000-0000-0000-0000-000000000001','month','2026-10-01','2026-10-31','submitted',now(),'30000000-0000-0000-0000-000000000001'),
('70000000-0000-0000-0000-000000000002','50000000-0000-0000-0000-000000000002','12000000-0000-0000-0000-000000000002','month','2026-10-01','2026-10-31','submitted',now(),'30000000-0000-0000-0000-000000000002');

insert into report_items(report_id,position,activity_date,activity_type,minutes,source) values
('70000000-0000-0000-0000-000000000001',1,'2026-10-01','Judo',90,'manual'),
('70000000-0000-0000-0000-000000000002',1,'2026-10-01','Basen',60,'manual');

-- Helper do symulacji sesji authenticated.
create or replace function pg_temp.login_as(test_user uuid)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub',test_user::text,'role','authenticated')::text,
    true
  );
  execute 'set local role authenticated';
end;
$$;

create or replace function pg_temp.back_to_admin()
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims','{}',true);
end;
$$;

-- Parent A: własne dziecko i aktywność TAK, cudze NIE.
select pg_temp.login_as('30000000-0000-0000-0000-000000000001');
do $$
begin
  if (select count(*) from children) <> 1 then raise exception 'RLS FAIL: Parent A children'; end if;
  if (select count(*) from activities) <> 1 then raise exception 'RLS FAIL: Parent A activities'; end if;
  if exists(select 1 from children where id='50000000-0000-0000-0000-000000000002') then raise exception 'RLS LEAK: Parent A -> Child B'; end if;
  if exists(select 1 from activities where child_id='50000000-0000-0000-0000-000000000002') then raise exception 'RLS LEAK: Parent A -> Activity B'; end if;
end $$;
select pg_temp.back_to_admin();

-- Child account A: własny profil dziecka/aktywność TAK, rodzeństwo/cudze NIE.
select pg_temp.login_as('40000000-0000-0000-0000-000000000001');
do $$
begin
  if (select count(*) from children) <> 1 then raise exception 'RLS FAIL: Child A children'; end if;
  if (select count(*) from activities) <> 1 then raise exception 'RLS FAIL: Child A activities'; end if;
  if exists(select 1 from activities where child_id='50000000-0000-0000-0000-000000000002') then raise exception 'RLS LEAK: Child A -> Activity B'; end if;
end $$;
select pg_temp.back_to_admin();

-- Teacher A: klasa A/raport A TAK, surowe activities NIE, szkoła B NIE.
select pg_temp.login_as('20000000-0000-0000-0000-000000000001');
do $$
begin
  if (select count(*) from classes) <> 1 then raise exception 'RLS FAIL: Teacher A classes'; end if;
  if (select count(*) from reports) <> 1 then raise exception 'RLS FAIL: Teacher A reports'; end if;
  if (select count(*) from report_items) <> 1 then raise exception 'RLS FAIL: Teacher A report_items'; end if;
  if (select count(*) from activities) <> 0 then raise exception 'RLS LEAK: Teacher A raw activities'; end if;
  if exists(select 1 from reports where id='70000000-0000-0000-0000-000000000002') then raise exception 'RLS LEAK: Teacher A -> Report B'; end if;
end $$;
select pg_temp.back_to_admin();

-- Teacher/Admin B: analogiczna izolacja w drugą stronę.
select pg_temp.login_as('20000000-0000-0000-0000-000000000002');
do $$
begin
  if (select count(*) from classes) <> 1 then raise exception 'RLS FAIL: Teacher B classes'; end if;
  if exists(select 1 from classes where id='12000000-0000-0000-0000-000000000001') then raise exception 'RLS LEAK: Tenant B -> class A'; end if;
  if exists(select 1 from reports where id='70000000-0000-0000-0000-000000000001') then raise exception 'RLS LEAK: Teacher B -> Report A'; end if;
  if (select count(*) from activities) <> 0 then raise exception 'RLS LEAK: Teacher B raw activities'; end if;
end $$;
select pg_temp.back_to_admin();

-- Anonymous: nie ma nawet uprawnień SELECT do danych szkolnych.
reset role;
do $
begin
  if has_table_privilege('anon','public.children','SELECT') then raise exception 'GRANT LEAK: anon children'; end if;
  if has_table_privilege('anon','public.activities','SELECT') then raise exception 'GRANT LEAK: anon activities'; end if;
  if has_table_privilege('anon','public.reports','SELECT') then raise exception 'GRANT LEAK: anon reports'; end if;
  if has_table_privilege('anon','public.classes','SELECT') then raise exception 'GRANT LEAK: anon classes'; end if;
end $;

rollback;

-- PASS oznacza brak wyjątku.
