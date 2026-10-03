# Security review — 2026-10-03

## Zakres

Techniczny przegląd bieżącego środowiska Aktywnik+ przed rozszerzaniem funkcji chmurowych.

## Wynik

**PASS dla obecnego zakresu beta.**

Zweryfikowano na projekcie Supabase `aktywnik-plus`:
- projekt aktywny w regionie EU (`eu-central-1`);
- migracje `001`–`013` są zastosowane;
- 20/20 tabel w schemacie `public` ma włączone RLS;
- brak tabel publicznych bez polityki RLS;
- brak grantów tabel dla roli `anon`;
- `personal_activities` ma polityki SELECT / INSERT / UPDATE / DELETE ograniczone do `owner_id = auth.uid()`;
- Supabase Security Advisor: 0 aktywnych problemów bezpieczeństwa.

Repo zawiera również `backend/tests/security_preflight.sql`, który ma być uruchamiany po zmianach schematu/RLS.

## Zasada

Ten wynik nie zastępuje niezależnego pentestu ani formalnego audytu wdrożenia szkolnego. Potwierdza natomiast, że bieżąca konfiguracja bazy spełnia techniczne warunki do ograniczonego beta-sync w kontekście zalogowanego użytkownika.

## Nadal otwarte

- synchronizacja usunięć / tombstones w trybie osobistym: wdrożona;
- test izolacji wielu kont/tenantów: PASS na danych syntetycznych;
- pełny workflow szkoła–klasa–rodzic;
- zweryfikowany restore z kopii backendu;
- pełna obsługa zdarzeń audytowych po stronie aplikacji;
- testy E2E wielu realnych kont przed produkcją szkolną.
