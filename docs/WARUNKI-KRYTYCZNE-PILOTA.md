# Warunki krytyczne wersji pilotażowej Aktywnik+

Stan zweryfikowany: **2026-10-03**.

Legenda:
- **✅ spełnione / zweryfikowane technicznie**;
- **🟡 częściowo otwarte albo wymagające domknięcia przed Aktywnik+ School**;
- **🔴 zablokowane wyłącznie przez decyzję zewnętrzną / formalną**.

## Status tej wersji

Aktywnik+ działa jako **0.5.0-beta.2, local-first z opcjonalnym kontem i synchronizacją trybu osobistego**.

Nie jest jeszcze:
- szkolnym dziennikiem elektronicznym;
- kompletnym produkcyjnym Aktywnik+ School;
- systemem do przechowywania pełnej dokumentacji ucznia.

Publiczna wersja:
**https://aktywnik-plus.vercel.app**

## 1. Hosting publicznego pilota — ✅

- Vercel + HTTPS;
- stały publiczny adres;
- Content-Security-Policy i HSTS;
- blokada obcych iframe;
- kod i dokumentacja w GitHub;
- dane testowe są syntetyczne.

## 2. Local-first + opcjonalna synchronizacja — 🟡

Zrobione:
- pełna praca bez konta;
- eksport/import JSON;
- CSV/PDF;
- trwała pamięć przeglądarki;
- autozapis niedokończonych wpisów osobno dla profili;
- opcjonalne konto dorosłego przez Magic Link;
- tryb osobisty: push → pull do Supabase;
- merge wpisów z różnych urządzeń na podstawie timestampów;
- RLS ogranicza dane do właściciela.

Pozostaje:
- tryb rodzinny nie ma jeszcze pełnej synchronizacji chmurowej;
- usuwanie wpisów nie ma jeszcze synchronizacji/tombstones;
- synchronizacja nie zastępuje jeszcze zweryfikowanego backup/restore backendu.

## 3. Minimum danych o dziecku — ✅

Projekt nie wymaga:
- adresu;
- telefonu dziecka;
- GPS;
- masy ciała;
- kalorii;
- danych medycznych;
- zdjęcia twarzy;
- publicznej listy klasy.

Podstawowy wpis to identyfikator/profil, aktywność, data i czas; wysiłek/uwaga są opcjonalne.

## 4. Brak publicznych danych dzieci w repo — ✅

Repo zawiera kod, dokumentację i dane syntetyczne. Prawdziwe raporty dzieci, listy klas, tokeny i sekrety nie należą do repo.

## 5. Szkoła / dyrektor / IOD — 🟡 pakiet gotowy, decyzja zewnętrzna

Gotowe:
- `docs/PAKIET-SZKOLA-IOD.md`;
- mapa minimalnych danych i ról;
- opis hostingu i zabezpieczeń;
- `docs/DPIA-SCREENING.md`;
- `docs/PROCEDURA-INCYDENTOW.md`;
- `docs/SECURITY-REVIEW-2026-10-03.md`;
- `docs/BACKUP-RESTORE.md`.

Pozostaje po stronie szkoły/administratora danych:
- podstawa prawna;
- formalny model administrator/podmiot przetwarzający;
- zatwierdzenie retencji;
- decyzja i ewentualne wykonanie DPIA;
- formalna zgoda na wdrożenie.

## 6. Podwyższona ochrona dzieci — ✅

- brak rankingów dzieci;
- brak porównań między dziećmi;
- brak GPS;
- brak wagi/kalorii/wyglądu;
- brak automatycznej oceny dziecka;
- statystyki dotyczą własnej historii;
- prosta papierowa alternatywa.

## 7. Papierowa alternatywa — ✅

Dostępne:
- aplikacja;
- tryb hybrydowy;
- formularz papierowy;
- arkusz 70 wpisów;
- PDF;
- import OCR/CSV/JSON.

## 8. Plusy i oceny — ✅ projektowo

Aplikacja może przechowywać wynik przekazany przez nauczyciela, ale nie ustala sama zasad oceniania ani przeliczników.

## 9. Prawdziwa wspólna klasa — 🟡 fundament techniczny gotowy

To nie jest już brak backendu.

Gotowe:
- działający projekt Supabase w regionie EU;
- Supabase Auth dla dorosłych;
- role i model tenant;
- migracje 001–012;
- RLS;
- endpoint `GET /api/v1/me`;
- endpoint `GET /api/v1/classes` działający w kontekście JWT + RLS;
- `/api/v1/sync` dla trybu osobistego;
- fail-closed przy braku konfiguracji bezpieczeństwa.

Pozostaje:
- tworzenie klasy;
- zaproszenie/kod dołączenia;
- powiązanie rodzica/dziecka z klasą;
- akceptacja zgłoszenia;
- pełny UX nauczyciela;
- E2E wielu realnych kont.

## 10. Warunki produkcyjne — stan bieżący

| Warunek | Stan |
| --- | --- |
| backend API + personal sync | ✅ |
| uwierzytelnianie dorosłych | ✅ Magic Link / Supabase Auth |
| role/uprawnienia w DB | ✅ RLS wdrożone |
| izolacja tenant/szkoła w DB | ✅ polityki wdrożone |
| HTTPS | ✅ |
| kopie zapasowe lokalne | ✅ eksport/import |
| backend backup/restore | 🟡 runbook gotowy; brak potwierdzonego restore drill |
| audyt administracyjny | 🟡 schema jest; pełna integracja zdarzeń jeszcze nie |
| retencja/usuwanie lokalne | ✅ |
| usuwanie/synchronizacja w chmurze | 🟡 brak tombstones |
| eksport danych | ✅ JSON / CSV / PDF |
| informacja o prywatności | ✅ |
| pakiet szkoła/IOD | ✅ przygotowany |
| formalne uzgodnienie szkoła/IOD | 🔴 decyzja zewnętrzna |
| DPIA screening — materiał | ✅ przygotowany |
| DPIA — decyzja administratora | 🔴 decyzja zewnętrzna |
| test techniczny bezpieczeństwa | ✅ CI + database preflight + Security Advisor |
| niezależny pentest / formalny review | 🟡 przed produkcyjnym School |
| procedura incydentów | ✅ przygotowana |
| środowisko testowe bez prawdziwych danych | ✅ |

## 11. Weryfikacja bazy Supabase — ✅

Sprawdzenie 2026-10-03:
- projekt `aktywnik-plus`: ACTIVE_HEALTHY;
- region: `eu-central-1`;
- migracje `001`–`012`: zastosowane;
- tabele `public`: 20;
- RLS: 20/20;
- granty dla `anon`: 0;
- tabele bez polityk: 0;
- `personal_activities`: polityki SELECT/INSERT/UPDATE/DELETE ograniczone do właściciela;
- Supabase Security Advisor: 0 aktywnych problemów;
- `backend/tests/security_preflight.sql`: PASS.

## 12. Warunek publikacji pilota — ✅

Publiczna wersja powinna jasno komunikować:
- local-first;
- konto jest opcjonalne;
- chmura jest funkcją beta;
- pełny Aktywnik+ School nie jest jeszcze wdrożeniem produkcyjnym szkoły.

## Backend — stan 0.5.0-beta.2

Dostępne:
- `/api/health`;
- `/api/capabilities`;
- `GET/POST /api/v1/sync` — tryb osobisty;
- `GET /api/v1/me` — profil i membership zalogowanego użytkownika;
- `GET /api/v1/classes` — klasy widoczne przez RLS.

Zwykłe endpointy użytkownika używają publishable key + Bearer JWT. Service-role nie jest wymagany do odczytu/zapisu danych użytkownika.

## Rzeczy nadal realnie nierozwiązane

1. pełny lifecycle klasy i dołączania rodziny;
2. synchronizacja trybu rodzinnego;
3. bezpieczna synchronizacja usunięć / tombstones;
4. zweryfikowany backend backup/restore drill;
5. pełna integracja `audit_events` i retencji;
6. E2E wielu kont/tenantów;
7. formalna decyzja szkoły/IOD oraz DPIA;
8. niezależny security review/pentest przed produkcyjnym School.

## Źródła i dokumenty

- RODO: https://eur-lex.europa.eu/eli/reg/2016/679
- UODO: https://uodo.gov.pl/
- `docs/PAKIET-SZKOLA-IOD.md`
- `docs/DPIA-SCREENING.md`
- `docs/PROCEDURA-INCYDENTOW.md`
- `docs/SECURITY-REVIEW-2026-10-03.md`
- `docs/BACKUP-RESTORE.md`
