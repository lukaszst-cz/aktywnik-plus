# Aktywnik+ 0.5.0-beta.4 — Family Pilot Hardening

Data: 2026-10-03.

## Zakres wydania

Beta.4 stabilizuje pilot rodzinny bez rozszerzania zakresu danych przekazywanych szkole.

### Skala zmęczenia i strefa rodzica
- opis pola został ujednolicony ze szkolnym arkuszem: „Zmęczenie 1–5”;
- dziecko nie widzi wskaźników energetycznych ani kalorii;
- w chronionej strefie rodzica pojawia się neutralny wskaźnik „obciążenie wysiłkiem: lekkie / umiarkowane / wysokie”;
- wskaźnik jest wyliczany tylko do podglądu na podstawie czasu i skali zmęczenia;
- nie jest zapisywany jako osobne pole wpisu ani używany jako cel.

### Prywatność i raporty
- wskaźnik obciążenia wysiłkiem nie trafia do raportu nauczyciela;
- nie trafia do szkolnego PDF/A4;
- nie trafia do eksportu CSV;
- nie jest częścią personal sync ani family sync;
- nie jest zapisywana w Supabase.

### PWA / release
- podniesiono wersję do 0.5.0-beta.4;
- odświeżono cache PWA;
- production smoke oczekuje beta.4;
- release-consistency pilnuje zgodności numeru wersji.

## Stan pilota

Backend, Auth, RLS, personal sync i pełny family sync pozostają bez zmian względem beta.3. Beta.4 koncentruje się na stabilizacji i bezpiecznym UX przed testem rodzinnym na realnych urządzeniach.
