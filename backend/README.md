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
- `migrations/002_supabase_rls.sql` — bazowe RLS dla wariantu Supabase;
- `migrations/003_family_roles.sql` — wiele dzieci, konta dziecka, historia decyzji i kody parowania;
- `migrations/004_family_rls.sql` — RLS dla kont dziecka i parowania;
- `migrations/005_report_snapshot_privacy.sql` — nauczyciel widzi tylko świadomie przekazany snapshot raportu;
- `migrations/006_explicit_api_grants.sql` — jawne minimalne GRANT-y dla Data API;
- `migrations/007_auth_profile_bootstrap.sql` — minimalny profil dorosłego po Supabase Auth;
- `tests/rls_isolation.sql` — syntetyczny test izolacji rodzina / dziecko / nauczyciel / tenant;
- `../.env.example` — wymagane zmienne środowiskowe.

## Kolejność uruchomienia prawdziwego backendu

1. Utworzyć projekt Supabase/PostgreSQL.
2. Ustawić `DATABASE_URL` lub `SUPABASE_URL`.
3. Wykonać migrację `001_core.sql`.
4. Dla Supabase wykonać `002_supabase_rls.sql`.
5. Wykonać `003_family_roles.sql`.
6. Wykonać `004_family_rls.sql`.
7. Wykonać `005_report_snapshot_privacy.sql`.
8. Wykonać `006_explicit_api_grants.sql`.
9. Wykonać `007_auth_profile_bootstrap.sql`.
10. Włączyć Supabase Auth dla dorosłych.
11. Uruchomić `backend/tests/rls_isolation.sql`.
12. Uruchomić Supabase Security Advisor i usunąć istotne ostrzeżenia.
13. Ustawić `AKTYWNIK_RLS_VERIFIED=true`.
14. Dopiero na samym końcu ustawić `AKTYWNIK_CLOUD_SYNC=true`.

## Dane produkcyjne

Nie używać prawdziwych danych dzieci w środowisku dev/test.
