# Warunki krytyczne wersji pilotażowej Aktywnik+

Stan zweryfikowany: **2026-10-03**.

Legenda:
- **✅ spełnione / zweryfikowane technicznie**;
- **🟡 częściowo otwarte albo wymagające domknięcia przed Aktywnik+ School**;
- **🔴 zablokowane wyłącznie przez decyzję zewnętrzną / formalną**.

## Status tej wersji

Aktywnik+ działa jako **0.5.0-beta.4, local-first z opcjonalnym kontem oraz pełnym sync trybu osobistego i rodzinnego dla jawnie powiązanych profili**. Pełny GitHub CI i production smoke beta.4 przechodzą.

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

Produkcja 0.5.0-beta.4 została zweryfikowana 2026-10-03: Vercel dla commita `9ad34abc6dad0fb9545504126f163d0ff6a4aa20` zakończył deployment sukcesem, `/api/health` raportuje beta.4, backend to `full-family-sync-pilot`, a production smoke z `require_cloud=true` potwierdza aktywne Auth, RLS, family sync, delete/tombstones i historię decyzji. Bieżący `main` różni się od wdrożonego runtime wyłącznie zmianami CI i dokumentacji.

## 2. Local-first + opcjonalna synchronizacja — ✅ dla pilota rodzinnego

Zrobione:
- pełna praca bez konta;
- eksport/import JSON;
- CSV/PDF;
- trwała pamięć przeglądarki;
- autozapis niedokończonych wpisów osobno dla profili;
- opcjonalne konto dorosłego przez Magic Link;
- tryb osobisty: push → pull do Supabase;
- merge wpisów z różnych urządzeń na podstawie timestampów;
- usuwanie wpisów w trybie osobistym: tombstones + propagacja między urządzeniami;
- RLS ogranicza dane do właściciela;
- tryb rodzinny nie trafia do personal sync; ma osobny family sync tylko dla profili z jawnym `cloudChildId`;
- family activity push/pull + statusy `pending/approved/rejected`: ✅ live;
- rodzinne delete/tombstones: ✅ live;
- historia decyzji rodzica `approved/rejected/corrected/deleted`: ✅ live;

Uwagi:
- synchronizacja nie zastępuje platformowego backup/restore Supabase; ten punkt pozostaje wymaganiem przed produkcyjnym Aktywnik+ School, nie blockerem pilota rodzinnego.

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

Podstawowy wpis to identyfikator/profil, aktywność, data, czas oraz skala zmęczenia 1–5; uwaga jest opcjonalna.

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
- `docs/BACKUP-RESTORE.md`;
- `backend/tests/application_restore_drill.sql` — live-verified, syntetyczny restore drill z `ROLLBACK`.

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

## 9. Prawdziwa wspólna klasa — 🟡 backend + UI lifecycle gotowe, kontrolowane E2E pozostaje

To nie jest już brak backendu.

Gotowe:
- działający projekt Supabase w regionie EU;
- Supabase Auth dla dorosłych;
- role i model tenant;
- migracje 001–025;
- RLS;
- endpoint `GET /api/v1/me`;
- endpoint `GET /api/v1/classes` działający w kontekście JWT + RLS;
- endpoint `POST /api/v1/family-children` do bezpiecznego tworzenia profilu dziecka przez dorosłego opiekuna;
- jawne powiązanie lokalnego profilu z wybranym profilem chmurowym przez `cloudChildId`; brak automatycznego dopasowania po imieniu;
- `/api/v1/sync` dla trybu osobistego;
- fail-closed przy braku konfiguracji bezpieczeństwa.

Gotowe dodatkowo:
- tworzenie klasy przez `school_admin`;
- automatyczne przypisanie twórcy do klasy;
- czasowe tokeny zaproszeń;
- zgłoszenie dziecka przez opiekuna;
- akceptacja/odrzucenie przez nauczyciela lub admina;
- automatyczne `class_children` po akceptacji;
- pełny audit trail;
- test SQL create → invite → request → accept: PASS.

Gotowe w UI:
- osobny panel `school-cloud.html` dla kont dorosłych;
- wybór tenant/szkoły i roku szkolnego;
- tworzenie klasy dla school_admin;
- generowanie tokenu zaproszenia;
- wybór dziecka widocznego opiekunowi przez RLS;
- wysłanie zgłoszenia oraz akceptacja/odrzucenie przez staff.

Pozostaje:
- E2E przez publiczne API z kontrolowanymi kontami testowymi przed School production.

## 10. Warunki produkcyjne — stan bieżący

| Warunek | Stan |
| --- | --- |
| backend API + personal sync | ✅ |
| deployment production zgodny z bieżącym runtime | ✅ 0.5.0-beta.4; Vercel deployment SUCCESS + production smoke PASS; bieżący `main` ma dodatkowo wyłącznie zmiany CI/dokumentacji |
| uwierzytelnianie dorosłych | ✅ Magic Link / Supabase Auth |
| role/uprawnienia w DB | ✅ RLS + migracja 018 live; `profile_type` nie jest samodzielnie edytowalne przez użytkownika |
| izolacja tenant/szkoła w DB | ✅ polityki wdrożone |
| HTTPS | ✅ |
| kopie zapasowe lokalne | ✅ eksport/import |
| backend backup/restore | 🟡 restore danych aplikacji ✅ PASS; platformowy backup/restore Supabase nadal do próby |
| audyt administracyjny | ✅ personal activity + School audit: aktywności, raporty, nagrody/oceny, klasy, nauczyciele, membership i dostęp serwisowy |
| retencja/usuwanie lokalne | ✅ |
| retencja logów School | 🟡 mechanizm techniczny ✅ (`dry_run` domyślnie, tylko `service_role`); okres retencji wymaga decyzji szkoły/IOD |
| usuwanie/synchronizacja w chmurze | ✅ tombstones + propagacja delete w trybie osobistym i rodzinnym |
| eksport danych | ✅ JSON / CSV / PDF |
| informacja o prywatności | ✅ |
| pakiet szkoła/IOD | ✅ przygotowany |
| backend lifecycle klasy | ✅ create/invite/request/accept + audit |
| UI lifecycle klasy | ✅ School Cloud: klasy, zaproszenia, zgłoszenia, decyzje |
| formalne uzgodnienie szkoła/IOD | 🔴 decyzja zewnętrzna |
| DPIA screening — materiał | ✅ przygotowany |
| DPIA — decyzja administratora | 🔴 decyzja zewnętrzna |
| test techniczny bezpieczeństwa | ✅ CI + database preflight PASS; Security Advisor: 0 aktywnych lintów po migracji 020 |
| E2E izolacji wielu kont/tenantów | ✅ test RLS PASS na danych syntetycznych |
| niezależny pentest / formalny review | 🟡 przed produkcyjnym School |
| procedura incydentów | ✅ przygotowana |
| środowisko testowe bez prawdziwych danych | ✅ |

## 11. Weryfikacja bazy Supabase — ✅

Sprawdzenie 2026-10-03:
- projekt `aktywnik-plus`: ACTIVE_HEALTHY;
- region: `eu-central-1`;
- migracje `001`–`025`: zastosowane;
- tabele `public`: 24;
- RLS: 24/24;
- granty dla `anon`: 0;
- tabele bez polityk: 0;
- `personal_activities`: polityki SELECT/INSERT/UPDATE/DELETE ograniczone do właściciela;
- Supabase Security Advisor po migracji 025: **0 aktywnych lintów**;
- publiczne RPC lifecycle są `SECURITY INVOKER`, a uprzywilejowana logika znajduje się w nieeksponowanym `app_private`;
- security preflight wymaga zera publicznych `SECURITY DEFINER` wykonywalnych przez `authenticated`, dokładnie 5 wrapperów invoker + 5 prywatnych helperów oraz 8 triggerów School audit;
- `backend/tests/security_preflight.sql`: PASS dla obecnego schematu 001–025;
- application restore drill: PASS dla profilu, rodziny, szkoły/klasy, raportu, aktywności rodzinnej i personal activity; test kończy się `ROLLBACK`;
- migracja 018 jest trwale zastosowana live; test `child → adult` = BLOCKED/PASS, a `display_name` pozostaje edytowalne;
- security preflight wymaga wyłącznie `UPDATE(display_name)` dla `authenticated` i zwraca PASS;
- migracja 019: 8 triggerów School audit + prywatna funkcja retencji z `dry_run=true`, bez automatycznego harmonogramu;
- migracja 020: publiczne RPC lifecycle → `SECURITY INVOKER`, uprzywilejowane helpery → `app_private`; class lifecycle PASS, family onboarding PASS, Security Advisor 0 lintów;
- migracja 021: indeksy pokrywające 4 wcześniej nieindeksowane FK; live performance preflight PASS;
- migracja 022: `client_entry_id`/`client_updated_at` dla family activities + RLS `tenant_id IS NULL`; pre-deploy rollback test PASS, live schema/policies/preflight PASS.
- migracja 023: prywatny ledger idempotency + `SECURITY INVOKER` wrappers dla tworzenia dziecka/klasy/zaproszenia; live retry/idempotency test PASS.
- migracja 024: `family_activity_tombstones` + guardian-only DELETE dla tenant-neutral family rows; live delete regression PASS.
- migracja 025: `client_event_id`/`client_entry_id` dla `activity_approval_events`, `ON DELETE SET NULL`, decyzja `deleted`; live decision-history regression PASS.

## 12. Warunek publikacji pilota — ✅

Production smoke jest uruchamiany automatycznie po pushu do `main` i ma retry na czas propagacji deploymentu Vercel.

Publiczna wersja powinna jasno komunikować:
- local-first;
- konto jest opcjonalne;
- chmura jest funkcją beta;
- pełny Aktywnik+ School nie jest jeszcze wdrożeniem produkcyjnym szkoły.

## Backend — produkcja 0.5.0-beta.4

Dostępne:
- `/api/health`;
- `/api/capabilities`;
- `GET/POST /api/v1/sync` — tryb osobisty;
- `GET/POST /api/v1/family-sync` — tryb rodzinny dla jawnie powiązanego profilu dziecka;
- `GET /api/v1/me` — profil i membership zalogowanego użytkownika;
- `GET /api/v1/classes` — klasy widoczne przez RLS.

Zwykłe endpointy użytkownika używają publishable key + Bearer JWT. Service-role nie jest wymagany do odczytu/zapisu danych użytkownika.

## Rzeczy nadal realnie nierozwiązane

1. family onboarding — ✅ rodzic może utworzyć profil dziecka w School Cloud bez e-maila/hasła dziecka;
2. migracja 018 / profile role hardening — ✅ live + security preflight PASS;
3. synchronizacja trybu rodzinnego — ✅ jawne powiązanie + activity push/pull/status + tombstones/delete + historia decyzji;
4. synchronizacja usunięć w trybie rodzinnym — ✅ live, guardian-only, z ochroną school rows;
5. synchronizacja historii decyzji rodzica — ✅ live, append-only i zachowana po usunięciu aktywności;
5. backend restore drill — ✅ dane aplikacji; platformowy backup/restore Supabase nadal otwarty;
6. School audit + mechanizm retencji — ✅ technicznie; okres/częstotliwość retencji nadal do zatwierdzenia przez szkołę/IOD;
7. E2E wielu kont/tenantów — ✅ test RLS PASS na danych syntetycznych;
8. formalna decyzja szkoły/IOD oraz DPIA;
9. publiczne RPC `SECURITY DEFINER` — ✅ usunięte/refaktoryzowane w migracji 020;
10. niezależny security review/pentest przed produkcyjnym School.

## Źródła i dokumenty

- RODO: https://eur-lex.europa.eu/eli/reg/2016/679
- UODO: https://uodo.gov.pl/
- `docs/PAKIET-SZKOLA-IOD.md`
- `docs/DPIA-SCREENING.md`
- `docs/PROCEDURA-INCYDENTOW.md`
- `docs/SECURITY-REVIEW-2026-10-03.md`
- `docs/BACKUP-RESTORE.md`
