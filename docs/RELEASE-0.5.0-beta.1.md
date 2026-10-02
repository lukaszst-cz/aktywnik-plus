# Aktywnik+ 0.5.0-beta.1 — Sync Foundation

## Cel

Pierwszy etap przejścia z lokalnej PWA do opcjonalnego konta i synchronizacji między urządzeniami, bez odbierania użytkownikowi trybu lokalnego.

## Dodane

- konto opcjonalne z logowaniem bez hasła przez Magic Link;
- sesja konta z odświeżaniem tokenu i wylogowaniem;
- publiczny publishable key Supabase w kliencie — bez kluczy administracyjnych;
- CSP dopuszcza połączenia wyłącznie z projektem Aktywnik+ Supabase;
- local-first sync queue: zapis lokalny zawsze jest pierwszy, chmura nie blokuje aplikacji;
- osobna tabela `personal_activities` z RLS dla trybu **Dla siebie** — dorosły użytkownik nie jest modelowany jako dziecko;
- endpoint `/api/v1/sync` obsługuje idempotentny upsert własnych wpisów w trybie osobistym;
- status synchronizacji w nagłówku;
- skrót Konto / Sync;
- obsługa nowego modelu Supabase publishable/secret keys;
- migracje 008–011 odzyskane z faktycznie wdrożonej bazy Supabase;
- połączenie z istniejącym fundamentem PL/EN;
- rozszerzone testy CI pod kątem wycieku kluczy serwerowych, CSP, PWA i sync client.

## Bezpieczniki

Cloud sync nadal jest fail-closed. Włączenie wymaga:
1. testu dwóch niezależnych kont;
2. testu RLS dla danych rodziny i dziecka;
3. konfiguracji dozwolonych redirect URL dla Magic Link;
4. testu konfliktów offline/online;
5. testu odzyskiwania sesji i rotacji refresh tokenu.

## Zasada

Tryb bez konta pozostaje pełnoprawną opcją. Brak sieci lub błąd chmury nie może blokować START/STOP, ręcznego wpisu, historii ani eksportu.
