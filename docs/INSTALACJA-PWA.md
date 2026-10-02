# Instalacja Aktywnik+ jako PWA

Aktywnik+ jest projektowany jako PWA (Progressive Web App). Użytkownik otwiera aplikację z linku HTTPS, a następnie może dodać ją do urządzenia, aby uruchamiała się podobnie do zwykłej aplikacji.

## Android

1. Otwórz publiczny link Aktywnik+ w Chrome lub obsługiwanej przeglądarce.
2. W menu wybierz **Zainstaluj aplikację** / **Dodaj do ekranu głównego**, jeśli przeglądarka udostępnia tę opcję.
3. Potwierdź.
4. Ikona Aktywnik+ pojawi się na urządzeniu.

## iPhone / iPad

1. Otwórz stronę w Safari.
2. Użyj menu udostępniania.
3. Wybierz **Dodaj do ekranu początkowego**.
4. Potwierdź dodanie aplikacji webowej.

## Windows / macOS

W obsługiwanej przeglądarce po otwarciu aplikacji może pojawić się opcja instalacji. Po instalacji PWA otwiera się we własnym oknie.

## Czy trzeba pobierać aplikację ze sklepu?

Nie na etapie PWA. Do pilota wystarczy link HTTPS.

W przyszłości można przygotować również paczki/sklep, ale nie jest to konieczne do działania PWA.

## Ważne dla prototypu

Obecna wersja zapisuje dane lokalnie na urządzeniu. Nie ma jeszcze kont online ani synchronizacji pomiędzy telefonami.

## Źródło techniczne

MDN — Installing and uninstalling web apps:
https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing
