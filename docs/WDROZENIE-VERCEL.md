## Status: zakończone

- projekt Vercel: `aktywnik-plus`
- konto: `lukaszstaniewicz-6630`
- produkcja: https://aktywnik-plus.vercel.app
- repo GitHub połączone: `lukaszst-cz/aktywnik-plus`
- automatyczne deploye z `main`: aktywne
- Vercel Authentication dla produkcji: wyłączone

# Stałe wdrożenie Aktywnik+ na Vercel

## Cel

Publiczna, stała wersja Aktywnik+ działa pod adresem:

`https://aktywnik-plus.vercel.app`

Jeżeli ta nazwa jest zajęta, można użyć np.:
- `aktywnik-plus-pl.vercel.app`
- `aktywnikplus.vercel.app`

## Aktualny stan

Repozytorium jest przygotowane do statycznego hostingu Vercel:
- `vercel.json` ustawia nagłówki PWA i bezpieczeństwa;
- service worker działa z root scope;
- manifest PWA wskazuje `app.html`;
- ikony 192/512 są obecne;
- CI sprawdza składnię, manifest, cache i główny scenariusz użytkownika.

## Przejęcie tymczasowego deploymentu

Anonimowy deployment należy przypisać do konta Vercel. To jedyny krok, którego właściciel konta musi wykonać samodzielnie, ponieważ wymaga autoryzacji konta.

Po przejęciu:
1. nadaj projektowi nazwę `aktywnik-plus`;
2. podłącz repozytorium GitHub `lukaszst-cz/aktywnik-plus`;
3. ustaw branch produkcyjny na `main`;
4. Framework Preset: **Other**;
5. Build Command: puste;
6. Output Directory: puste / root repo;
7. Install Command: puste;
8. włącz automatyczne Production Deployments z `main`.

## Po podłączeniu GitHuba

Każdy zaakceptowany commit do `main` powinien automatycznie tworzyć nowy deployment Vercel.

Przed udostępnieniem linku rodzicom sprawdzić:
- strona główna;
- `app.html`;
- `pobierz.html`;
- `prywatnosc.html`;
- `o-projekcie.html`;
- `manifest.webmanifest`;
- `sw.js`;
- ikony PWA;
- Start/Stop;
- raport;
- backup/import;
- instalację PWA na telefonie.

## Domena własna — później

Nie jest wymagana do pilota. Jeśli projekt będzie rozwijany, można później podpiąć własną domenę, np. `aktywnik.pl` lub inną dostępną nazwę.

## Ważne

Stały hosting Vercel służy obecnie tylko frontendowi pilota. Nie jest to jeszcze backend ani centralna baza danych dzieci.
