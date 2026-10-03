# Aktywnik+ 0.5.0-beta.3 — Full Family Sync Pilot

## Cel

Ta wersja domyka fundament pilota rodzinnego: local-first pozostaje domyślnym trybem pracy, a po zalogowaniu dorosłego i jawnym powiązaniu profilu dziecka można synchronizować dane rodzinne między urządzeniami.

## Najważniejsze zmiany

- pełny family sync dla jawnie powiązanych profili dziecka;
- synchronizacja aktywności i statusów `pending/approved/rejected`;
- rodzinne tombstones i propagacja usunięć;
- historia decyzji rodzica `approved/rejected/corrected/deleted`;
- osobne kolejki synchronizacji dla trybu osobistego i rodzinnego;
- jawne `cloudChildId` bez automatycznego dopasowania po imieniu;
- obsługa wielu dzieci przez jednego rodzica;
- retry-safe tworzenie dziecka, klasy i zaproszenia;
- School Cloud lifecycle: create → invite → request → accept/reject;
- RLS na publicznych tabelach, blokada eskalacji `child → adult`;
- publiczne RPC lifecycle jako `SECURITY INVOKER`;
- School audit i techniczny mechanizm retencji;
- application restore drill PASS;
- Supabase migracje 001–025 live;
- Supabase Security Advisor: 0 aktywnych lintów.

## Zasada bezpieczeństwa

Funkcje chmurowe pozostają fail-closed. Family sync i School Cloud są aktywne tylko wtedy, gdy konfiguracja chmury, Auth i weryfikacja RLS są poprawnie ustawione.

## Stan wdrożenia

Warunek produkcyjnego deploymentu został spełniony 2026-10-03:
- Vercel production: `READY`;
- `/api/health`: `0.5.0-beta.3`;
- backend: `full-family-sync-pilot`;
- produkcyjna chmura, Auth i RLS: aktywne;
- production smoke z wymaganym cloud: PASS;
- 28/28 głównych plików runtime zgodnych bit-po-bicie z aktualnym `main`.

Przed szerszym pilotem pozostaje test akceptacyjny na rzeczywistych urządzeniach i kilka dni normalnego użytkowania jednej rodziny.

## Nadal poza zakresem produkcyjnego School

- formalna decyzja szkoły/IOD i model administrator–procesor;
- decyzja dotycząca DPIA i retencji;
- niezależny security review / pentest;
- zweryfikowany platformowy backup/restore Supabase;
- produkcyjne wdrożenie pełnego systemu szkolnego.
