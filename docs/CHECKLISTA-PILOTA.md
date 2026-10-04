# Checklista pilota Aktywnik+

Stan roboczy: **2026-10-03 — 0.5.0-beta.4**.

## Pilot rodzinny — gotowe technicznie

- [x] publiczna PWA + HTTPS
- [x] tryb local-first bez konta
- [x] wiele profili dzieci u jednego rodzica
- [x] strefa rodzica chroniona PIN-em i auto-lock
- [x] dziecko nie może samodzielnie przełączyć aktywnego profilu ani wejść do strefy rodzica
- [x] wpis ręczny + Start/Stop
- [x] zatwierdzenie / poprawa / odrzucenie przez rodzica
- [x] historia decyzji
- [x] raporty miesięczne / kwartalne / półroczne / roczne
- [x] JSON backup/restore, CSV i druk/PDF
- [x] wersja papierowa + arkusz 70 wpisów + import OCR/CSV/JSON
- [x] Magic Link dla dorosłego
- [x] personal sync push/pull
- [x] personal delete tombstones
- [x] jawne powiązanie lokalnego dziecka z `cloudChildId`
- [x] family activity push/pull
- [x] family status sync
- [x] family delete/tombstones
- [x] family guardian decision history
- [x] obsługa retry/idempotency
- [x] RLS i izolacja danych
- [x] blokada self-escalation `child → adult`
- [x] Security Advisor: 0 aktywnych lintów
- [x] migracje Supabase 001–025 live
- [x] GitHub CI dla 0.5.0-beta.4: PASS — syntax/PWA, papier 70 wpisów, browser UI, i18n, PWA runtime, backend API
- [x] automatyczny test: family sync nie wysyła danych offline i zachowuje kolejkę do reconnect

## Stan przed szerszym publicznym pilotem

- [x] **Vercel production zaktualizowany do 0.5.0-beta.4**
- [x] `/api/health` na produkcji raportuje `0.5.0-beta.4`
- [x] produkcja 0.5.0-beta.4 potwierdza chmurę, Auth i RLS
- [x] production smoke beta.4 z `require_cloud=true`: PASS
- [x] produkcyjny family UI smoke: PASS — onboarding rodzinny, wpis aktywności, Zmęczenie 4/5, granica widoku dziecko/rodzic, PIN
- [x] deployment Vercel beta.4: `READY`
- [x] podstawowe endpointy produkcyjne beta.4 przechodzą production smoke bez błędów
- [x] bieżący `main` różni się od ostatniego udanego deploymentu wyłącznie workflow CI; runtime aplikacji jest zgodny
- [ ] smoke na dwóch rzeczywistych urządzeniach: urządzenie A → sync → urządzenie B
- [ ] fizyczny smoke offline → reconnect → sync na realnym urządzeniu — zachowanie kolejki offline jest już sprawdzane automatycznie
- [ ] smoke delete → tombstone → drugie urządzenie
- [ ] smoke decyzji rodzica → drugie urządzenie
- [ ] instalacja PWA na Androidzie i ponowne uruchomienie
- [ ] przykładowy raport zapisany/drukowany jako PDF
- [ ] 3–7 dni testu jednej rodziny przed szerszym pilotem

### Vercel — stan bieżący

Produkcja **0.5.0-beta.4** jest zweryfikowana. Deployment Vercel dla commita `9ad34abc6dad0fb9545504126f163d0ff6a4aa20` zakończył się sukcesem, a production smoke uruchomiony z bieżącego `main` przeszedł z `require_cloud=true`. Bieżący `main` różni się od tego deploymentu wyłącznie zmianami CI i dokumentacji; kod runtime aplikacji jest zgodny. Production smoke uruchamia się teraz automatycznie po każdym pushu do `main`.

## School Cloud — technicznie gotowe do kontrolowanego E2E

- [x] tenant/role model
- [x] tworzenie klasy
- [x] czasowe zaproszenia
- [x] zgłoszenie dziecka przez opiekuna
- [x] akceptacja/odrzucenie przez staff
- [x] audit trail
- [x] retry-safe create operations
- [x] School Cloud UI
- [x] testy syntetyczne izolacji tenantów

## Przed produkcyjnym Aktywnik+ School

- [ ] E2E przez publiczne API z kontrolowanymi kontami testowymi
- [ ] platformowy backup/restore Supabase — rzeczywista próba
- [ ] niezależny security review / pentest
- [ ] decyzja szkoły/IOD o retencji
- [ ] decyzja administratora o DPIA
- [ ] formalny model administrator / podmiot przetwarzający
- [ ] formalna zgoda na wdrożenie

## Funkcje świadomie poza zakresem

- dane zdrowotne
- GPS
- masa ciała / kalorie
- ranking dzieci
- publiczna lista klasy
- automatyczne ocenianie dziecka


## Przywrócenie zielonej produkcji po regresji checklisty A/B — 04.10.2026

- [x] production smoke wykrył regresję UI w deployment `c14156e...`;
- [x] regresja checklisty A/B naprawiona na `main`;
- [x] finalny kandydat checklisty + cache v57 ma pełny Test pilot PASS;
- [x] ostatni zielony deployment `bc1528a...` ponownie promowany do produkcji bez rebuilda;
- [x] publiczny Production smoke po promocji: PASS;
- [x] family UI smoke po promocji: PASS;
- [ ] poprawiona checklista A/B czeka na finalny rollout po zwolnieniu Vercel build-rate-limit.

Do czasu finalnego rollout-u checklisty publiczna beta.4 pozostaje na stabilnym `bc1528a...`. Nie tworzyć kolejnych zmian runtime.

## Finalny rollout beta.4 — 04.10.2026

- [x] źródło deploymentu: GitHub SHA `d40a0d8aebf62d7b36b3d20d688d8e551b055aaa`;
- [x] runtime finalnego kandydata: `e91e3992...` + PWA cache v57;
- [x] deployment Vercel `dpl_CxAsKzEjAD5w9iip7d52cMtex5R5`: READY;
- [x] alias `aktywnik-plus.vercel.app`: przypisany do finalnego deploymentu;
- [x] produkcyjny health: database/Auth/RLS/cloud = true;
- [x] API production smoke: PASS;
- [x] family UI smoke: PASS;
- [x] diagnostics privacy: PASS;
- [x] skan logów runtime po deployu: brak błędów;
- [x] tymczasowy katalog deploymentu i lokalny `.env.local` usunięte z komputera.

### Pozostaje wyłącznie test praktyczny

- [ ] dwa fizyczne urządzenia A/B;
- [ ] offline → reconnect → sync;
- [ ] approve/reject/correction na drugim urządzeniu;
- [ ] delete/tombstone na drugim urządzeniu;
- [ ] restart zainstalowanej PWA;
- [ ] przykładowy PDF/A4;
- [ ] izolacja co najmniej dwóch profili dzieci;
- [ ] 3–7 dni rodzinnego używania bez utraty lub konfliktu danych.

Do zakończenia tego testu: **freeze funkcjonalny beta.4 — bez nowych funkcji.**