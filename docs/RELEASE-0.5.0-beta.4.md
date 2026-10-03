# Aktywnik+ 0.5.0-beta.4 — Family Pilot Hardening

Data: 2026-10-03.

## Zakres wydania

Beta.4 stabilizuje pilot rodzinny bez rozszerzania zakresu danych przekazywanych szkole.

### Widok dziecka
- przy każdym wpisie pojawia się neutralna informacja „energia ruchu: lekka / umiarkowana / wysoka”;
- informacja jest wyliczana wyłącznie w przeglądarce na podstawie czasu i poziomu wysiłku;
- nie jest zapisywana jako osobne pole wpisu;
- nie jest celem, wynikiem ani podstawą oceny.

### Prywatność i raporty
- informacja o energii ruchu nie trafia do raportu nauczyciela;
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
