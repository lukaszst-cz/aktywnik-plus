# Backend MVP — stan wykonania

## Gotowe

- Vercel Functions;
- Supabase project w EU;
- migracje 001–016;
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

### 1. Lifecycle klasy — backend ✅
Gotowe:
- `create_school_class`;
- `create_class_invite`;
- `request_class_join`;
- `decide_class_join`;
- API dla klas, zaproszeń i join request;
- audit events;
- test transakcyjny PASS.

Pozostaje:
- finalny UI nauczyciela/rodzica;
- test przez publiczne API na kilku kontach testowych.

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
