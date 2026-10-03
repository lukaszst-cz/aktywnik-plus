# Security review — 2026-10-03

## Zakres

Techniczny przegląd bieżącego środowiska Aktywnik+ przed rozszerzaniem funkcji chmurowych.

## Wynik

**PASS warunkowy dla obecnego zakresu beta; migracja 018 blokująca self-escalation jest wdrożona live.**

Zweryfikowano na projekcie Supabase `aktywnik-plus`:
- projekt aktywny w regionie EU (`eu-central-1`);
- migracje `001`–`022` są zastosowane;
- 23/23 tabel w schemacie `public` ma włączone RLS;
- brak tabel publicznych bez polityki RLS;
- brak grantów tabel dla roli `anon`;
- `personal_activities` ma polityki SELECT / INSERT / UPDATE / DELETE ograniczone do `owner_id = auth.uid()`;
- Supabase Security Advisor po migracji 020: **0 aktywnych lintów**;
- 5 publicznych RPC lifecycle działa jako `SECURITY INVOKER` i deleguje do prywatnych helperów `app_private` z zachowanymi kontrolami `auth.uid()` + roli/relacji;
- `backend/tests/security_preflight.sql` wymaga zera publicznych `SECURITY DEFINER` wykonywalnych przez `authenticated`, dokładnie 5 wrapperów invoker i 5 prywatnych helperów;
- audit triggers dla personal activity create/update/delete: PASS;
- School audit: 8 triggerów dla aktywności, raportów, nagród/ocen, klas, nauczycieli, membership i support access: PASS;
- prywatna retencja audit_events: `authenticated=false`, `anon=false`, `service_role=true`, `dry_run` PASS;
- class lifecycle test create/invite/request/accept: PASS;
- class lifecycle po migracji 020 (`SECURITY INVOKER` wrappers): PASS;
- family onboarding po migracji 020: PASS;
- family activity sync / migracja 022: pre-deploy RLS regression PASS; po wdrożeniu potwierdzono kolumny, indeksy, `tenant_id IS NULL` w family policies oraz pełny security preflight PASS;
- School Cloud idempotency / migracja 023: retry-regression + rozszerzony security preflight PASS w transakcji z rollbackiem; ledger pozostaje w `app_private` bez bezpośrednich grantów klienta; migracja nie jest jeszcze live;
- family delete tombstones / migracja 024: guardian-only RLS, school-row isolation i unrelated-adult isolation PASS; 023+024 + pełny security preflight PASS w transakcji z rollbackiem; migracja nie jest jeszcze live;
- Security Advisor po migracji 020: 0 aktywnych lintów.

Repo zawiera `backend/tests/security_preflight.sql`, który ma być uruchamiany po zmianach schematu/RLS i kontroluje również powierzchnię `SECURITY DEFINER`.

## Zasada

Ten wynik nie zastępuje niezależnego pentestu ani formalnego audytu wdrożenia szkolnego. Potwierdza, że bieżąca konfiguracja bazy spełnia techniczne warunki do ograniczonego beta-sync. Publiczna powierzchnia lifecycle RPC została po migracji 020 sprowadzona do `SECURITY INVOKER`, a uprzywilejowana logika pozostała w prywatnym schemacie.

## Nadal otwarte

- synchronizacja usunięć / tombstones w trybie osobistym: wdrożona;
- test izolacji wielu kont/tenantów: PASS na danych syntetycznych;
- application restore drill: PASS; platformowy backup/restore Supabase nadal do zweryfikowania;
- polityka okresu/częstotliwości retencji School — mechanizm techniczny gotowy, decyzja szkoły/IOD nadal wymagana;
- testy E2E wielu realnych kont przed produkcją szkolną.
