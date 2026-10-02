# Aktywnik+

Aktywnik+ to prosty dziennik aktywności dziecka z szybkim wpisem na telefonie, akceptacją rodzica i raportami okresowymi.

## Założenia

- dziecko dodaje aktywność w kilku kliknięciach;
- ulubione aktywności są zawsze na górze i można je dowolnie dopasować;
- pełna lista obejmuje sport, ruch codzienny, zabawę i aktywności rodzinne;
- wpis dziecka trafia do kolejki `do zatwierdzenia`;
- rodzic dostaje jedną listę do akceptacji na koniec dnia;
- raporty: miesięczny, kwartalny, półroczny i roczny;
- statystyki dotyczą wyłącznie własnej historii dziecka — bez rankingów między dziećmi;
- raport zawiera miejsce na uwagi rodzica oraz nauczyciela / wychowawcy;
- aplikacja zapamiętuje plusy i oceny przyznane przez nauczyciela;
- zasady przeliczania plusów na oceny ustala nauczyciel lub szkoła;
- aplikacja nie śledzi masy ciała, kalorii ani wyglądu dziecka.

## Jak to działa

Prosty schemat dla dziecka, rodzica i nauczyciela jest tutaj:

**[Jak działa Aktywnik+ — rodzice i nauczyciele](docs/JAK-TO-DZIALA.md)**

Aktywnik+ nie narzuca szkolnego przelicznika plusów na oceny. Nauczyciel może przyznawać plusy i oceny według własnych zasad, a aplikacja przechowuje ich historię przy profilu dziecka.

## Prototyp

Pierwsza wersja działa bez backendu. Dane są zapisywane lokalnie w przeglądarce (`localStorage`), dzięki czemu można od razu przetestować interfejs i przepływ.

Uruchom lokalnie:

```bash
python -m http.server 8080
```

Następnie otwórz `http://localhost:8080`.

## Kierunek wersji produkcyjnej

Docelowo: PWA + konto rodzica + profil dziecka + synchronizacja i reguły dostępu po stronie backendu. Planowany stos: Next.js / TypeScript / Supabase. Powiadomienie końca dnia powinno w wersji produkcyjnej korzystać z Web Push, aby działało także wtedy, gdy aplikacja nie jest otwarta.

## Prywatność

Repozytorium nie powinno zawierać prawdziwych danych dzieci. Wersje demonstracyjne korzystają wyłącznie z danych testowych. Rodzic powinien mieć możliwość eksportu i usunięcia danych dziecka.

## Demo i pobieranie

Po publikacji repozytorium:

- demo PWA: `https://lukaszst-cz.github.io/aktywnik-plus/`
- repozytorium: `https://github.com/lukaszst-cz/aktywnik-plus`
- gotowe paczki: `https://github.com/lukaszst-cz/aktywnik-plus/releases`

Projekt jest przygotowany tak, aby można było wysłać jeden publiczny link jako przykład własnej pracy i jednocześnie pozwolić innym rodzicom przetestować aplikację.

## Status

`0.1 prototype` — działający interfejs PWA, lokalne dane, ulubione aktywności, kolejka akceptacji rodzica oraz raporty okresowe. Następny etap to konta i synchronizacja między urządzeniami.
