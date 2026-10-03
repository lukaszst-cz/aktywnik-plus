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
- [x] GitHub CI po family sync: PASS

## Stan przed szerszym publicznym pilotem

- [x] **Vercel production zaktualizowany do 0.5.0-beta.4**
- [x] `/api/health` na produkcji raportuje `0.5.0-beta.4`
- [x] `/api/capabilities` potwierdza produkcyjną chmurę, Auth i RLS
- [x] production smoke z `require_cloud=true`: PASS
- [x] deployment Vercel: `READY`
- [x] brak świeżych błędów runtime po wdrożeniu
- [x] 28/28 głównych plików runtime na produkcji zgodnych bit-po-bicie z aktualnym `main`
- [ ] smoke na dwóch rzeczywistych urządzeniach: urządzenie A → sync → urządzenie B
- [ ] smoke offline → reconnect → sync
- [ ] smoke delete → tombstone → drugie urządzenie
- [ ] smoke decyzji rodzica → drugie urządzenie
- [ ] instalacja PWA na Androidzie i ponowne uruchomienie
- [ ] przykładowy raport zapisany/drukowany jako PDF
- [ ] 3–7 dni testu jednej rodziny przed szerszym pilotem

### Vercel — stan końcowy

Historyczny status GitHub/Vercel przy starszym commicie może nadal wskazywać `build-rate-limit`, ale nie opisuje już aktualnej produkcji. Bieżący alias produkcyjny działa na deploymentcie `READY`, zwraca 0.5.0-beta.4 i przeszedł production smoke.

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
