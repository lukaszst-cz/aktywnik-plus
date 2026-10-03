# Aktywnik+

Aktywnik+ to bezpłatna PWA do prostego mierzenia i zapisywania aktywności — dla siebie, rodziny oraz pilotażowo dla szkoły lub klubu.

**Twórca i właściciel projektu: Łukasz St‑cz.** Repozytorium: https://github.com/lukaszst-cz/aktywnik-plus

## Bezpłatny pilot uniwersalny

Aktywnik+ jest obecnie **bezpłatnym projektem w fazie pilotażowej**. Można używać go samodzielnie jako prostego trackera aktywności albo w trybie rodzinnym z oddzielną strefą rodzica.

Na tym etapie:
- nie ma opłat;
- dostępny jest tryb **Dla siebie** bez PIN-u rodzica i bez procesu zatwierdzania;
- dostępny jest tryb **Rodzina** z profilem dziecka, PIN-em i zatwierdzaniem wpisów;
- konto jest opcjonalne; tryb lokalny nadal działa bez logowania;
- dziecko korzysta z własnego, uproszczonego widoku;
- strefa rodzica jest chroniona lokalnym PIN-em i automatycznie się blokuje;
- jeden rodzic może prowadzić wiele profili dzieci;
- zmiana aktywnego profilu dziecka na urządzeniu wymaga odblokowanej strefy rodzica;
- nie potrzeba własnego serwera;
- dane nadal zapisują się lokalnie jako pierwsze;
- w 0.5 beta istnieje bezpieczny fundament Magic Link i synchronizacji trybu osobistego;
- rodzina może wybrać aplikację, tryb hybrydowy albo papier.

Przed formalnym wdrożeniem szkolnym należy przejść do wersji z backendem, kontami, uprawnieniami i uzgodnionym modelem ochrony danych.

## ☕ Dobrowolne wsparcie

Aktywnik+ pozostaje bezpłatny. Jeśli aplikacja jest przydatna, można dobrowolnie wesprzeć jej dalszy rozwój: [Buy Me a Coffee — nalesnik_plus_plus](https://buymeacoffee.com/nalesnik_plus_plus).

Wsparcie nie odblokowuje żadnych funkcji i nie jest wymagane do korzystania z aplikacji.

Jeśli potrzebujesz własnej strony internetowej lub prostego systemu dla firmy: https://zielona-marka.pl

Przeczytaj przed pilotażem:
- **[Start dla rodzica i nauczyciela](docs/START-DLA-RODZICA-I-NAUCZYCIELA.md)**
- **[Warunki krytyczne pilota](docs/WARUNKI-KRYTYCZNE-PILOTA.md)**
- **[Pilot w jednej klasie](docs/PILOT-JEDNEJ-KLASY.md)**
- **[Jak zainstalować PWA](docs/INSTALACJA-PWA.md)**
- **[Checklista gotowości pilota](docs/CHECKLISTA-PILOTA.md)**

## Wersja

**Aktywnik+ 0.5.0-beta.2 — Pull & Merge**

- [Release notes 0.5.0-beta.2](docs/RELEASE-0.5.0-beta.2.md)
- [Release notes 0.5.0-beta.1](docs/RELEASE-0.5.0-beta.1.md)
- [Release notes 0.4.0](docs/RELEASE-0.4.0.md)
- [Release notes 0.3.0](docs/RELEASE-0.3.0.md)

- [Release notes 0.2.1](docs/RELEASE-0.2.1.md)
- [Release notes 0.2.0](docs/RELEASE-0.2.0.md)
- [Zmiany 0.2.1](CHANGELOG.md#021--monthly-report-hardening)
- [Changelog](CHANGELOG.md)
- [Pobierz / zainstaluj](pobierz.html)
- [FAQ](faq.html)

## Co już działa

- szybki onboarding: **Dla siebie** albo **Rodzina**;
- tryb osobisty zapisujący aktywności od razu, bez rodzica;
- własna nazwa aktywności oraz dodatkowe aktywności dla starszych użytkowników;
- eksport CSV i kopia JSON również w trybie osobistym;
- panel dziecka z dużą listą aktywności;
- szybki podgląd tygodnia bez celów, rankingów i porównywania dzieci;
- przycisk „Powtórz ostatnią aktywność” wypełniający ostatni typ, czas i poziom wysiłku;
- widoczny status lokalnego zapisu i informacja o świeżości kopii danych w strefie rodzica;
- ulubione aktywności do szybkiego wyboru;
- wpis aktywności z datą, czasem, wysiłkiem i notatką;
- **Start/Stop aktywności** — pomiar czasu oparty na zapisanym czasie startu, działający także po zminimalizowaniu lub ponownym otwarciu PWA;
- wiele profili dzieci w jednej rodzinie, z osobnymi wpisami, statystykami i raportami;
- lokalna strefa rodzica chroniona PIN-em PBKDF2 + losową solą;
- automatyczna blokada strefy rodzica po bezczynności;
- dziecko może poprawić wpis oczekujący lub odrzucony, ale nie zatwierdzi własnego wpisu;
- rodzic może **zatwierdzić / poprawić i zatwierdzić / odrzucić z powodem**;
- lokalna historia decyzji rodzica i ponownych wysłań;
- raporty: miesięczny, kwartalny, półroczny i roczny;
- wybór konkretnego miesiąca odniesienia dla raportów rodzica;
- drukowany **Dziennik A4 1–70+** z automatycznym wypełnieniem zatwierdzonych wpisów i kolejnymi stronami co 35 wpisów;
- **Eksport CSV** zatwierdzonych wpisów dla nauczyciela;
- **Skan/import kart papierowych** — CSV/JSON/TXT lub wklejony OCR, z podglądem i poprawkami;
- przygotowana integracja **DocPilot → OCR → Aktywnik+**;
- statystyki wyłącznie dla danego dziecka;
- panel szkoły z wyborem trybu **cyfrowy / hybrydowy / papierowy**;
- konfiguracja akceptacji rodzica, poziomu wysiłku, plusów i zasad oceniania;
- historia plusów i ocen przyznanych przez nauczyciela;
- School Cloud: tworzenie profilu dziecka przez opiekuna, klasy, tokeny zaproszeń, zgłoszenia i decyzje szkoły;
- formularz papierowy dla rodzin, które nie chcą korzystać z aplikacji.

## Gdzie działa

- bez instalacji w nowoczesnej przeglądarce;
- Android — przeglądarka lub instalacja PWA;
- iPhone/iPad — przeglądarka lub web app dodana do ekranu początkowego;
- Windows, macOS, ChromeOS i Linux — przeglądarka, a w obsługiwanych przeglądarkach również instalacja PWA;
- papier / PDF — dla rodzin, które nie chcą korzystać cyfrowo.

Dostępność przycisku instalacji zależy od przeglądarki i systemu. Brak instalacji nie blokuje używania aplikacji.

## Jak to działa

- **[Instrukcja dla dziecka, rodzica i nauczyciela](docs/JAK-TO-DZIALA.md)**
- **[Konfiguracja szkoły i tryb papierowy](docs/KONFIGURACJA-SZKOLY.md)**
- **[Plusy i oceny](docs/PLUSY-I-OCENY.md)**
- **[Formularz papierowy](paper.html)**

Aktywnik+ nie narzuca szkolnego przelicznika plusów na oceny. Nauczyciel lub szkoła ustalają własne reguły, a aplikacja zapamiętuje przyznane plusy, oceny i uwagi.

Rodzic, który nie chce korzystać z aplikacji, może wybrać ścieżkę papierową. Dziecko nadal uczestniczy w tym samym programie aktywności i podlega tym samym zasadom ustalonym przez nauczyciela.

## Modele wdrożenia

Aktywnik+ jest przygotowany pod trzy warianty:

- **Rodzinny** — rodzic prowadzi profil dziecka niezależnie od szkoły;
- **Szkolny SaaS** — szkoła zarządza swoją przestrzenią danych, a Aktywnik+ dostarcza usługę techniczną;
- **School Self-Hosted** — szkoła lub organ prowadzący uruchamia własną instancję i własną bazę.

Dokumentacja:
- **[Modele wdrożenia](docs/MODELE-WDROZENIA.md)**
- **[Role i uprawnienia](docs/ROLE-I-UPRAWNIENIA.md)**
- **[Dane i prywatność](docs/DANE-I-PRYWATNOSC.md)**
- **[Architektura backendu](docs/ARCHITEKTURA-BACKENDU.md)**
- **[Klasy i dołączanie dzieci](docs/KLASY-I-DOLACZANIE.md)**
- **[Rodzina, urządzenia i synchronizacja](docs/FAMILY-SYNC.md)**

## Prywatność i podejście

- brak rankingów między dziećmi;
- brak śledzenia masy ciała, kalorii i wyglądu;
- dane demonstracyjne nie powinny zawierać prawdziwych danych dzieci;
- rodzic powinien móc eksportować i usuwać dane dziecka;
- cyfrowa i papierowa ścieżka mają być równoważne.

## Bezpieczeństwo danych pilota

Obecna PWA ma:
- eksport kopii lokalnych danych do pliku JSON;
- przywracanie kopii z pliku;
- możliwość poproszenia przeglądarki o trwałą pamięć;
- jasne oznaczenie funkcji klas jako **demo lokalne** do czasu uruchomienia backendu.

Przed czyszczeniem danych przeglądarki, zmianą telefonu lub ważnym raportem warto wykonać eksport kopii.

## Prototyp

Obecny prototyp zapisuje dane lokalnie w przeglądarce (`localStorage`). To pozwala testować interfejs bez zakładania konta i bez wysyłania danych na serwer.

Uruchom lokalnie:

```bash
python -m http.server 8080
```

Następnie otwórz `http://localhost:8080`.

## Logowanie bez tarcia

W 0.5 beta logowanie jest opcjonalne i realizowane przez Magic Link. Docelowy model:
- dziecko nie dostaje własnego e-maila ani klasycznego hasła;
- rodzic: preferowany passkey lub magic link;
- nauczyciel: konto szkoły / Google / Microsoft SSO albo magic link;
- konto jest wymagane tylko dla synchronizacji, klas między urządzeniami i kopii chmurowej;
- lokalny tryb bez konta pozostaje dostępny do zwykłego prowadzenia dziennika.

Szczegóły: [Logowanie bez tarcia](docs/LOGOWANIE-BEZ-TARCIA.md).

## Backend 0.5 Sync Foundation

Backendowy fundament jest już połączony z projektem Supabase:
- `/api/health` i `/api/capabilities`;
- `/api/v1/sync` — beta synchronizacji trybu osobistego;
- migracje `001–017`;
- wszystkie tabele publiczne mają RLS;
- osobna tabela `personal_activities` dla trybu **Dla siebie**;
- local-first sync queue po stronie PWA tylko dla trybu osobistego;
- synchronizacja usunięć w trybie osobistym przez tombstones;
- Magic Link i sesja konta;
- nowy model kluczy Supabase: publishable po stronie klienta, secret wyłącznie po stronie serwera.

Chmura nadal jest domyślnie wyłączona przez bezpieczniki `AKTYWNIK_CLOUD_SYNC` i `AKTYWNIK_RLS_VERIFIED`. Włączenie nastąpi dopiero po testach wielu kont, konfliktów offline i synchronizacji usunięć.

## Wersja produkcyjna

Docelowo: PWA + konta rodzic/dziecko + synchronizacja między urządzeniami + reguły dostępu po stronie backendu. Planowany stos: Next.js / TypeScript / Supabase. Powiadomienie końca dnia będzie korzystać z Web Push.

## Demo i pobieranie

- **wersja publiczna / PWA:** https://aktywnik-plus.vercel.app
- repozytorium: `https://github.com/lukaszst-cz/aktywnik-plus`
- wydania: `https://github.com/lukaszst-cz/aktywnik-plus/releases`

## Status

`0.5.0-beta.2 Pull & Merge` — tryb osobisty ma dwukierunkową synchronizację push/pull z regułą „nowszy timestamp wygrywa” oraz propagację usunięć przez tombstones. Brakujące wpisy z innego urządzenia są scalane lokalnie, a nowsza wersja lokalna nie jest nadpisywana. Tryb rodzinny pozostaje local-only dla aktywności; School Cloud potrafi już bezpiecznie utworzyć profil dziecka i dołączyć go do klasy. Local-first pozostaje zasadą.
