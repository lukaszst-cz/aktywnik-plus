# Security review — 2026-10-03

## Zakres

Techniczny przegląd bieżącego środowiska Aktywnik+ przed rozszerzaniem funkcji chmurowych.

## Wynik

**PASS warunkowy dla obecnego zakresu beta; migracja 018 blokująca self-escalation jest wdrożona live.**

Zweryfikowano na projekcie Supabase `aktywnik-plus`:
- projekt aktywny w regionie EU (`eu-central-1`);
- migracje `001`–`018` są zastosowane;
- 23/23 tabel w schemacie `public` ma włączone RLS;
- brak tabel publicznych bez polityki RLS;
- brak grantów tabel dla roli `anon`;
- `personal_activities` ma polityki SELECT / INSERT / UPDATE / DELETE ograniczone do `owner_id = auth.uid()`;
- Supabase Security Advisor: **1 typ ostrzeżenia / 5 findings** — publiczne funkcje `SECURITY DEFINER` wykonywalne przez `authenticated`: `create_class_invite`, `create_guardian_child`, `create_school_class`, `decide_class_join`, `request_class_join`;
- te 5 RPC są obecnie kontrolowanym wyjątkiem: `anon` i `PUBLIC` nie mają `EXECUTE`, `authenticated` ma dostęp, każda funkcja ma `search_path=''` i wewnętrzne sprawdzanie `auth.uid()` + roli/relacji;
- `backend/tests/security_preflight.sql` ma dokładną allowlistę tych 5 RPC i ma kończyć się FAIL, jeśli pojawi się kolejny publiczny `SECURITY DEFINER` dostępny dla `authenticated` albo osłabnie hardening istniejących;
- audit triggers dla personal activity create/update/delete: PASS;
- class lifecycle test create/invite/request/accept: PASS.

Repo zawiera `backend/tests/security_preflight.sql`, który ma być uruchamiany po zmianach schematu/RLS i kontroluje również powierzchnię `SECURITY DEFINER`.

## Zasada

Ten wynik nie zastępuje niezależnego pentestu ani formalnego audytu wdrożenia szkolnego. Potwierdza, że bieżąca konfiguracja bazy spełnia techniczne warunki do ograniczonego beta-sync, ale publiczne RPC `SECURITY DEFINER` powinny zostać usunięte z publicznej powierzchni Data API albo zastąpione równoważnym, bezpiecznym modelem przed produkcyjnym Aktywnik+ School.

## Nadal otwarte

- synchronizacja usunięć / tombstones w trybie osobistym: wdrożona;
- test izolacji wielu kont/tenantów: PASS na danych syntetycznych;
- refaktor 5 publicznych RPC `SECURITY DEFINER` do modelu bez ostrzeżenia Security Advisor;
- application restore drill: PASS; platformowy backup/restore Supabase nadal do zweryfikowania;
- dalsze domknięcie audytu i retencji School;
- testy E2E wielu realnych kont przed produkcją szkolną.
