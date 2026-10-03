# Backend Aktywnik+

## Stan 0.5.0-beta.2

Backend działa etapami i pozostaje **fail-closed**. Tryb lokalny nie wymaga konta.

Aktualne endpointy:
- `GET /api/health`;
- `GET /api/capabilities`;
- `GET/POST /api/v1/sync` — synchronizacja trybu osobistego;
- `GET /api/v1/me` — profil i membership użytkownika;
- `GET /api/v1/classes` — odczyt klas ograniczony przez RLS.

## Model bezpieczeństwa

Zwykłe endpointy użytkownika:
1. wymagają `AKTYWNIK_CLOUD_SYNC=true`;
2. wymagają `AKTYWNIK_RLS_VERIFIED=true`;
3. wymagają `AUTH_MODE=supabase`;
4. używają `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY`;
5. przekazują Bearer JWT zalogowanego użytkownika;
6. polegają na RLS do autoryzacji wierszy.

Service-role/secret key nie jest potrzebny w zwykłym przepływie użytkownika.

## Baza

Na środowisku Supabase zastosowano migracje `001`–`012`.

Weryfikacja 2026-10-03:
- 20/20 tabel publicznych z RLS;
- 0 grantów dla `anon`;
- 0 tabel bez polityk;
- Security Advisor: 0 aktywnych problemów;
- `backend/tests/security_preflight.sql`: PASS.

## Nadal wyłączone / nieukończone

- cloud delete/tombstones;
- pełny sync rodzinny;
- tworzenie i dołączanie do klas;
- pełna integracja audit_events;
- produkcyjny restore drill.

Nie używać prawdziwych danych dzieci w środowisku dev/test.
