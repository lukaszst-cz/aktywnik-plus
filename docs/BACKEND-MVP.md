# Backend MVP — plan wykonawczy

## Co działa już teraz

- Vercel Functions;
- `GET /api/health`;
- `GET /api/capabilities`;
- chronione placeholdery `/api/v1/classes` i `/api/v1/sync`;
- schemat PostgreSQL;
- migracja core;
- przygotowane RLS dla Supabase;
- CI;
- fail-closed przy braku auth/bazy.

## Następny etap po podłączeniu Supabase

### 1. Projekt i baza
- utworzyć projekt;
- zastosować `001_core.sql`;
- zastosować migracje `001` → `007` w kolejności;
- sprawdzić, czy wszystkie tabele aplikacji mają RLS;
- sprawdzić jawne GRANT-y Data API;
- uruchomić `backend/tests/rls_isolation.sql`;
- uruchomić Security Advisor.

### 2. Auth
- magic link / passkey dla rodzica;
- Google/Microsoft SSO lub magic link dla nauczyciela;
- brak własnego e-maila dziecka.

### 3. Testy RLS
Na danych syntetycznych:
- rodzic A nie widzi dziecka rodzica B;
- nauczyciel A nie widzi klasy nauczyciela B;
- nauczyciel widzi tylko własne klasy;
- admin szkoły nie widzi innego tenant;
- niezalogowany użytkownik nie widzi danych.

### 4. Pierwsze funkcje chmurowe
- utworzenie klasy;
- jednorazowy/rotowany link lub kod dołączenia;
- zgłoszenie rodzica;
- akceptacja nauczyciela;
- przesłanie raportu;
- status raportu.

### 5. Migracja lokalnego pilota
Nie wysyłamy wszystkiego automatycznie.
Rodzic świadomie wybiera:
**„Włącz synchronizację dla tego profilu”**.

Dopiero po potwierdzeniu lokalne dane mogą zostać przesłane do przypisanego konta.

## Kryterium włączenia cloud sync

`AKTYWNIK_CLOUD_SYNC=true` dopiero gdy:
- baza działa;
- auth działa;
- RLS przeszedł testy izolacji;
- Security Advisor nie zgłasza krytycznych problemów;
- `AKTYWNIK_RLS_VERIFIED=true`;
- backup/restore jest sprawdzony;
- privacy notice jest zaktualizowany;
- środowisko produkcyjne ma właściwe sekrety.
