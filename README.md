# Aktywnik+

Aktywnik+ to bezpłatna PWA do prostego rejestrowania dodatkowej aktywności dzieci, akceptacji rodzica i raportów okresowych dla nauczyciela.

**Twórca i właściciel projektu: Łukasz St‑cz.** Repozytorium: https://github.com/lukaszst-cz/aktywnik-plus

## Bezpłatny pilot rodzicielski

Aktywnik+ jest obecnie **bezpłatnym projektem rodzicielskim w fazie pilotażowej**. Celem jest ułatwienie rodzinom dokumentowania dodatkowej aktywności dzieci i prostego przekazywania podsumowań nauczycielowi.

Na tym etapie:
- nie ma opłat;
- nie trzeba zakładać konta;
- nie potrzeba własnego serwera;
- dane prototypu pozostają lokalnie na urządzeniu;
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

**Aktywnik+ 0.2.0 — Family Roles Pilot**

- [Release notes 0.2.0](docs/RELEASE-0.2.0.md)
- [Changelog](CHANGELOG.md)
- [Pobierz / zainstaluj](pobierz.html)
- [FAQ](faq.html)

## Co już działa

- **strefa dziecka bez przełącznika do rodzica/szkoły**;
- **strefa rodzica chroniona PIN-em** z automatycznym blokowaniem po bezczynności;
- zmiana PIN-u rodzica oraz wybór czasu automatycznej blokady;
- **wiele profili dzieci pod jednym rodzicem**;
- wybór jednego aktywnego profilu dziecka na danym urządzeniu — zmiana wymaga strefy rodzica;
- panel dziecka z dużą listą aktywności;
- ulubione aktywności do szybkiego wyboru;
- wpis aktywności z datą, czasem, wysiłkiem i notatką;
- **Start/Stop aktywności** — pomiar czasu oparty na zapisanym czasie startu, działający także po zminimalizowaniu lub ponownym otwarciu PWA;
- dziecko może poprawić wpis oczekujący lub odrzucony i wysłać go ponownie;
- rodzic może **zatwierdzić / poprawić / odrzucić** wpis oraz podać powód odrzucenia;
- lokalna historia decyzji rodzica i zmian wpisu;
- możliwość ustawienia dla każdego dziecka: akceptacja rodzica wymagana albo automatyczne zatwierdzanie;
- raporty: miesięczny, kwartalny, półroczny i roczny;
- **Eksport CSV** zatwierdzonych wpisów dla nauczyciela;
- **Skan/import kart papierowych** — CSV/JSON/TXT lub tekst OCR z podglądem i poprawkami;
- przygotowany przepływ **DocPilot → OCR → Aktywnik+**;
- statystyki wyłącznie dla danego dziecka;
- panel szkoły z wyborem trybu **cyfrowy / hybrydowy / papierowy**;
- konfiguracja akceptacji rodzica, poziomu wysiłku, plusów i zasad oceniania;
- historia plusów i ocen przyznanych przez nauczyciela;
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

## Prywatność i podejście

- brak rankingów między dziećmi;
- brak śledzenia masy ciała, kalorii i wyglądu;
- dane demonstracyjne nie powinny zawierać prawdziwych danych dzieci;
- rodzic powinien móc eksportować i usuwać dane dziecka;
- cyfrowa i papierowa ścieżka mają być równoważne.

## Bezpieczeństwo danych pilota

Obecna PWA ma:
- lokalny PIN rodzica przechowywany jako skrót PBKDF2 z losową solą;
- automatyczne blokowanie strefy rodzica po bezczynności;
- izolację danych pomiędzy profilami dzieci w interfejsie;
- eksport kopii lokalnych danych do pliku JSON;
- przywracanie kopii z pliku;
- możliwość poproszenia przeglądarki o trwałą pamięć;
- jasne oznaczenie funkcji klas jako **demo lokalne** do czasu uruchomienia backendu.

Przed czyszczeniem danych przeglądarki, zmianą telefonu lub ważnym raportem warto wykonać eksport kopii.

**Ważne:** PIN w 0.2.0 jest zabezpieczeniem lokalnego pilota na jednym urządzeniu, a nie pełnym uwierzytelnianiem serwerowym. Osoba z technicznym dostępem do profilu przeglądarki nadal może odczytać lokalne dane. Pełne bezpieczeństwo między urządzeniami wymaga backendu, kont i RLS.

## Prototyp

Obecny prototyp zapisuje dane lokalnie w przeglądarce (`localStorage`). To pozwala testować interfejs bez zakładania konta i bez wysyłania danych na serwer.

Uruchom lokalnie:

```bash
python -m http.server 8080
```

Następnie otwórz `http://localhost:8080`.

## Dostęp bez tarcia

W pilocie 0.2.0 nie ma kont serwerowych, ale strefa rodzica wymaga lokalnego PIN-u. Dziecko nie potrzebuje e-maila ani klasycznego hasła.

W przyszłej wersji synchronizowanej:
- rodzic: preferowany passkey lub magic link;
- dziecko: jednorazowe parowanie kodem/QR bez własnego e-maila;
- nauczyciel: konto szkoły / Google / Microsoft SSO albo magic link;
- konto jest potrzebne dopiero do synchronizacji między urządzeniami, klas online i kopii chmurowej.

Szczegóły: [Logowanie bez tarcia](docs/LOGOWANIE-BEZ-TARCIA.md) oraz [Rodzina, urządzenia i synchronizacja](docs/FAMILY-SYNC.md).

## Wersja produkcyjna

Docelowo: PWA + osobne konta rodzic/dziecko + synchronizacja między urządzeniami + reguły dostępu po stronie backendu. Rodzic będzie mógł mieć wiele dzieci, wygenerować dla każdego jednorazowy kod lub QR do sparowania urządzenia dziecka, a dziecko zobaczy wyłącznie swój profil. Planowany stos: Next.js / TypeScript / Supabase z Row Level Security. Powiadomienie końca dnia będzie korzystać z Web Push.

Szczegóły: **[Rodzina, urządzenia i synchronizacja](docs/FAMILY-SYNC.md)**.

## Demo i pobieranie

- **wersja publiczna / PWA:** https://aktywnik-plus.vercel.app
- **instrukcja dla nauczyciela:** https://aktywnik-plus.vercel.app/dla-nauczyciela.html
- repozytorium: `https://github.com/lukaszst-cz/aktywnik-plus`
- wydania: `https://github.com/lukaszst-cz/aktywnik-plus/releases`

## Status

`0.2.0 Family Roles Pilot` — wersja do testu rodzinnego z rozdzieleniem dziecko/rodzic, wieloma profilami dzieci i PIN-em rodzica. Dane nadal pozostają lokalnie; prawdziwe konta i synchronizacja między urządzeniami wymagają backendu.
