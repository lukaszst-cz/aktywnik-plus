# Aktywnik+

Aktywnik+ to prosty dziennik aktywności dziecka z szybkim wpisem na telefonie, akceptacją rodzica i raportami okresowymi.

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

## Prywatność i podejście

- brak rankingów między dziećmi;
- brak śledzenia masy ciała, kalorii i wyglądu;
- dane demonstracyjne nie powinny zawierać prawdziwych danych dzieci;
- rodzic powinien móc eksportować i usuwać dane dziecka;
- cyfrowa i papierowa ścieżka mają być równoważne.

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
