# Changelog

## 0.5.0-beta.4 — Family Pilot Hardening — 2026-10-03

- ujednolicono pole ze szkolnym arkuszem jako „Zmęczenie 1–5”;
- neutralny wskaźnik „obciążenie wysiłkiem: lekkie / umiarkowane / wysokie” jest widoczny wyłącznie w chronionej strefie rodzica;
- wskaźnik jest liczony tylko do prezentacji i nie jest zapisywany jako pole aktywności;
- nie trafia do CSV, PDF/A4, School Cloud, personal sync ani family sync;
- dodano test release-consistency blokujący przypadkowy wyciek tej informacji do eksportów lub synchronizacji;
- podniesiono numer wersji, production smoke i cache PWA do beta.4;
- backend, RLS oraz protokół family sync pozostają zgodne z beta.3.

## 0.5.0-beta.3 — Full Family Sync Pilot — 2026-10-03

- migracje 023, 024 i 025 są trwale zastosowane na live Supabase;
- School Cloud idempotency retry test: PASS;
- family delete/tombstone regression: PASS;
- family decision-history regression: PASS;
- pełny security preflight po 025: PASS;
- class lifecycle: PASS; family onboarding: PASS;
- Supabase Security Advisor: **0 aktywnych lintów**;
- capability API raportuje pełny family sync, family delete sync i family decision history jako aktywne wyłącznie przy `cloud.enabled=true`;
- family sync nadal pozostaje local-first i fail-closed przy niepełnej konfiguracji chmury.

## Unreleased — family decision history

- migracja 025 dodaje stabilne `client_event_id` / `client_entry_id` do historii decyzji rodzinnych;
- historia decyzji nie znika po skasowaniu aktywności: FK `activity_id` przechodzi na `ON DELETE SET NULL`;
- do synchronizacji chmurowej trafiają tylko decyzje rodzica: `approved`, `rejected`, `corrected`, `deleted`;
- istniejące RLS pozostaje bez poszerzania: guardian INSERT, rodzina SELECT;
- klient nie wysyła historii przed `familySyncDecisionHistory=true`, więc rollout kod → migracja jest bezpieczny;
- wykryty i naprawiony przypadek delete-only: sama kolejka tombstone uruchamia family sync;
- import kopii / pełny reset czyści również family delete queue;
- browser smoke sprawdza capability gate, wysyłkę decyzji, merge bez duplikatów i delete-only queue;
- 023+024+025 + decision-history regression + security preflight: PASS w rollbacku;
- migracja 025 jest live; `familySyncDecisionHistory` jest aktywne przy `cloud.enabled=true`.


## Unreleased — family delete sync

- migracja 024 dodaje `family_activity_tombstones` z RLS per guardian;
- tylko guardian może usuwać tenant-neutral family activity; school rows z `tenant_id` nie podlegają tej ścieżce;
- family API synchronizuje tombstones i stosuje regułę `deletedAt >= client_updated_at`;
- klient utrzymuje osobną kolejkę usunięć per `cloudChildId` i nie czyści jej przed potwierdzeniem serwera;
- rolling deploy jest bezpieczny: brak tabeli 024 (`PGRST205`) nie psuje zwykłego family sync, a tombstone pozostaje oczekujący;
- rodzic może usuwać wpisy rodzinne z kolejki decyzji, historii i raportu; panel dziecka nie dostaje family DELETE;
- browser smoke sprawdza izolację rodzeństwa oraz starszy/nowszy tombstone;
- migration 024 + RLS regression: PASS; migracje 023+024 + security preflight: PASS w rollbacku;
- migracja 024 jest live; `familySyncDeletes` jest aktywne przy `cloud.enabled=true`.


## Unreleased — School Cloud retry idempotency

- migracja 023 dodaje prywatny ledger `app_private.idempotency_keys`;
- tworzenie profilu dziecka, klasy i zaproszenia może używać trwałego `operationId` i bezpiecznie ponawiać request po timeout;
- ten sam klucz + ten sam payload zwraca ten sam zasób zamiast tworzyć duplikat;
- ten sam klucz + inny payload jest odrzucany;
- publiczne wrappery pozostają `SECURITY INVOKER`, a uprzywilejowana logika i ledger pozostają w `app_private`;
- API ma zgodny wstecz fallback do starych RPC wyłącznie przy `PGRST202`, więc merge kodu nie wymusza natychmiastowego wdrożenia migracji 023;
- UI przechowuje w `sessionStorage` tylko hash payloadu + UUID operacji, nie nazwę dziecka/klasy;
- migracja 023 jest live; retry test + security preflight: PASS.


## Unreleased — family activity sync beta

- osobny endpoint `GET/POST /api/v1/family-sync` oparty o publishable key + JWT + RLS;
- synchronizacja działa wyłącznie dla jawnie powiązanego `cloudChildId`;
- migracja 022 dodaje stabilne `client_entry_id` i `client_updated_at` dla rodzinnych aktywności;
- family write pozostaje poza tenantem School (`tenant_id IS NULL`) i RLS blokuje wstrzyknięcie rodzinnego wpisu do szkoły;
- klient zapisuje minimalny outbox per powiązane dziecko, bez PIN-u, klas, ustawień szkoły i innych danych local-only;
- push/pull obejmuje treść wpisu i status `pending/approved/rejected`;
- konflikt rozstrzyga nowszy timestamp; decyzje rodzica dostają jawny `updatedAt`;
- restore i pełny local wipe czyszczą również rodzinny outbox;
- rodzinne usuwanie i historia decyzji zostały domknięte późniejszymi migracjami 024–025;
- capability API po rolloutcie 025 raportuje pełny family sync przy `cloud.enabled=true`.

## Unreleased — explicit family cloud profile links

- lokalny profil dziecka może być jawnie powiązany z konkretnym profilem School Cloud przez `cloudChildId`;
- aplikacja nie dopasowuje dzieci automatycznie po imieniu;
- jeden profil chmurowy nie może być przypisany do dwóch lokalnych dzieci;
- rodzic może odświeżyć listę własnych profili chmurowych, połączyć istniejący profil albo utworzyć nowy i od razu go powiązać;
- odłączenie usuwa wyłącznie lokalne powiązanie i nie kasuje danych w chmurze;
- backup v6 waliduje poprawność i unikalność `cloudChildId`;
- smoke test obejmuje link, duplicate guard, unlink i backup validation;
- capability API raportuje `familyCloudLinkReady: true`.

## Unreleased — School Cloud request timeout

- requesty School Cloud mają 15-sekundowy timeout przez `AbortController`;
- zawieszone połączenie nie blokuje już przycisków bez końca;
- po timeout użytkownik dostaje czytelny komunikat i może ponowić operację;
- CI pilnuje obecności timeout guardu;
- brak zmian w bazie, RLS i API contract.


## Unreleased — School Cloud submit/input hardening

- API odrzuca nazwę klasy dłuższą niż 80 znaków zamiast cicho ją obcinać;
- API wymaga całkowitej ważności zaproszenia w zakresie 1–30 dni;
- UI blokuje ponowne kliknięcie podczas tworzenia klasy, zaproszenia, zgłoszenia i decyzji;
- backend smoke obejmuje zbyt długą nazwę klasy oraz nieprawidłową ważność zaproszenia;
- zmiana nie modyfikuje bazy, RLS ani modelu ról.


## Unreleased — FK index performance hardening

- Supabase Performance Advisor wskazał 4 klucze obce bez indeksów pokrywających;
- migracja 021 dodaje indeksy dla `class_invites.created_by` oraz `class_join_requests.child_id/decided_by/requested_by`;
- migracja jest wyłącznie addytywna i nie zmienia danych ani RLS;
- `backend/tests/performance_preflight.sql` weryfikuje obecność indeksów;
- migracja 021 + performance preflight przeszły PASS na live schemacie w transakcji zakończonej rollbackiem;
- migracja 021 została trwale wdrożona na Supabase; performance preflight: PASS. Performance Advisor raportuje jedynie INFO dla nowych, jeszcze nieużytych indeksów.


## Unreleased — public RPC privilege refactor

- migracja 020 przenosi uprzywilejowaną logikę lifecycle do nieeksponowanego `app_private`;
- publiczne `create_class_invite`, `create_guardian_child`, `create_school_class`, `decide_class_join` i `request_class_join` są teraz `SECURITY INVOKER`;
- prywatne helpery zachowują dotychczasowe kontrole `auth.uid()`, roli i relacji;
- `PUBLIC` i `anon` nie mają `EXECUTE` do helperów ani wrapperów; `authenticated` ma tylko jawnie wymagane wywołania;
- class lifecycle po migracji: PASS;
- family onboarding po migracji: PASS;
- database security preflight: PASS;
- Supabase Security Advisor: **0 aktywnych lintów**.

## Unreleased — School audit and retention controls

- migracja 019 rozszerza automatyczny audit trail na kluczowe operacje School;
- aktywności, raporty, nagrody/oceny, class membership, teacher assignment, tenant membership i support access są audytowane triggerami;
- prywatny `app_private.prune_audit_events(cutoff, dry_run)` domyślnie działa w trybie dry-run;
- `anon` i `authenticated` nie mają prawa uruchomić retencji; ma je wyłącznie kontrolowana ścieżka `service_role`;
- okres retencji nie jest zaszyty w kodzie ani automatycznie harmonogramowany — pozostaje decyzją szkoły/IOD;
- finalny SQL 019 przeszedł test transakcyjny PASS przed wdrożeniem; po wdrożeniu potwierdzono 8 triggerów i brak nowego ostrzeżenia Security Advisor.

## Unreleased — profile role hardening live

- migracja 018 jest trwale zastosowana na live Supabase;
- `authenticated` może aktualizować wyłącznie `profiles.display_name`;
- self-escalation `profile_type: child → adult` jest zablokowana;
- live regression test: PASS;
- database security preflight po wdrożeniu: PASS;
- pięć wcześniejszych ostrzeżeń RPC zostało później usuniętych migracją 020.


## Unreleased — application restore drill

- syntetyczny backup/delete/restore round-trip dla profilu, rodziny, szkoły, raportu i wpisu osobistego;
- test działa w jednej transakcji i kończy się `ROLLBACK`;
- integralność FK i wartości po restore: PASS;
- capability API raportuje `applicationRestoreDrillVerified: true`;
- platformowy backup/restore Supabase pozostaje osobnym etapem operacyjnym.

## Unreleased — family onboarding UX hardening

- API odrzuca nazwę profilu dziecka dłuższą niż 60 znaków zamiast cicho ją obcinać;
- School Cloud blokuje przycisk tworzenia profilu podczas trwającego requestu, ograniczając przypadkowe duplikaty;
- test SQL potwierdza, że konto typu `child` nie może wywołać `create_guardian_child`;
- backend smoke obejmuje limit długości nazwy.


## Unreleased — profile role escalation hardening

- wykryto, że tabelowe `UPDATE profiles` pozwalało kontu `child` zmienić własne `profile_type` na `adult`;
- migracja 018 odbiera szerokie `UPDATE` i pozostawia `authenticated` tylko `UPDATE(display_name)`;
- security preflight sprawdza, że jedyną edytowalną kolumną profilu jest `display_name`;
- dodano syntetyczny test regresyjny child→adult + dozwoloną zmianę display_name;
- poprawka została zweryfikowana na live schemacie w transakcji zakończonej rollbackiem; trwałe wdrożenie migracji 018 pozostaje osobnym krokiem.


## Unreleased — guardian child cloud onboarding

- dorosły opiekun może utworzyć profil dziecka w School Cloud bez osobnego e-maila i hasła dziecka;
- migracja 017 dodaje reviewed RPC `create_guardian_child` z kontrolą `auth.uid()`, typu profilu dorosłego i audytem;
- endpoint `POST /api/v1/family-children` używa JWT użytkownika i Supabase RLS/RPC, bez service-role;
- profil dziecka jest od razu powiązany z opiekunem jako `manager`;
- School Cloud UI pozwala utworzyć profil i następnie wysłać zgłoszenie do klasy;
- live test transakcyjny onboardingu: PASS; security preflight: PASS;
- na tym etapie Advisor raportował 5 kontrolowanych WARN; zostały później usunięte migracją 020.


## Unreleased — personal sync data minimization

- personal sync outbox nie zapisuje już całego lokalnego stanu aplikacji;
- do kolejki trafiają tylko minimalne pola wpisów wymagane przez backend;
- dane PIN/parentAuth, profile dzieci, klasy, ustawienia szkoły i inne local-only pola nie trafiają do payloadu personal sync;
- stary pełny outbox jest automatycznie przepisywany do minimalnej postaci;
- `markDirty` wymaga również rzeczywiście aktywnego trybu osobistego;
- browser smoke sprawdza brak wycieku local-only pól i migrację starej kolejki.


## Unreleased — sync batch identity guard

- personal sync odrzuca duplikat `entry_id` w jednym batchu;
- odrzuca duplikat tombstone dla tego samego ID;
- odrzuca jednoczesną aktualizację i usunięcie tego samego ID;
- zamiast niejasnego błędu upsertu klient dostaje deterministyczny błąd `400`;
- backend smoke obejmuje wszystkie trzy scenariusze.


## Unreleased — sync timestamp validation

- backend wymaga prawdziwej daty kalendarzowej wpisu zamiast akceptować tylko wzór `YYYY-MM-DD`;
- timestamp wpisu i tombstone'a może wyprzedzać zegar serwera maksymalnie o 15 minut;
- daleko przyszłe timestampy są odrzucane zamiast brać udział w regule konfliktu „nowszy wygrywa”;
- backend smoke obejmuje niemożliwą datę, przyszły wpis i przyszły tombstone.


## Unreleased — personal sync protocol guard

- personal sync ma jawny `protocolVersion=1` niezależny od schematu lokalnego backupu;
- klient wysyła wersję przy push/pull i sprawdza wersję odpowiedzi;
- backend zachowuje zgodność z brakującym numerem jako v1 podczas rolling deploy;
- przyszła nieobsługiwana wersja protokołu jest odrzucana kodem `409 sync_protocol_too_new`;
- `/api/capabilities` ujawnia bieżącą wersję protokołu;
- backend i browser smoke testują guard kompatybilności.


## Unreleased — SECURITY DEFINER surface guard

- przed migracją 020 live Supabase Security Advisor raportował 5 kontrolowanych WARN dla publicznych RPC `SECURITY DEFINER`;
- `backend/tests/security_preflight.sql` ma dokładną allowlistę tych 5 funkcji i blokuje wzrost powierzchni;
- preflight sprawdza brak EXECUTE dla `anon`/`PUBLIC`, pusty `search_path`, `auth.uid()` oraz oczekiwany grant dla `authenticated`;
- GitHub Actions uruchamia dodatkowy statyczny test migracji bez dostępu do sekretów bazy;
- dokumentacja bezpieczeństwa i warunki pilota zostały wyrównane z live Supabase;
- docelowy refaktor został zrealizowany w migracji 020; Security Advisor po wdrożeniu: 0 aktywnych lintów.


## Unreleased — backup identity isolation

- aktualne kopie v6 wymagają unikalnych identyfikatorów profili i wpisów;
- wpisy, historia akceptacji, nagrody/oceny i aktywny pomiar muszą wskazywać istniejący profil;
- uszkodzona kopia nie przepina już niejednoznacznych danych do pierwszego dziecka;
- starsze kopie legacy nadal korzystają z dotychczasowej ścieżki migracji;
- browser smoke testuje duplikat profilu, duplikat wpisu i osierocony wpis.


## Unreleased — local data wipe hardening

- „Usuń wszystkie lokalne dane” czyści stan aplikacji, szkice, outbox sync, tombstones, znacznik ostatniego sync i lokalny token sesji konta;
- stan sesji/PIN-u rodzica jest czyszczony razem z lokalnymi danymi;
- import kopii usuwa stare kolejki sync/tombstones i sesyjny stan rodzica przed zastosowaniem restore;
- import kopii nie wylogowuje konta, dzięki czemu restore może pozostać w tej samej sesji;
- preferencja języka pozostaje na urządzeniu;
- browser smoke obejmuje restore cleanup i pełny local wipe.


## Unreleased — local backup/restore hardening

- eksport kopii lokalnej nie uruchamia niepotrzebnego cloud sync;
- import sprawdza format i zgodność wersji kopii;
- kopia z przyszłej, nieobsługiwanej wersji jest blokowana przed przycięciem danych;
- legacy raw-state backup pozostaje obsługiwany;
- browser smoke wykonuje syntetyczny backup round-trip i testuje guardy wersji/formatu;
- dokumentacja backup/restore i README zostały wyrównane z bieżącym stanem 0.5 beta.


## Unreleased — personal/family sync boundary

- tryb rodzinny nie tworzy kolejki personal cloud sync;
- klient sync blokuje push, pull i tombstones poza trybem osobistym;
- stara błędna kolejka z migawką rodzinną jest bezpiecznie usuwana bez wysyłki;
- status rodziny jasno wskazuje, że dane pozostają lokalne;
- smoke test obejmuje brak outboxa, brak tombstones i czyszczenie starej kolejki.


## Unreleased — School Cloud UI

- nowy `school-cloud.html` dostępny z ekranu konta;
- role i dzieci pobierane z `/api/v1/me` przez RLS;
- lata szkolne pobierane przez nowy `/api/v1/school-years`;
- school_admin może utworzyć klasę bez ręcznych UUID;
- staff może wygenerować zaproszenie i obsłużyć zgłoszenia;
- opiekun może wysłać zgłoszenie dla dziecka już obecnego w chmurze.

## Unreleased — school class lifecycle backend

- migracje 015–016: bezpieczny workflow klasy i tworzenie klasy;
- nowe tabele: `class_invites`, `class_join_requests`;
- RPC: `create_school_class`, `create_class_invite`, `request_class_join`, `decide_class_join`;
- API: tworzenie klas, zaproszenia, join requests i decyzje;
- wszystkie operacje autoryzowane w DB i audytowane;
- security preflight po migracji: PASS (23 tabele publiczne z RLS);
- test SQL create → invite → request → accept: PASS.

## Unreleased — personal activity audit

- migracja 014 dodaje automatyczne `audit_events` dla utworzenia i edycji wpisu osobistego oraz tombstone delete;
- actor pochodzi z `auth.uid()`;
- audyt działa w triggerze PostgreSQL i nie wymaga uprzywilejowanego endpointu;
- security preflight sprawdza obecność triggerów;
- test transakcyjny create/update/delete: PASS.

## Unreleased — personal delete sync

- migracja 013: `personal_activity_tombstones` z RLS per właściciel;
- usuwanie pojedynczego wpisu w trybie osobistym;
- kolejka delete offline;
- propagacja tombstones między urządzeniami;
- ochrona nowszej edycji przed opóźnionym starszym usunięciem;
- capability API raportuje `personalSyncDeletes: true`.

## Unreleased — pilot readiness hardening

### Backend i bezpieczeństwo
- zwykłe endpointy użytkownika korzystają z publishable key + Bearer JWT + RLS, bez service-role;
- dodano `GET /api/v1/me` oraz RLS-scoped `GET /api/v1/classes`;
- dodano aktualny database security preflight;
- capability API rozróżnia funkcje działające od nadal otwartych (delete sync, family sync, backup/restore, audit).

### Gotowość organizacyjna
- zaktualizowano krytyczne warunki pilota do stanu 0.5.0-beta.2;
- dodano pakiet szkoła/IOD, DPIA screening, procedurę incydentów, security review i runbook backup/restore.

## 0.5.0-beta.2 — Pull & Merge

### Synchronizacja osobista
- dodano pobieranie wpisów przez `GET /api/v1/sync`;
- po zalogowaniu działa cykl **push → pull**;
- brakujące wpisy z innego urządzenia są dodawane lokalnie;
- dla tego samego wpisu nowszy timestamp wygrywa;
- nowsza wersja lokalna pozostaje lokalnie i wraca do kolejki push;
- import z chmury nie wywołuje pętli synchronizacji;
- status ostatniej synchronizacji jest zapamiętywany lokalnie;
- statusy sync są dostępne po polsku i angielsku.

### Niezawodność szkiców
- szkice niedokończonych wpisów są rozdzielone między profile;
- zmiana aktywnego profilu nie przenosi szkicu do innego dziecka;
- zachowana jest migracja starszego pojedynczego szkicu;
- import kopii, usuwanie profilu i czyszczenie danych sprzątają nieaktualne szkice.

### Bezpieczniki
- usuwanie wpisów nie jest jeszcze synchronizowane między urządzeniami;
- tryb rodzinny nie jest jeszcze objęty cloud sync;
- chmura pozostaje fail-closed do zakończenia testów wielu kont.

## 0.5.0-beta.1 — Sync Foundation

### Konto i synchronizacja
- opcjonalne konto przez Magic Link, bez klasycznego hasła;
- sesja konta z odświeżaniem tokenu i wylogowaniem;
- local-first sync queue — zapis lokalny jest zawsze pierwszy;
- pierwszy RLS-scoped endpoint synchronizacji trybu osobistego;
- idempotentny upsert po `client_entry_id`;
- synchronizacja usunięć pozostaje wyłączona do osobnego, bezpiecznego modelu konfliktów.

### Supabase
- projekt `aktywnik-plus` działa w regionie EU;
- odzyskano do repo wdrożone migracje 008–011;
- dodano migrację 012 i tabelę `personal_activities`;
- wszystkie publiczne tabele mają włączony RLS;
- Security Advisor: brak aktywnych problemów;
- klient korzysta wyłącznie z publishable key, a klucze serwerowe nie trafiają do przeglądarki.

### Produkt
- konto/sync dostępne w PL i EN;
- status chmury jest neutralny dla użytkownika bez konta;
- tryb lokalny nadal działa bez konta i bez internetu.

## 0.4.0 — Universal

### Tryb osobisty
- nowy onboarding pozwala wybrać **Dla siebie** lub **Rodzina**;
- tryb osobisty nie wymaga PIN-u rodzica i zapisuje wpisy od razu jako zatwierdzone;
- dodano własną nazwę aktywności oraz aktywności użyteczne także dla dorosłych;
- tryb osobisty ma eksport CSV, kopię JSON, przywracanie kopii, trwałą pamięć i usuwanie danych.

### Dostępność
- dodano link „Przejdź do treści” dla klawiatury i czytników ekranu;
- powiększono minimalne cele dotykowe;
- dodano wyraźne focus states;
- respektowane jest `prefers-reduced-motion`.

### Dane i kompatybilność
- schema kopii podniesiona do wersji 6 z polem `profileMode`;
- starsze kopie bez `profileMode` migrują do trybu rodzinnego;
- cache PWA podniesiony, aby urządzenia pobrały nowy interfejs.

## 0.3.0 — Daily UX & reliability

### Dziecko
- nowy szybki podgląd bieżącego tygodnia: łączny czas, aktywne dni, wpisy oczekujące i ostatnia aktywność;
- „Powtórz ostatnią aktywność” otwiera formularz z poprzednim rodzajem aktywności, czasem i wysiłkiem, bez kopiowania notatki;
- podsumowanie pozostaje informacyjne: bez celów, serii, kalorii, rankingów i porównywania dzieci;
- zabezpieczenie przed ponownym zapisaniem identycznego ręcznego wpisu w krótkim odstępie.

### Rodzic
- szybki podgląd zatwierdzonej aktywności dzisiaj i w bieżącym tygodniu;
- licznik wpisów oczekujących i informacja o ostatniej zatwierdzonej aktywności;
- widoczny wiek ostatniej kopii danych.

### Niezawodność
- status lokalnego zapisu widoczny w nagłówku;
- metadane ostatniego zapisu i ostatniej kopii są zachowywane w danych;
- schema kopii podniesiona do wersji 5 z migracją starszych danych;
- cache PWA podniesiony, aby urządzenia pobrały aktualne pliki.

## 0.2.1 — Monthly report hardening

### Raporty
- rodzic może wybrać konkretny miesiąc odniesienia zamiast być ograniczonym do bieżącego miesiąca;
- raport miesięczny, kwartalny, półroczny i roczny liczy okres względem wybranego miesiąca;
- eksport CSV zapisuje miesiąc odniesienia w nazwie pliku;
- nowy wydruk **Dziennik A4 1–70+** automatycznie wypełnia zatwierdzone aktywności;
- wydruk używa 35 wpisów na stronę i automatycznie tworzy kolejne strony powyżej 70 wpisów;
- ostatnia strona zawiera podsumowanie miesiąca oraz miejsce na uwagi rodzica, nauczyciela i plus/ocenę.

### Testy i PWA
- smoke test sprawdza wybór miesiąca i paginację raportu A4;
- podniesiono wersję cache service workera, aby urządzenia pobrały aktualne pliki aplikacji.

## 0.2.0 — Secure family roles

### Rodzina
- jeden rodzic może prowadzić wiele profili dzieci;
- jeden aktywny profil dziecka na urządzeniu;
- dane rodzeństwa są rozdzielone przez `childId`;
- zmiana aktywnego profilu wymaga odblokowanej strefy rodzica.

### Bezpieczeństwo lokalnego pilota
- strefa rodzica chroniona PIN-em 4–8 cyfr;
- PIN zapisywany jako PBKDF2-SHA256 z losową solą, a nie jako tekst jawny;
- automatyczna blokada po bezczynności z wyborem czasu;
- możliwość zmiany PIN-u po podaniu obecnego PIN-u;
- panel szkoły jest niedostępny dla dziecka i otwierany wyłącznie z odblokowanej strefy rodzica.

### Obieg wpisów
- dziecko może edytować wpis oczekujący;
- odrzucony wpis wraca do dziecka z powodem i może zostać wysłany ponownie;
- rodzic ma decyzje: zatwierdź / popraw i zatwierdź / odrzuć;
- historia decyzji jest zapisywana lokalnie;
- raporty, CSV, plusy i oceny są przypisane do konkretnego dziecka.

### Backend
- `003_family_roles.sql`: child accounts, pairing codes i append-only approval events;
- `004_family_rls.sql`: polityki RLS dla kont dziecka i relacji guardian–child;
- istniejący backend 0.1.3 pozostaje fail-closed i synchronizacja chmurowa nie włącza się automatycznie.

### Testy
- test izolacji dziecko/rodzic/szkoła;
- test wielu dzieci i braku wycieku danych rodzeństwa;
- test edycji dziecka, korekty/odrzucenia rodzica i historii;
- test migracji starych danych pilota;
- runner Chrome DevTools czeka na rzeczywisty PASS/FAIL.

## 0.1.3 — Backend foundation

### Backend
- publiczny health check: `/api/health`;
- publiczna deklaracja możliwości: `/api/capabilities`;
- konfiguracja środowiska w `.env.example`;
- migracja bazowa PostgreSQL;
- przygotowane polityki RLS dla wariantu Supabase;
- backend działa domyślnie w trybie **fail-closed**;
- cloud sync pozostaje wyłączony do czasu podłączenia bazy i autoryzacji.

### Bezpieczeństwo
- endpointy API mają `Cache-Control: no-store`;
- API nie ujawnia sekretów ani wartości zmiennych środowiskowych;
- CI sprawdza składnię oraz zachowanie podstawowych endpointów.


## 0.1.2 — Support & hardening

Aktualizacja stabilizująca publiczny pilot i ujednolicająca informacje o autorze.

### Nowe
- dobrowolne wsparcie „Postaw Naleśnikowi++ kawę” na stronie, w aplikacji i na podstronach;
- stały odnośnik do Zielonej Marki dla osób potrzebujących własnej strony lub prostego systemu;
- zachowany eksport CSV i FAQ z bieżącej wersji pilota.

### Poprawki
- blokada przyszłych dat przy zapisie aktywności;
- twarda walidacja czasu 1–600 minut;
- raporty ignorują wpisy z przyszłości;
- import kopii ma limit 2 MB i odrzuca wadliwe rekordy;
- dane odczytywane z localStorage przechodzą walidację;
- limity klas i zgłoszeń w lokalnym pilocie;
- blokada duplikatu dziecka dodawanego papierowo.

### Testy
- regresja importu uszkodzonej kopii;
- regresja przyszłych wpisów w raportach;
- dotychczasowe testy timera, CSV, akceptacji, klas, backupu i PWA pozostają aktywne.

## 0.1.1 — Pilot update

Aktualizacja przygotowująca Aktywnik+ do wygodniejszego testowania przez dziecko, rodzica i nauczyciela.

### Nowe
- eksport raportu do CSV dla nauczyciela;
- strona FAQ z odpowiedziami o instalacji, przeglądarce, PWA, offline, danych i raportach;
- Start/Stop aktywności dziecka z licznikiem czasu;
- timer przetrwa zminimalizowanie lub ponowne otwarcie PWA, ponieważ zapisuje moment rozpoczęcia;
- możliwość ręcznego wpisu pozostaje równolegle;
- sekcja „Gdzie działa Aktywnik+?”: przeglądarka, Android, iPhone/iPad, Windows, macOS, ChromeOS, Linux i wersja papierowa;
- dokładniejszy opis produktu;
- na kluczowych stronach wskazany jest twórca i właściciel projektu: Łukasz St‑cz;
- na kluczowych stronach dostępny jest link do repozytorium GitHub: https://github.com/lukaszst-cz/aktywnik-plus.

### Testy
- automatyczny test Start/Stop;
- test zachowania aktywnego timera po ponownym załadowaniu aplikacji;
- pełny lokalny smoke test PWA: service worker, cache, manifest, raporty i backup.


## 0.1.0 — Pilot

Pierwsza wersja przygotowana do pilota rodzinnego przed wdrożeniem backendu.

### Dziecko
- szybkie dodawanie aktywności;
- ulubione aktywności;
- czas, wysiłek i opcjonalna notatka;
- własne statystyki bez rankingów.

### Rodzic
- zatwierdzanie wpisów;
- raport miesięczny, kwartalny, półroczny i roczny;
- druk / zapis raportu jako PDF;
- eksport kopii danych do JSON;
- przywracanie kopii;
- możliwość usunięcia danych lokalnych;
- możliwość poproszenia przeglądarki o trwałą pamięć.

### Nauczyciel / szkoła
- lokalny prototyp klas;
- kod klasy jako demonstracja UX;
- tryb cyfrowy / hybrydowy / papierowy;
- plusy, oceny i uwagi według zasad nauczyciela;
- formularz papierowy;
- przygotowany model rodzinny, School SaaS i School Self-Hosted.

### PWA
- manifest;
- ikony 192 i 512;
- service worker i cache offline;
- instalacja z przeglądarki;
- osobna strona Pobierz / zainstaluj;
- instrukcje Android / iPhone / komputer.

### Prywatność
- dane pilota pozostają lokalnie na urządzeniu;
- brak GPS, masy ciała, kalorii i rankingów;
- publiczna strona prywatności pilota;
- dokumentacja ról, danych i modeli wdrożenia.

### Testy
- browser smoke test;
- automatyczny workflow GitHub Actions;
- lokalny pełny test PWA/service worker;
- CI sprawdza składnię, manifest, cache assets i scenariusz użytkownika.

### Jeszcze nie w 0.1.0
- prawdziwe konta;
- synchronizacja między telefonami;
- centralna klasa;
- backend;
- produkcyjna baza danych;
- automatyczna wymiana danych nauczyciel–rodzic.
