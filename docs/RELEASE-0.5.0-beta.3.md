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

## Warunek przed szerszym pilotem

Publiczny deployment musi odpowiadać tej wersji i raportować w `/api/health` wersję `0.5.0-beta.3`. Należy również zweryfikować `/api/capabilities` oraz wykonać smoke na urządzeniu mobilnym.

## Nadal poza zakresem produkcyjnego School

- formalna decyzja szkoły/IOD i model administrator–procesor;
- decyzja dotycząca DPIA i retencji;
- niezależny security review / pentest;
- zweryfikowany platformowy backup/restore Supabase;
- produkcyjne wdrożenie pełnego systemu szkolnego.
