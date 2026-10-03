# Zarządzanie danymi i prywatność

Ten dokument opisuje docelowy model produktu. Nie zastępuje analizy prawnej konkretnej szkoły ani ustaleń z jej IOD.

## Szkolny SaaS

W szkolnym wdrożeniu szkoła zarządza swoją przestrzenią danych i określa szkolne zasady korzystania z systemu.

Aktywnik+ jako dostawca techniczny:
- przechowuje dane zgodnie z konfiguracją i umową;
- zapewnia izolację szkół;
- realizuje kopie bezpieczeństwa;
- prowadzi techniczny audyt;
- nie wykorzystuje danych uczniów do reklam, profilowania ani budowania rankingów;
- nie uzyskuje zwykłego dostępu do treści uczniów.

Relacja szkoła–dostawca powinna zostać formalnie uregulowana przed wdrożeniem produkcyjnym.

## Minimalizacja danych

Domyślnie potrzebujemy tylko:
- technicznego identyfikatora użytkownika;
- nazwy wyświetlanej dziecka lub identyfikatora przyjętego przez szkołę;
- przypisania do klasy;
- wpisów aktywności;
- potwierdzeń rodzica;
- raportów;
- plusów, ocen i uwag, jeśli szkoła używa tych funkcji.

Nie wymagamy:
- adresu zamieszkania;
- dokładnej lokalizacji GPS;
- daty urodzenia, jeśli nie jest potrzebna;
- masy ciała;
- kalorii ani szacowanego spalania kalorii jako danych profilu lub wpisu;
- zdjęcia twarzy;
- danych zdrowotnych.

## Rodzina z wieloma dziećmi

Rodzic może prowadzić wiele profili dzieci. Każdy wpis, raport, nagroda i historia akceptacji są przypisane technicznym `child_id`.

W produkcji relacja `guardians` ogranicza dostęp: rodzic widzi tylko dzieci, z którymi ma aktywne powiązanie. Konto dziecka poprzez `child_accounts` widzi tylko swój profil. Rodzeństwo nie dzieli uprawnień.

Jednorazowe kody/QR do parowania nie zawierają danych dziecka i są przechowywane wyłącznie jako skrót tokenu z krótkim terminem ważności.

## Izolacja szkół

Każdy rekord szkolny ma `tenant_id`.

Zapytanie użytkownika szkolnego jest dozwolone wyłącznie, gdy:
1. użytkownik ma aktywne członkostwo w danym tenant;
2. jego rola pozwala na daną operację;
3. w przypadku nauczyciela — jest przypisany do odpowiedniej klasy.

Reguły muszą być egzekwowane po stronie bazy/backendu, a nie tylko interfejsu.

## Retencja

Retencja jest konfigurowana przez szkołę.

Przykładowy cykl:
- aktywna klasa — dane dostępne bieżąco;
- zakończenie roku — klasa przechodzi do archiwum;
- po okresie ustalonym przez szkołę — eksport lub usunięcie;
- logi techniczne mają osobny, krótszy okres przechowywania.

Aktywnik+ nie powinien przechowywać danych uczniów „na zawsze” bez powodu.

Technicznie wdrożony jest prywatny mechanizm `app_private.prune_audit_events(cutoff, dry_run)`:
- domyślnie działa jako `dry_run=true`;
- zwykły użytkownik `authenticated` ani `anon` nie może go uruchomić;
- wykonanie jest zarezerwowane dla kontrolowanej ścieżki serwisowej (`service_role`);
- aplikacja nie ustawia automatycznie żadnego okresu retencji ani harmonogramu.

Konkretny cutoff, częstotliwość i procedura zatwierdzenia pozostają decyzją szkoły/IOD i powinny wynikać z przyjętej polityki retencji.

## Eksport i usunięcie

Administrator szkoły powinien móc:
- wyeksportować dane szkoły;
- wyeksportować dane konkretnego dziecka;
- zarchiwizować rok szkolny;
- uruchomić usunięcie zgodnie z polityką szkoły;
- zobaczyć status operacji.

W trybie rodzinnym analogiczne uprawnienia ma rodzic.

W PWA polecenie usunięcia wszystkich danych lokalnych czyści stan aplikacji, szkice, lokalne kolejki synchronizacji i tombstones, znacznik ostatniego sync, lokalną sesję konta oraz stan sesji/PIN-u rodzica. Preferencja języka nie jest traktowana jako dane użytkownika i pozostaje na urządzeniu. Przy przywracaniu kopii czyszczony jest wyłącznie stan przejściowy sync/PIN, natomiast zalogowanie konta może pozostać aktywne.

Neutralny wskaźnik „obciążenie wysiłkiem: lekkie / umiarkowane / wysokie” jest wyliczany wyłącznie w chronionej strefie rodzica na podstawie czasu i skali zmęczenia 1–5. Nie jest zapisywany w rekordzie aktywności, nie trafia do Supabase, School Cloud, CSV ani raportów nauczyciela.

Personal sync stosuje minimalizację danych: kolejka synchronizacji nie przechowuje całego lokalnego `state`. Do outboxa trafiają wyłącznie `schemaVersion`, `profileMode='self'` oraz pola wpisów wymagane przez backend (`id`, data, aktywność, minuty, zmęczenie 1–5, uwaga, źródło i timestampy). Dane rodzica/PIN, profile dzieci, klasy, ustawienia szkoły, nagrody i inne lokalne pola nie są częścią payloadu personal sync. Starszy pełny outbox jest automatycznie przepisywany do minimalnej postaci.

## Audyt

Rejestrujemy działania administracyjne:
- utworzenie/usunięcie klasy;
- przypisanie nauczyciela;
- zaakceptowanie dziecka;
- zmianę konfiguracji;
- przyznanie lub zmianę plusa/oceny;
- eksport;
- usunięcie;
- wyjątkowy dostęp serwisowy.

Audyt zapisuje identyfikator wykonującego, czas, typ operacji i zasób. Nie powinien kopiować całej treści aktywności do logu.

Migracja 019 rozszerza automatyczny School audit na:
- szkolne aktywności;
- raporty;
- plusy/oceny/uwagi;
- przypisanie dziecka do klasy;
- przypisanie nauczyciela;
- zmiany klasy;
- membership użytkownika w tenant/szkole;
- dostęp serwisowy.

Audyt działa triggerami PostgreSQL i zapisuje tylko metadane operacji, a nie kopię całego rekordu.

## Dostęp serwisowy „break glass”

Administrator techniczny nie ma stałego wglądu w dane uczniów.

Jeżeli diagnoza awarii wymaga dostępu:
1. dostęp jest uruchamiany świadomie;
2. podawany jest powód;
3. ma określony czas wygaśnięcia;
4. każde użycie jest logowane;
5. po zakończeniu dostęp jest automatycznie cofany.

## Bezpieczeństwo

Docelowo:
- TLS dla transmisji;
- szyfrowanie danych i kopii zapasowych po stronie infrastruktury;
- MFA co najmniej dla administratorów i nauczycieli;
- sesje z wygasaniem;
- polityka haseł lub logowanie bezhasłowe;
- rate limiting;
- kopie zapasowe z testem odtwarzania;
- monitoring zdarzeń bezpieczeństwa;
- oddzielne sekrety dla środowisk dev/test/prod.

## DPIA / ocena ryzyka

Przed produkcyjnym wdrożeniem szkolnym należy wykonać co najmniej formalny screening DPIA. Jeżeli analiza wskaże wysokie ryzyko, szkoła jako administrator wykonuje ocenę skutków przed rozpoczęciem przetwarzania.

## Zdjęcie karty / OCR lokalny

Bezpośredni OCR zdjęcia jest funkcją progresywną: działa tylko w przeglądarkach udostępniających lokalny `TextDetector` i `createImageBitmap`. Aktywnik+ nie pobiera silnika OCR z zewnętrznego CDN i nie wysyła zdjęcia do zewnętrznego API.

Dla pliku obrazu obowiązuje:
- JPG/PNG/WebP, maks. 12 MB;
- plik pozostaje wyłącznie w pamięci bieżącej strony;
- obraz nie trafia do `state`, kopii JSON, personal sync, family sync ani School Cloud;
- po OCR do formularza trafia wyłącznie rozpoznany tekst;
- przed zapisem zawsze jest podgląd i możliwość korekty;
- jeśli przeglądarka nie wspiera lokalnego OCR, pozostaje ścieżka DocPilot / CSV / JSON / TXT / ręczne wklejenie OCR.

## Tryb papierowy

Rodzic może pozostać przy papierowym dzienniku, jeśli szkoła dopuszcza taki wariant. Dziecko nie powinno być przez to gorzej traktowane. Dane papierowe nie muszą być przepisywane do systemu poza informacjami potrzebnymi nauczycielowi, np. statusem raportu, plusem lub oceną.


## Oficjalne punkty odniesienia

- UODO — administrator danych w placówce oświatowej: https://uodo.gov.pl/pl/file/1388
- RODO, art. 28 — podmiot przetwarzający i umowa powierzenia: https://eur-lex.europa.eu/eli/reg/2016/679
- UODO — ocena skutków dla ochrony danych (DPIA): https://uodo.gov.pl/pl/598/3617

Przed wdrożeniem produkcyjnym szkoła powinna uzgodnić model z dyrektorem i IOD oraz dobrać podstawę prawną i okresy retencji do konkretnego sposobu używania systemu.
