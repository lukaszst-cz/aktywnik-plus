# Backend MVP — stan wykonania

## Gotowe

- Vercel Functions;
- Supabase project w EU;
- migracje 001–012;
- Supabase Auth / Magic Link;
- RLS na wszystkich tabelach publicznych;
- brak grantów `anon`;
- personal sync push → pull;
- merge wpisów z różnych urządzeń;
- `GET /api/v1/me`;
- `GET /api/v1/classes` przez user JWT + RLS;
- CI, PWA/UI/backend smoke;
- database security preflight;
- fail-closed przy braku wymaganej konfiguracji.

## Następny etap techniczny

### 1. Lifecycle klasy
- tworzenie klasy przez uprawnioną rolę;
- bezpieczny kod/link dołączenia;
- zgłoszenie rodzica;
- akceptacja;
- powiązanie family child ↔ school child.

### 2. Synchronizacja rodzinna
- osobne ownership/guardian rules;
- konflikt offline;
- świadome włączenie profilu do chmury.

### 3. Usuwanie
- tombstones;
- propagacja delete między urządzeniami;
- kontrola retencji.

### 4. Operacyjność
- audit_events w krytycznych akcjach;
- backend backup/restore drill;
- test wielu kont i tenant escape;
- niezależny review bezpieczeństwa przed Aktywnik+ School.

## Warunek rozszerzenia chmury

Każdy nowy zakres jest włączany dopiero po:
- testach RLS;
- aktualizacji `backend/tests/security_preflight.sql`;
- zielonym CI;
- testach E2E na danych syntetycznych;
- aktualizacji dokumentacji prywatności i retencji, jeśli zakres danych się zmienia.
