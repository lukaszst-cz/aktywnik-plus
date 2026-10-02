# Aktywnik+

Aktywnik+ to prosty dziennik aktywności dziecka z szybkim wpisem na telefonie, akceptacją rodzica i raportami okresowymi.

## Bezpłatny pilot rodzicielski

Aktywnik+ jest obecnie **bezpłatnym projektem rodzicielskim w fazie pilotażowej**. Celem jest ułatwienie rodzinom dokumentowania dodatkowej aktywności dzieci i prostego przekazywania podsumowań nauczycielowi.

Na tym etapie:
- nie ma opłat;
- nie trzeba zakładać konta;
- nie potrzeba własnego serwera;
- dane prototypu pozostają lokalnie na urządzeniu;
- rodzina może wybrać aplikację, tryb hybrydowy albo papier.

Przed formalnym wdrożeniem szkolnym należy przejść do wersji z backendem, kontami, uprawnieniami i uzgodnionym modelem ochrony danych.

Przeczytaj przed pilotażem:
- **[Start dla rodzica i nauczyciela](docs/START-DLA-RODZICA-I-NAUCZYCIELA.md)**
- **[Warunki krytyczne pilota](docs/WARUNKI-KRYTYCZNE-PILOTA.md)**
- **[Pilot w jednej klasie](docs/PILOT-JEDNEJ-KLASY.md)**
- **[Jak zainstalować PWA](docs/INSTALACJA-PWA.md)**

## Co już działa

- panel dziecka z dużą listą aktywności;
- ulubione aktywności do szybkiego wyboru;
- wpis aktywności z datą, czasem, wysiłkiem i notatką;
- wieczorna lista wpisów do akceptacji przez rodzica;
- raporty: miesięczny, kwartalny, półroczny i roczny;
- statystyki wyłącznie dla danego dziecka;
- panel szkoły z wyborem trybu **cyfrowy / hybrydowy / papierowy**;
- konfiguracja akceptacji rodzica, poziomu wysiłku, plusów i zasad oceniania;
- historia plusów i ocen przyznanych przez nauczyciela;
- formularz papierowy dla rodzin, które nie chcą korzystać z aplikacji.

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

## Wersja produkcyjna

Docelowo: PWA + konta rodzic/dziecko + synchronizacja między urządzeniami + reguły dostępu po stronie backendu. Planowany stos: Next.js / TypeScript / Supabase. Powiadomienie końca dnia będzie korzystać z Web Push.

## Demo i pobieranie

- demo PWA: `https://lukaszst-cz.github.io/aktywnik-plus/`
- repozytorium: `https://github.com/lukaszst-cz/aktywnik-plus`
- wydania: `https://github.com/lukaszst-cz/aktywnik-plus/releases`

## Status

`0.1 prototype` — mobilny interfejs, lokalne dane, ulubione aktywności, akceptacja rodzica, raporty okresowe, konfiguracja szkoły, plusy/oceny i alternatywa papierowa.
