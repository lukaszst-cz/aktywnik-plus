-- Aktywnik+ migration 006 — explicit Data API grants
-- Cel: grants + RLS jako dwie niezależne warstwy ochrony.
-- Uruchamiać po migracjach 001-005.

-- Nie pozwalaj, by nowe obiekty w public automatycznie trafiały do anon/authenticated.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, public;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated;

-- Aktualne tabele: najpierw wyzeruj klientom dostęp.
revoke all on table
  tenants,
  profiles,
  memberships,
  school_years,
  classes,
  class_teachers,
  children,
  guardians,
  class_children,
  activities,
  activity_approvals,
  reports,
  rewards,
  audit_events,
  support_access_grants,
  child_accounts,
  activity_approval_events,
  pairing_codes,
  report_items
from anon, authenticated;

-- Anonimowy klient nie ma bezpośredniego dostępu do danych szkolnych.
-- Publiczny pilot lokalny nie potrzebuje Data API.
revoke usage on schema app_private from anon;

-- Zalogowani użytkownicy: tylko operacje, dla których istnieją polityki RLS.
grant select, update on table profiles to authenticated;
grant select on table memberships to authenticated;
grant select on table school_years to authenticated;
grant select on table classes to authenticated;
grant select on table class_teachers to authenticated;
grant select on table children to authenticated;
grant select on table guardians to authenticated;
grant select on table class_children to authenticated;

grant select, insert, update on table activities to authenticated;
grant select, insert, update, delete on table activity_approvals to authenticated;
grant select on table reports to authenticated;
grant select, insert on table rewards to authenticated;

grant select on table audit_events to authenticated;
grant select on table support_access_grants to authenticated;

grant select on table child_accounts to authenticated;
grant select, insert on table activity_approval_events to authenticated;
grant select, insert, update on table pairing_codes to authenticated;
grant select on table report_items to authenticated;

-- Funkcje pomocnicze RLS są w nieeksponowanym schemacie app_private.
-- Użytkownicy potrzebują prawa wykonania podczas ewaluacji polityk,
-- ale schemat nie powinien być wystawiony jako Data API schema.
grant usage on schema app_private to authenticated;
grant execute on all functions in schema app_private to authenticated;
revoke usage on schema app_private from anon;

-- Service role jest wyłącznie po stronie serwera.
grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Po tej migracji zalecane:
-- 1) uruchomić backend/tests/rls_isolation.sql,
-- 2) uruchomić Supabase Security Advisor,
-- 3) dopiero po PASS ustawić AKTYWNIK_RLS_VERIFIED=true.
