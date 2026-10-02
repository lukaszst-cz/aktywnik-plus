# Backend Aktywnik+

## Stan

Backend jest wdrażany etapami. Publiczny pilot nadal działa lokalnie i bez logowania.

Aktualnie uruchamiane są tylko bezpieczne endpointy diagnostyczne:
- `/api/health`
- `/api/capabilities`

Chronione funkcje szkolne pozostają wyłączone do czasu:
1. podłączenia bazy PostgreSQL/Supabase;
2. skonfigurowania logowania dorosłych;
3. uruchomienia RLS;
4. przejścia testów dostępu;
5. ustawienia `AKTYWNIK_CLOUD_SYNC=true`.

## Zasada fail-closed

Brak konfiguracji bazy lub autoryzacji **nie włącza trybu chmurowego**.

Frontend może nadal pracować lokalnie.

## Pliki

- `schema.sql` — model bazowy;
- `migrations/001_core.sql` — pierwszy schemat migracyjny;
- `migrations/002_supabase_rls.sql` — RLS dla wariantu Supabase;
- `../.env.example` — wymagane zmienne środowiskowe.

## Kolejność uruchomienia prawdziwego backendu

1. Utworzyć projekt Supabase/PostgreSQL.
2. Ustawić `DATABASE_URL` lub `SUPABASE_URL`.
3. Wykonać migrację `001_core.sql`.
4. Dla Supabase wykonać `002_supabase_rls.sql`.
5. Włączyć dostawcę logowania.
6. Uruchomić testy polityk dostępu na danych syntetycznych.
7. Dopiero wtedy ustawić `AKTYWNIK_CLOUD_SYNC=true`.

## Dane produkcyjne

Nie używać prawdziwych danych dzieci w środowisku dev/test.
