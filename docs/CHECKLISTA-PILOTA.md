# Checklista pilota Aktywnik+

Stan roboczy: **2026-10-03 — 0.5.0-beta.3**.

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
- [x] GitHub CI po family sync: PASS

## BLOCKER przed szerszym publicznym pilotem

- [ ] **Vercel production musi zostać zaktualizowany do bieżącego `main` / 0.5.0-beta.3**
- [ ] `/api/health` na produkcji ma raportować `0.5.0-beta.3`
- [ ] `/api/capabilities` ma potwierdzić poprawną konfigurację produkcyjnej chmury i RLS
- [ ] smoke produkcyjny: rodzic + co najmniej 2 profile dzieci
- [ ] smoke cross-device: urządzenie A → sync → urządzenie B
- [ ] smoke offline → reconnect → sync
- [ ] smoke delete → tombstone → drugie urządzenie
- [ ] smoke decyzji rodzica → drugie urządzenie
- [ ] instalacja PWA na Androidzie i ponowne uruchomienie
- [ ] przykładowy raport zapisany/drukowany jako PDF
- [ ] 3–7 dni testu jednej rodziny przed szerszym pilotem

### Aktualnie wykryty blocker Vercel

Dla commita `06768123` GitHub raportuje status Vercel **failure: build-rate-limit**. Publiczny URL nadal odpowiada HTTP 200, ale 2026-10-03 podczas weryfikacji zwracał starszy backend (`/api/health`: `0.5.0-beta.1`, chmura wyłączona). Nie należy traktować tego deploymentu jako potwierdzenia bieżącego `main`.

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
