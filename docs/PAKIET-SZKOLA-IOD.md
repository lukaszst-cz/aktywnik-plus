# Pakiet wdrożeniowy szkoła / IOD — Aktywnik+

## Cel pilota

Rejestrowanie dodatkowej aktywności fizycznej w możliwie prosty sposób: aplikacja, papier lub model hybrydowy. Aktywnik+ nie ustala zasad oceniania i nie zastępuje dziennika szkolnego.

## Minimalny zakres danych

Podstawowy rekord:
- identyfikator/profil dziecka;
- data;
- rodzaj aktywności;
- czas;
- opcjonalnie wysiłek i krótka uwaga.

Projekt nie wymaga GPS, masy ciała, kalorii, danych medycznych ani zdjęcia twarzy.

## Role techniczne

- dorosły użytkownik — uwierzytelniany;
- opiekun — dostęp tylko do powiązanych dzieci;
- konto dziecka — ograniczony zakres;
- nauczyciel — dostęp tylko do przypisanych klas;
- administrator szkoły — dostęp w obrębie tenant/szkoły.

Egzekwowanie dostępu odbywa się w bazie przez RLS, nie tylko w UI.

## Hosting i dostawcy

- frontend/API: Vercel;
- Auth i PostgreSQL: Supabase, projekt w regionie EU;
- repozytorium kodu: GitHub;
- dane testowe w repo są syntetyczne.

## Środki techniczne już wdrożone

- HTTPS i nagłówki bezpieczeństwa;
- Content-Security-Policy;
- RLS na wszystkich publicznych tabelach;
- brak grantów dla `anon`;
- konta dorosłych bez klasycznych haseł (Magic Link);
- fail-closed cloud sync;
- eksport JSON/CSV/PDF;
- lokalne usuwanie danych;
- CI, testy PWA/UI/backend;
- database security preflight;
- procedura incydentów;
- DPIA screening.

## Decyzje wymagane od szkoły / administratora danych

- podstawa prawna;
- ostateczny model ról administrator/podmiot przetwarzający;
- zatwierdzona retencja;
- obowiązek i wynik DPIA;
- treść informacji dla rodziców/uczniów;
- procedura nadawania i odbierania uprawnień;
- zgoda na uruchomienie produkcyjnego wariantu School.

## Dokumenty w repo

- `docs/WARUNKI-KRYTYCZNE-PILOTA.md`
- `docs/DPIA-SCREENING.md`
- `docs/PROCEDURA-INCYDENTOW.md`
- `docs/SECURITY-REVIEW-2026-10-03.md`
- `privacy.html`
